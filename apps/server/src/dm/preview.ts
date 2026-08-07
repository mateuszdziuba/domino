import type { DmContext, DmReply } from "./types.js";
import { runDmTool } from "./tools.js";

const COMBAT_TRIGGERS = [
  "attack",
  "fight",
  "ambush",
  "charge",
  "battle",
  "combat",
  "strike",
  "swing",
  "kill",
  "draw my",
  "unsheathe",
  "ready my weapon",
  "clash",
  "raiders",
  "monsters",
  "goblins",
  "orc",
  "undead",
  "bandit",
];

export function shouldAutoGenerateCombat(message: string): boolean {
  const text = message.toLowerCase();
  return COMBAT_TRIGGERS.some((trigger) => text.includes(trigger));
}

/**
 * Preview-mode narrator: no LLM key configured. When the player's message
 * carries clear combat intent and no combat is running, the "DM" starts an
 * encounter through the same `generate_encounter` tool the AI uses — the
 * engine picks the monsters, never the player.
 */
export async function previewNarrate(
  context: DmContext,
  userMessage: string,
): Promise<DmReply> {
  if (!context.state.combat.active && shouldAutoGenerateCombat(userMessage)) {
    const result = await runDmTool(context.campaignId, "dm", "generate_encounter", {
      description: userMessage.slice(0, 300),
    });
    if (!result.ok) {
      return {
        narration: `(DM preview) ${result.message}`,
      };
    }
    const combatants = (result.data as { combat?: { combatants?: { name: string }[] } })
      ?.combat?.combatants;
    const partyNames = new Set(context.characters.map((c) => c.name));
    const hostiles = (combatants ?? [])
      .map((c) => c.name)
      .filter((name) => !partyNames.has(name));
    return {
      narration:
        hostiles.length > 0
          ? `Combat begins! ${hostiles.join(", ")} bar your way — initiative is rolled, steel is drawn.`
          : "Combat begins! Initiative is rolled.",
    };
  }
  return {
    narration: `(DM preview) You say: "${userMessage}". The rules engine is authoritative; the AI narrator will be connected later.`,
  };
}
