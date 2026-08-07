import { DM_TOOLS, type DmContext, type DmReply, type DmToolName } from "./index.js";
import { runDmTool } from "./tools.js";

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const DM_MODEL = process.env.DM_MODEL ?? "deepseek-v4-flash";
const MAX_TOOL_ROUNDS = 8;

type ApiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};

const SYSTEM_PROMPT = `You are the Dungeon Master of a D&D 5.2.1 game (SRD rules).

The rules engine is authoritative: you must never invent or override rules, HP, AC,
initiative, or campaign state. Use the provided tools to read game state and rules
before adjudicating, and to update world state after adjudication. Narrate vividly
in the language the players use, resolve actions through the tools, keep the story
moving, and hand agency back to the players. When combat is active, respect the
initiative order: describe whose turn it is and what they can do.`;

export async function deepseekNarrate(
  context: DmContext,
  userMessage: string,
): Promise<DmReply> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");

  const messages: ApiMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...context.recentMessages.slice(-20).map((m): ApiMessage => ({
      role: m.role === "dm" ? "assistant" : "user",
      content: `${m.senderName}: ${m.content}`,
    })),
    { role: "user", content: userMessage },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callDeepSeek(messages);
    const toolCalls = response.tool_calls ?? [];

    if (toolCalls.length === 0) {
      const narration = response.content ?? "(no response)";
      return { narration, toolCalls: mapToolCalls(toolCalls) };
    }

    messages.push({
      role: "assistant",
      content: response.content ?? "",
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      let args: unknown;
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      const result = await runDmTool(
        context.campaignId,
        "dm",
        call.function.name as DmToolName,
        args,
      );
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    narration:
      "(DM) The story bends under the weight of too many machinations — the tools have been consulted, but the scene is still unfolding. Try asking again.",
  };
}

async function callDeepSeek(messages: ApiMessage[]): Promise<{
  content: string | null;
  tool_calls: NonNullable<ApiMessage["tool_calls"]>;
}> {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DM_MODEL,
      messages,
      tools: DM_TOOLS.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${body.slice(0, 500)}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: ApiMessage }[];
  };
  const message = json.choices?.[0]?.message;
  return {
    content: message?.content ?? null,
    tool_calls: message?.tool_calls ?? [],
  };
}

function mapToolCalls(toolCalls: NonNullable<ApiMessage["tool_calls"]>) {
  return toolCalls.map((t) => ({
    name: t.function.name as DmToolName,
    arguments: JSON.parse(t.function.arguments || "{}") as Record<string, unknown>,
  }));
}
