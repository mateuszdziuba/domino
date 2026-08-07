import { DM_TOOLS, type DmContext, type DmReply, type DmToolName } from "./types.js";
import { runDmTool } from "./tools.js";

export type DmProvider = "deepseek" | "groq" | "ollama" | "openrouter";

type ProviderConfig = {
  baseUrl: string;
  apiKeyEnv: string | null;
  defaultModel: string;
};

const PROVIDER_CONFIG: Record<DmProvider, ProviderConfig> = {
  deepseek: {
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-v4-flash",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    defaultModel: "llama-3.3-70b-versatile",
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    apiKeyEnv: null,
    defaultModel: "qwen3:8b",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    defaultModel: "deepseek/deepseek-v4-flash:free",
  },
};

export function dmProvider(): DmProvider {
  const provider = (process.env.DM_PROVIDER ?? "deepseek").toLowerCase();
  return provider in PROVIDER_CONFIG ? (provider as DmProvider) : "deepseek";
}

export function providerConfig(): ProviderConfig {
  return PROVIDER_CONFIG[dmProvider()];
}

export function isDmConfigured(): boolean {
  const config = providerConfig();
  if (config.apiKeyEnv === null) return true; // local providers (ollama) need no key
  return Boolean(process.env[config.apiKeyEnv]);
}

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

NARRATE IN POLISH (pl-PL). The players are Polish — all narration, questions, and descriptions must be written in Polish, vividly and naturally. Spell names and mechanical terms may stay in English.

Never use Markdown or any markup: no asterisks (** or *), no backticks, no # headings, no bullet symbols. Write plain text only.

The rules engine is authoritative: you must never invent or override rules, HP, AC,
initiative, or campaign state. Use the provided tools to read game state and rules
before adjudicating, and to update world state after adjudication. Narrate vividly
in the language the players use, resolve actions through the tools, keep the story
moving, and hand agency back to the players. When combat is active, respect the
initiative order: describe whose turn it is and what they can do.

Only you decide when combat begins. When the story calls for it (the party walks
into an ambush, picks a fight, or danger rears its head), call generate_encounter
with a short description of the threat — the engine picks the monsters from the
SRD catalog, never make them up. Never ask the players to start encounters or
add enemies; they only describe what their characters do.

When combat is active you run the fight through the rules engine: resolve attacks
with attack_combatant (the attacker must be the current combatant — the engine
enforces this), roll death saves with resolve_death_save for combatants at 0 HP,
advance the initiative with advance_turn once a combatant's actions are done, and
end combat with end_combat when it concludes. Never invent dice rolls, damage, or
HP changes — the tools return authoritative results and you narrate those results
dramatically. When a player declares an attack or combat action on their turn,
resolve it with the tools instead of describing a vague outcome. When a player
declares an attack, call attack_combatant with the player's combatant id (which
starts with "char-") as the attacker. When the party is safe and wants to
recover, call take_long_rest so every character regains full HP per the
long-rest rules. When a player declares a spell, resolve it with cast_spell
(character id, exact spell name from the tool list, and the target combatant id
in combat or character id outside combat) instead of inventing the outcome. XP for defeated enemies is awarded automatically when combat ends; use award_xp for quest rewards, never for combat.

NEVER reveal a creature's numeric hit points (current HP or HP totals). Describe the enemy's condition in words instead: e.g. 'ranny', 'ciężko ranny', 'ledwo trzyma się na nogach', 'dopiero co zraniony'. Player characters' own HP may be described normally.

Cadence rules — follow them strictly:
- Call at most ONE tool per reply, then narrate the result dramatically and STOP. Never chain multiple tool calls in a single reply.
- After starting an encounter (generate_encounter), describe the scene and whose turn it is — then stop and wait for the players. Do NOT attack, advance, or end combat on your own initiative; the players drive the fight.
- Never resolve more than one attack, save, or spell per reply. After resolving an action for the current combatant, narrate the outcome and tell the players it is their turn; do not advance the turn yourself unless a player's turn is clearly complete.
- Read tools (get_campaign_state, get_character, get_available_actions, request_dice_roll) count toward the limit too — prefer narrating from the context you already have.`;

export async function llmNarrate(
  context: DmContext,
  userMessage: string,
): Promise<DmReply> {
  const config = providerConfig();
  const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined;
  if (config.apiKeyEnv && !apiKey) {
    throw new Error(`${config.apiKeyEnv} is not set for provider ${dmProvider()}`);
  }
  const model = process.env.DM_MODEL ?? config.defaultModel;

  const messages: ApiMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...context.recentMessages.slice(-20).map((m): ApiMessage => ({
      role: m.role === "dm" ? "assistant" : "user",
      content: `${m.senderName}: ${m.content}`,
    })),
    { role: "user", content: userMessage },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callLlm(config.baseUrl, model, apiKey, messages);
    const toolCalls = response.tool_calls ?? [];

    if (toolCalls.length === 0) {
      const narration = stripMarkdown(response.content ?? "(no response)");
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

async function callLlm(
  baseUrl: string,
  model: string,
  apiKey: string | undefined,
  messages: ApiMessage[],
): Promise<{
  content: string | null;
  tool_calls: NonNullable<ApiMessage["tool_calls"]>;
}> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      tools: DM_TOOLS.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: "object",
            properties: t.parameters,
          },
        },
      })),
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error ${response.status}: ${body.slice(0, 500)}`);
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

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .trim();
}

function mapToolCalls(toolCalls: NonNullable<ApiMessage["tool_calls"]>) {
  return toolCalls.map((t) => ({
    name: t.function.name as DmToolName,
    arguments: JSON.parse(t.function.arguments || "{}") as Record<string, unknown>,
  }));
}
