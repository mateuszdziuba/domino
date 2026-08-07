import type { DmContext, DmReply, DmToolName } from "./types.js";
import { runDmTool } from "./tools.js";
import { currentTurnCombatant } from "../rules/combat.js";
import { SPELLS } from "../rules/spells.js";

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

const REST_TRIGGER =
  /^(i|we|the party) (need to |want to |should )?(take a |long )?(rest|sleep)|^let'?s (take a |long )?(rest|sleep)|^(we )?(make )?camp|^camp$/i;

const TARGET_PATTERN = /(?:on|at|against|towards?)\s+([a-z' -]+)/i;

function findKnownSpell(message: string): string | null {
  const text = message.toLowerCase();
  for (const name of Object.keys(SPELLS)) {
    if (text.includes(name.toLowerCase())) return name;
  }
  return null;
}

function normalizeTargetName(name: string): string {
  return name.trim().replace(/^(the|a|an)\s+/i, "").trim();
}

async function tryCastSpell(
  context: DmContext,
  userMessage: string,
): Promise<DmReply | null> {
  const trimmed = userMessage.trim();
  if (!/cast/i.test(trimmed)) return null;
  const spellName = findKnownSpell(trimmed);
  if (!spellName) return null;

  const targetMatch = TARGET_PATTERN.exec(trimmed);
  if (!targetMatch?.[1]) {
    return { narration: `(DM preview) "Cast on whom?"` };
  }
  const targetName = normalizeTargetName(targetMatch[1]);

  let characterId: string;
  if (context.state.combat.active) {
    const current = currentTurnCombatant(context.state);
    if (!current?.isPlayer || !current.characterId) {
      return { narration: `(DM preview) It is not your turn.` };
    }
    characterId = current.characterId;
  } else {
    if (context.characters.length !== 1) {
      return { narration: `(DM preview) Which character casts?` };
    }
    characterId = context.characters[0]!.id;
  }

  let targetId: string;
  if (context.state.combat.active) {
    const combatant =
      context.state.combat.combatants.find(
        (c) => c.name.toLowerCase() === targetName.toLowerCase(),
      ) ??
      context.state.combat.combatants.find((c) => {
        const name = c.name.toLowerCase();
        const target = targetName.toLowerCase();
        return name.includes(target) || target.includes(name);
      });
    if (!combatant) {
      return { narration: `(DM preview) No such target: "${targetName}".` };
    }
    targetId = combatant.id;
  } else {
    const character =
      context.characters.find(
        (c) => c.name.toLowerCase() === targetName.toLowerCase(),
      ) ??
      context.characters.find((c) => {
        const name = c.name.toLowerCase();
        const target = targetName.toLowerCase();
        return name.includes(target) || target.includes(name);
      });
    if (!character) {
      return { narration: `(DM preview) No such target: "${targetName}".` };
    }
    targetId = character.id;
  }

  const result = await runDmTool(context.campaignId, "dm", "cast_spell", {
    characterId,
    spellName,
    targetId,
  });
  return {
    narration: result.ok ? result.message : `(DM preview) ${result.message}`,
  };
}

export function shouldAutoGenerateCombat(message: string): boolean {
  const text = message.toLowerCase();
  if (/\bhit\b/.test(text)) return true;
  if (/\bkill\b/.test(text)) return true;
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
  if (!context.state.combat.active && REST_TRIGGER.test(userMessage.trim())) {
    const result = await runDmTool(context.campaignId, "dm", "take_long_rest", {});
    return {
      narration: result.ok ? result.message : `(DM preview) ${result.message}`,
    };
  }

  const castReply = await tryCastSpell(context, userMessage);
  if (castReply) return castReply;

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

    const combatCastReply = await tryCastSpell(context, userMessage);
    if (combatCastReply) return combatCastReply;

    if (shouldAutoGenerateCombat(userMessage)) {
      const current = currentTurnCombatant(context.state);
      if (current) {
        if (current.status === "stable") {
          const result = await runDmTool(context.campaignId, "dm", "advance_turn", {});
          return {
            narration: result.ok ? result.message : `(DM preview) ${result.message}`,
          };
        }
        let toolName: DmToolName = "attack_combatant";
        let args: Record<string, unknown>;
        if (current.isPlayer) {
          if (current.status === "downed") {
            toolName = "resolve_death_save";
            args = { combatantId: current.id };
          } else {
            const target = context.state.combat.combatants.find(
              (c) => !c.isPlayer && c.status !== "dead",
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
              (c) => c.isPlayer && c.status !== "dead",
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
