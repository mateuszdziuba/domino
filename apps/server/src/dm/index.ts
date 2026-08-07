import type { DmContext, DmReply } from "./types.js";

export * from "./types.js";
export { isDmConfigured, dmProvider, providerConfig } from "./llm.js";

/**
 * Narrate a player message. Uses an OpenAI-compatible LLM provider (DeepSeek,
 * Groq, OpenRouter, or local Ollama — see `DM_PROVIDER` env) with tool calls
 * against the rules engine when the provider is configured; otherwise falls
 * back to a canned preview reply so the game loop works without AI.
 */
export async function dmNarrate(context: DmContext, userMessage: string): Promise<DmReply> {
  const { isDmConfigured, llmNarrate } = await import("./llm.js");
  if (isDmConfigured()) {
    return llmNarrate(context, userMessage);
  }
  const { previewNarrate } = await import("./preview.js");
  return previewNarrate(context, userMessage);
}
