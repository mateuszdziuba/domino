import { afterEach, describe, expect, it, vi } from "vitest";
import { llmNarrate } from "./llm.js";
import type { DmContext } from "./types.js";
import type { CampaignState } from "@domino/shared";

const context: DmContext = {
  campaignId: "c1",
  characters: [],
  state: { phase: "exploration", location: "Tavern", scene: "Intro", worldProgress: [], combat: { active: false, combatants: [], turnIndex: 0, round: 1 }, notes: "", updatedAt: "" } as CampaignState,
  recentMessages: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.DM_PROVIDER;
});

describe("llmNarrate", () => {
  it("returns narration when the model makes no tool calls", async () => {
    process.env.DM_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: "The tavern is quiet." } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const reply = await llmNarrate(context, "I order a drink");
    expect(reply.narration).toBe("The tavern is quiet.");
    expect(reply.toolCalls).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("executes tool calls and loops until a final narration", async () => {
    process.env.DM_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "test-key";
    const calls = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        calls();
        if (calls.mock.calls.length === 1) {
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: "",
                    tool_calls: [
                      {
                        id: "call_1",
                        type: "function",
                        function: { name: "request_dice_roll", arguments: JSON.stringify({ notation: "2d6" }) },
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ choices: [{ message: { content: "The dice show your fate." } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    const reply = await llmNarrate(context, "I roll for insight");
    expect(calls).toHaveBeenCalledTimes(2);
    expect(reply.narration).toBe("The dice show your fate.");
    const callsMock = fetch as ReturnType<typeof vi.fn>;
    const lastBody = JSON.parse(callsMock.mock.calls.at(-1)![1].body) as {
      messages: { role: string; tool_call_id?: string }[];
    };
    expect(lastBody.messages.some((m) => m.role === "tool")).toBe(true);
  });

  it("uses the groq base url and model by default", async () => {
    process.env.DM_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "groq-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }),
      ),
    );
    await llmNarrate(context, "hi");
    const callsMock = fetch as ReturnType<typeof vi.fn>;
    const [url, init] = callsMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    const body = JSON.parse(String(init.body)) as { model: string };
    expect(body.model).toBe("llama-3.3-70b-versatile");
  });

  it("calls a local ollama endpoint without any api key", async () => {
    process.env.DM_PROVIDER = "ollama";
    process.env.DM_MODEL = "qwen3:8b";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: "local" } }] }), { status: 200 }),
      ),
    );
    const reply = await llmNarrate(context, "hi");
    expect(reply.narration).toBe("local");
    const callsMock = fetch as ReturnType<typeof vi.fn>;
    const [url] = callsMock.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
  });

  it("throws when the provider requires a key that is missing", async () => {
    process.env.DM_PROVIDER = "openrouter";
    await expect(llmNarrate(context, "hi")).rejects.toThrow("OPENROUTER_API_KEY");
  });
});
