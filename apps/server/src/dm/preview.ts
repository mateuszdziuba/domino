import type { DmContext, DmReply, DmToolName } from "./types.js";
import { runDmTool } from "./tools.js";
import { currentTurnCombatant } from "../rules/combat.js";

const COMBAT_TRIGGERS = [
  "attack",
  "fight",
  "ambush",
  "charge",
  "battle",
  "combat",
  "strike",
  "swing",
  "slash",
  "stab",
  "shoot",
  "smash",
  "cleave",
  "punch",
  "lunge",
  "hit",
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

  if (context.state.combat.active) {
    if (/^(end turn|next|advance|continue)$/i.test(userMessage.trim())) {
      const result = await runDmTool(context.campaignId, "dm", "advance_turn", {});
      return {
        narration: result.ok ? result.message : `(DM preview) ${result.message}`,
      };
    }

    if (shouldAutoGenerateCombat(userMessage)) {
      const current = currentTurnCombatant(context.state);
      if (current) {
        let toolName: DmToolName = "attack_combatant";
        let args: Record<string, unknown>;
        if (current.isPlayer) {
          if (current.status === "downed") {
            toolName = "resolve_death_save";
            args = { combatantId: current.id };
          } else {
            const target = context.state.combat.combatants.find(
              (c) => !c.isPlayer && c.currentHp > 0,
            );
            if (!target) {
              const ended = await runDmTool(context.campaignId, "dm", "end_combat", {});
              return {
                narration: ended.ok ? ended.message : "Victory! The enemies are defeated.",
              };
            }
            args = { attackerId: current.id, targetId: target.id };
          }
        } else {
          if (current.status === "downed") {
            toolName = "resolve_death_save";
            args = { combatantId: current.id };
          } else {
            const target = context.state.combat.combatants.find(
              (c) => c.isPlayer && c.currentHp > 0,
            );
            if (!target) {
              const ended = await runDmTool(context.campaignId, "dm", "end_combat", {});
              return {
                narration: ended.ok ? ended.message : "The party has been defeated.",
              };
            }
            args = { attackerId: current.id, targetId: target.id };
          }
        }
        const result = await runDmTool(context.campaignId, "dm", toolName, args);
        if (!result.ok) {
          return { narration: `(DM preview) ${result.message}` };
        }
        const advance = await runDmTool(context.campaignId, "dm", "advance_turn", {});
        const advanceMsg = advance.ok ? advance.message : "The turn passes.";
        return { narration: `${result.message} ${advanceMsg}` };
      }
    }

    return {
      narration: `(DM preview) Combat is underway — describe an attack or say "end turn".`,
    };
  }

  return {
    narration: `(DM preview) You say: "${userMessage}". The rules engine is authoritative; the AI narrator will be connected later.`,
  };
}
