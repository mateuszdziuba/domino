import type { DmContext, DmReply, DmToolName } from "./types.js";
import { runDmTool } from "./tools.js";
import { currentTurnCombatant } from "../rules/combat.js";
import { SPELLS } from "../rules/spells.js";
import { ADVENTURES } from "../rules/adventures.js";

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
  "atak",
  "cios",
  "walk",
  "uderz",
  "szarż",
  "miecz",
  "topór",
  "łuk",
  "strzał",
  "wrog",
  "potwor",
  "goblin",
  "ork",
  "szczur",
  "nieumarł",
  "bandyt",
  "bij",
  "bije",
];

const REST_TRIGGER =
  /^(i|we|the party) (need to |want to |should )?(take a |long )?(rest|sleep)|^let'?s (take a |long )?(rest|sleep)|^(we )?(make )?camp|^camp$|^odpoczywamy|^odpoczywam|^śpimy|^spać|^sen|^oboz|^biwak|^ognisk/i;

const START_ADVENTURE_TRIGGER =
  /^zacznijmy (przygodę|przygode)|^jakąś przygodę|^jakas przygode|^startuj przygodę|^startuj przygode/i;

const CREATE_ADVENTURE_TRIGGER =
  /^wymyśl (nam )?kampanię|^wymysl (nam )?kampanie|^stwórz przygodę|^stworz przygode|^customowa przygoda/i;

const TARGET_PATTERN = /(?:on|at|against|towards?|na)\s+([a-zą-ż' -]+)/i;

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
  if (!/cast|rzucam|rzucę|rzuca|zaklęcie|zaklęcia/i.test(trimmed)) return null;
  const spellName = findKnownSpell(trimmed);
  if (!spellName) return null;

  const targetMatch = TARGET_PATTERN.exec(trimmed);
  if (!targetMatch?.[1]) {
    return { narration: `(DM preview) Komu rzuca?` };
  }
  const targetName = normalizeTargetName(targetMatch[1]);

  let characterId: string;
  if (context.state.combat.active) {
    const current = currentTurnCombatant(context.state);
    if (!current?.isPlayer || !current.characterId) {
      return { narration: `(DM preview) To nie twoja tura.` };
    }
    characterId = current.characterId;
  } else {
    if (context.characters.length !== 1) {
      return { narration: `(DM preview) Która postać rzuca?` };
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
      return { narration: `(DM preview) Nie ma takiego celu: "${targetName}".` };
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
      return { narration: `(DM preview) Nie ma takiego celu: "${targetName}".` };
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
  const trimmed = userMessage.trim();
  const lower = trimmed.toLowerCase();

  if (!context.state.combat.active && lower.match(START_ADVENTURE_TRIGGER)) {
    const adventure = ADVENTURES[0]!;
    const result = await runDmTool(context.campaignId, "dm", "start_adventure", {
      title: adventure.title,
    });
    return {
      narration: result.ok ? result.message : `(DM preview) ${result.message}`,
    };
  }

  if (!context.state.combat.active && lower.match(CREATE_ADVENTURE_TRIGGER)) {
    const trigger = lower.match(CREATE_ADVENTURE_TRIGGER)![0];
    const description = trimmed.slice(trigger.length).replace(/^\s*o\s+/i, "").trim();
    if (!description) {
      return { narration: `(DM preview) Opisz, o czym ma być przygoda.` };
    }
    const result = await runDmTool(context.campaignId, "dm", "create_adventure", {
      description,
    });
    return {
      narration: result.ok ? result.message : `(DM preview) ${result.message}`,
    };
  }

  if (!context.state.combat.active && REST_TRIGGER.test(trimmed)) {
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
          ? `Walka zaczyna się! ${hostiles.join(", ")} zagradzają wam drogę — inicjatywa rzucona, stal w dłoniach.`
          : "Walka zaczyna się! Inicjatywa rzucona.",
    };
  }

  if (context.state.combat.active) {
    if (/^(end turn|next|advance|continue|koniec tury|kończę turę|dalej|następny)$/i.test(userMessage.trim())) {
      const result = await runDmTool(context.campaignId, "dm", "advance_turn", {});
      return {
        narration: result.ok ? result.message : `(DM preview) ${result.message}`,
      };
    }

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
                narration: ended.ok ? ended.message : "Zwycięstwo! Wrogowie pokonani.",
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
                narration: ended.ok ? ended.message : "Drużyna została pokonana.",
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
        const advanceMsg = advance.ok ? advance.message : "Tura przechodzi dalej.";
        return { narration: `${result.message} ${advanceMsg}` };
      }
    }

    return {
      narration: `(DM preview) Walka w toku — opisz atak albo napisz "koniec tury".`,
    };
  }

  return {
    narration: `(DM preview) Mówisz: "${userMessage}". Silnik zasad jest autorytatywny; narrator AI zostanie podłączony później.`,
  };
}
