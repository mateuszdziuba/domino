import { z } from "zod";
import {
  getCampaignForUser,
  getCampaignCharacters,
  getCampaignMembers,
  getCharacterById,
  loadState,
  saveState,
  pushEvent,
  updateCharacterHp,
  updateCharacterSpellSlots,
} from "../campaign/store.js";
import { buildDmSuggestion, getAvailableActions } from "../rules/actions.js";
import { rollDiceNotation } from "../rules/dice.js";
import {
  nextTurn,
  currentTurnCombatant,
  startCombat,
  endCombat,
  findCombatant,
  combatantByCharacter,
  performAttack,
  performDeathSave,
  characterAttackInput,
} from "../rules/combat.js";
import { abilityModifier } from "../rules/abilities.js";
import {
  SPELLS,
  spellSlotsForLevel,
  resolveSpellCast,
  type SpellCasterStats,
  type SpellDef,
  type SpellCastResult,
} from "../rules/spells.js";
import { buildEncounter } from "../rules/monsters.js";
import type { DmToolName } from "./types.js";
import {
  spellcastingAbility,
  type CampaignState,
  type Character,
  type Combatant,
} from "@domino/shared";

const rollSchema = z.object({
  notation: z.string().min(1),
  reason: z.string().optional(),
});

const actionSchema = z.object({
  characterId: z.string().min(1),
  action: z.string().min(1),
});

const worldPatchSchema = z.object({
  location: z.string().max(128).optional(),
  scene: z.string().max(256).optional(),
  worldProgress: z.array(z.string().max(256)).max(64).optional(),
  notes: z.string().max(2000).optional(),
});

export type ToolResult = {
  ok: boolean;
  message: string;
  data?: unknown;
};

export async function runDmTool(
  campaignId: string,
  userId: string,
  name: DmToolName,
  rawArgs: unknown,
): Promise<ToolResult> {
  const isSystemActor = userId === "dm";
  const campaign = isSystemActor ? { id: campaignId } : getCampaignForUser(campaignId, userId);
  if (!campaign) return { ok: false, message: "Campaign not found or no access." };

  switch (name) {
    case "get_campaign_state": {
      const state = loadState(campaignId);
      return { ok: true, message: "Current campaign state.", data: summarizeState(state) };
    }
    case "get_character": {
      const args = z.object({ characterId: z.string().min(1) }).safeParse(rawArgs);
      if (!args.success) return { ok: false, message: "characterId required." };
      const character = getCharacterById(args.data.characterId);
      if (!character) return { ok: false, message: "Character not found." };
      return { ok: true, message: "Character sheet.", data: character };
    }
    case "get_available_actions": {
      const args = z.object({ characterId: z.string().min(1) }).safeParse(rawArgs);
      if (!args.success) return { ok: false, message: "characterId required." };
      const character = getCharacterById(args.data.characterId);
      if (!character) return { ok: false, message: "Character not found." };
      const state = loadState(campaignId);
      const suggestion = buildDmSuggestion(character, state);
      return {
        ok: true,
        message: "Actions currently legal for this character per the rules engine.",
        data: suggestion,
      };
    }
    case "request_dice_roll": {
      const parsed = rollSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "Invalid dice notation." };
      try {
        const result = rollDiceNotation(parsed.data.notation);
        return {
          ok: true,
          message: `Rolled ${parsed.data.notation}${parsed.data.reason ? ` (${parsed.data.reason})` : ""}: total ${result.total} (rolls: ${result.rolls.join(", ")}).`,
          data: result,
        };
      } catch {
        return { ok: false, message: "Invalid dice notation." };
      }
    }
    case "resolve_action": {
      const parsed = actionSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "characterId and action required." };
      const character = getCharacterById(parsed.data.characterId);
      if (!character) return { ok: false, message: "Character not found." };
      const state = loadState(campaignId);
      const actions = getAvailableActions(character, state);
      const legal = actions.find((a) => a.key === parsed.data.action || a.label === parsed.data.action);
      if (!legal) {
        return { ok: false, message: `Action "${parsed.data.action}" is not known to the rules engine.` };
      }
      if (!legal.legal) {
        return { ok: false, message: `Action is not legal: ${legal.reason ?? "unknown reason"}.` };
      }
      const roll = rollDiceNotation("1d20");
      return {
        ok: true,
        message: `Action "${legal.label}" is legal. Suggested d20 roll: ${roll.total} for narration flavor; authoritative resolution happens through the combat/game endpoints.`,
        data: { action: legal, suggestion: roll.total },
      };
    }
    case "advance_turn": {
      let state = loadState(campaignId);
      if (!state.combat.active) {
        return { ok: false, message: "No combat in progress; nothing to advance." };
      }
      state = nextTurn(state);
      saveState(campaignId, state);
      const current = currentTurnCombatant(state);
      pushEvent(campaignId, "turn.advanced", {
        turnIndex: state.combat.turnIndex,
        round: state.combat.round,
        turnOf: current ? { id: current.id, name: current.name } : null,
      });
      return {
        ok: true,
        message: `Advanced to round ${state.combat.round}, turn ${state.combat.turnIndex + 1}. It is now ${current?.name}'s turn.`,
        data: current ? { name: current.name, id: current.id } : null,
      };
    }
    case "update_world_state": {
      const parsed = worldPatchSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "Patch must only contain location, scene, worldProgress, or notes." };
      }
      let state = loadState(campaignId);
      state = {
        ...state,
        ...(parsed.data.location !== undefined ? { location: parsed.data.location } : {}),
        ...(parsed.data.scene !== undefined ? { scene: parsed.data.scene } : {}),
        ...(parsed.data.worldProgress !== undefined ? { worldProgress: parsed.data.worldProgress } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      };
      state = saveState(campaignId, state);
      pushEvent(campaignId, "state.updated", { by: "dm", patch: parsed.data });
      return { ok: true, message: "Campaign state updated.", data: summarizeState(state) };
    }
    case "generate_encounter": {
      const parsed = z.object({ description: z.string().max(300).optional() }).safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "description must be a short string." };
      const state0 = loadState(campaignId);
      if (state0.combat.active) {
        return { ok: false, message: "Combat is already in progress." };
      }
      const party = getCampaignMembers(campaignId)
        .map((m) => getCharacterById(m.characterId))
        .filter((ch): ch is Character => Boolean(ch));
      if (party.length === 0) {
        return { ok: false, message: "The campaign has no characters yet." };
      }
      const description = parsed.data.description?.trim() || "a random encounter";
      const monsters = buildEncounter(description, party.length);
      const combatants = party.map((ch) => ({
        id: `char-${ch.id}`,
        name: ch.name,
        characterId: ch.id,
        isPlayer: true,
        maxHp: ch.maxHp,
        currentHp: ch.currentHp,
        armorClass: ch.armorClass,
        dexterity: ch.abilityScores.dexterity,
      }));
      let state = startCombat(state0, [...combatants, ...monsters]);
      state = saveState(campaignId, state);
      pushEvent(campaignId, "encounter.started", {
        generated: true,
        description,
        combatants: state.combat.combatants.map((m) => ({ id: m.id, name: m.name, initiative: m.initiative })),
      });
      return {
        ok: true,
        message: `Combat started: ${monsters.map((m) => m.name).join(", ")}. The initiative order is set; describe the scene and hand over to the first combatant.`,
        data: summarizeState(state),
      };
    }
    case "attack_combatant": {
      const parsed = z
        .object({
          attackerId: z.string().min(1),
          targetId: z.string().min(1),
          damageNotation: z.string().optional(),
          attackBonus: z.number().optional(),
          damageBonus: z.number().optional(),
        })
        .safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "attackerId and targetId required." };
      const state = loadState(campaignId);
      const attacker = findCombatant(state, parsed.data.attackerId);
      if (!attacker) return { ok: false, message: "Combatant not found." };
      let { attackBonus, damageNotation, damageBonus } = parsed.data;
      if (attacker.characterId) {
        const defaults = characterAttackInput(attacker, getCharacterById(attacker.characterId));
        attackBonus ??= defaults.attackBonus;
        damageNotation ??= defaults.damageNotation;
        damageBonus ??= defaults.damageBonus;
      }
      const outcome = performAttack(state, parsed.data.attackerId, parsed.data.targetId, {
        attackBonus: attackBonus ?? 0,
        damageNotation: damageNotation ?? "1d6",
        damageBonus: damageBonus ?? 0,
      });
      if (!outcome.ok) return { ok: false, message: `${outcome.error}.` };
      if (outcome.target.characterId) {
        updateCharacterHp(outcome.target.characterId, outcome.target.currentHp);
      }
      saveState(campaignId, outcome.state);
      pushEvent(campaignId, "action.resolved", {
        type: "attack",
        attacker: outcome.attacker.name,
        target: outcome.target.name,
        ...outcome.result,
      });
      const verb = outcome.result.critical
        ? "critically hits"
        : outcome.result.hit
          ? "hits"
          : "misses";
      const damage = outcome.result.hit
        ? ` for ${outcome.result.damageTotal} damage${outcome.result.critical ? " (critical)" : ""}`
        : "";
      return {
        ok: true,
        message: `${outcome.attacker.name} ${verb} ${outcome.target.name} (attack ${outcome.result.attackTotal} vs AC ${outcome.target.armorClass})${damage}${outcome.result.fumble ? " — fumble!" : ""}.`,
        data: outcome.result,
      };
    }
    case "cast_spell": {
      const parsed = z
        .object({
          characterId: z.string().min(1),
          spellName: z.string().min(1),
          targetId: z.string().min(1),
        })
        .safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "characterId, spellName, and targetId are required." };
      }
      const character = getCharacterById(parsed.data.characterId);
      if (!character) return { ok: false, message: "Character not found." };
      const def = SPELLS[parsed.data.spellName];
      if (!def) {
        return {
          ok: false,
          message: `Spell "${parsed.data.spellName}" is not known to the rules engine.`,
        };
      }
      if (!character.spells?.includes(parsed.data.spellName)) {
        return { ok: false, message: "Character does not know that spell." };
      }
      if (character.currentHp === 0) {
        return { ok: false, message: "The caster is unconscious and cannot cast." };
      }
      const state = loadState(campaignId);
      let casterCombatant: Combatant | undefined;
      let targetCombatant: Combatant | undefined;
      let targetCharacter: Character | undefined;
      if (state.combat.active) {
        casterCombatant = combatantByCharacter(state, character.id);
        const current = currentTurnCombatant(state);
        if (!casterCombatant || !current || current.id !== casterCombatant.id) {
          return { ok: false, message: "Not this combatant's turn." };
        }
        targetCombatant = findCombatant(state, parsed.data.targetId);
        if (!targetCombatant) return { ok: false, message: "Target not found in combat." };
        if (targetCombatant.status === "dead") {
          return { ok: false, message: "Target is dead." };
        }
      } else {
        if (def.effect.kind === "damage") {
          return { ok: false, message: "Damage spells require active combat." };
        }
        if (def.effect.kind === "stabilize") {
          return {
            ok: false,
            message: "Spare the Dying requires a combatant at 0 HP in combat.",
          };
        }
        targetCharacter = getCharacterById(parsed.data.targetId);
        if (!targetCharacter) {
          return { ok: false, message: "Target character not found." };
        }
      }
      const castingAbility = spellcastingAbility(character.className) ?? "wisdom";
      const mod = abilityModifier(character.abilityScores[castingAbility]);
      const prof = character.proficiencyBonus;
      const stats: SpellCasterStats = {
        spellAttackBonus: prof + mod,
        spellSaveDc: 8 + prof + mod,
        spellAbilityMod: mod,
      };
      let nextUsed: number[] | null = null;
      if (def.level > 0) {
        const max = spellSlotsForLevel(character.level)[def.level - 1] ?? 0;
        const used = character.spellSlotsUsed ?? [];
        if ((used[def.level - 1] ?? 0) >= max) {
          return { ok: false, message: `No spell slots left for level ${def.level}.` };
        }
        nextUsed = [...used];
        nextUsed[def.level - 1] = (nextUsed[def.level - 1] ?? 0) + 1;
      }
      if (nextUsed) updateCharacterSpellSlots(character.id, nextUsed);
      if (state.combat.active && casterCombatant && targetCombatant) {
        const result = resolveSpellCast(def, stats, targetCombatant);
        const updated: Combatant = {
          ...targetCombatant,
          currentHp: result.targetCurrentHp,
          status: result.targetStatus,
        };
        const combatants = state.combat.combatants.map((c) =>
          c.id === targetCombatant.id ? updated : c,
        );
        saveState(campaignId, {
          ...state,
          combat: { ...state.combat, combatants },
          updatedAt: new Date().toISOString(),
        });
        if (targetCombatant.characterId) {
          updateCharacterHp(targetCombatant.characterId, result.targetCurrentHp);
        }
        pushEvent(campaignId, "action.resolved", {
          type: "spell",
          spell: def.name,
          caster: casterCombatant.name,
          target: targetCombatant.name,
          ...result,
        });
        const message = spellNarration(
          def,
          casterCombatant.name,
          targetCombatant,
          result,
        );
        return { ok: true, message, data: result };
      }
      if (targetCharacter) {
        const synthetic: Combatant = {
          id: targetCharacter.id,
          name: targetCharacter.name,
          isPlayer: true,
          initiative: 0,
          currentHp: targetCharacter.currentHp,
          maxHp: targetCharacter.maxHp,
          armorClass: targetCharacter.armorClass,
          status: targetCharacter.currentHp > 0 ? "active" : "downed",
        };
        const result = resolveSpellCast(def, stats, synthetic);
        updateCharacterHp(targetCharacter.id, result.targetCurrentHp);
        pushEvent(campaignId, "action.resolved", {
          type: "spell",
          spell: def.name,
          caster: character.name,
          target: targetCharacter.name,
          ...result,
        });
        return {
          ok: true,
          message: `${character.name} casts ${def.name} on ${targetCharacter.name} — healing ${result.healed} hit points.`,
          data: result,
        };
      }
      return { ok: false, message: "Target not found." };
    }
    case "resolve_death_save": {
      const parsed = z.object({ combatantId: z.string().min(1) }).safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "combatantId required." };
      const state = loadState(campaignId);
      const outcome = performDeathSave(state, parsed.data.combatantId);
      if (!outcome.ok) return { ok: false, message: `${outcome.error}.` };
      if (outcome.combatant.characterId) {
        updateCharacterHp(outcome.combatant.characterId, outcome.combatant.currentHp);
      }
      saveState(campaignId, outcome.state);
      pushEvent(campaignId, "action.resolved", {
        type: "death-save",
        combatant: outcome.combatant.name,
        ...outcome.result,
      });
      const verdict = outcome.result.dead
        ? "dies"
        : outcome.result.stable
          ? "stabilizes"
          : `death save: ${outcome.result.roll} (${outcome.result.successes} success, ${outcome.result.failures} failure)`;
      return {
        ok: true,
        message: `${outcome.combatant.name} ${verdict}.`,
        data: outcome.result,
      };
    }
    case "take_long_rest": {
      z.object({ hours: z.number().optional() }).safeParse(rawArgs);
      const state0 = loadState(campaignId);
      if (state0.combat.active) {
        return { ok: false, message: "Cannot rest during combat." };
      }
      const healed: string[] = [];
      for (const member of getCampaignMembers(campaignId)) {
        const character = getCharacterById(member.characterId);
        if (!character) continue;
        updateCharacterHp(character.id, character.maxHp);
        updateCharacterSpellSlots(character.id, []);
        healed.push(character.name);
      }
      const state = {
        ...state0,
        phase: "exploration" as const,
        updatedAt: new Date().toISOString(),
      };
      saveState(campaignId, state);
      pushEvent(campaignId, "state.updated", { by: "dm", action: "long_rest", healed });
      return {
        ok: true,
        message:
          "The party takes a long rest, recovers fully, and regains all spent spell slots.",
        data: summarizeState(state),
      };
    }
    case "end_combat": {
      let state = loadState(campaignId);
      if (!state.combat.active) return { ok: false, message: "No combat in progress." };
      for (const combatant of state.combat.combatants) {
        if (combatant.characterId) {
          updateCharacterHp(combatant.characterId, combatant.currentHp);
        }
      }
      state = endCombat(state);
      saveState(campaignId, state);
      pushEvent(campaignId, "combat.ended", {});
      return {
        ok: true,
        message: "Combat has ended. HP written back to the characters; the party returns to exploration.",
        data: summarizeState(state),
      };
    }
  }
}

function spellNarration(
  def: SpellDef,
  casterName: string,
  target: Combatant,
  result: SpellCastResult,
): string {
  if (def.effect.kind === "damage" && def.effect.attack) {
    if (result.hit) {
      return `${casterName} casts ${def.name} at ${target.name} — ${result.critical ? "critically hits" : "hits"} (attack ${result.attackTotal} vs AC ${target.armorClass}) for ${result.damageTotal} ${def.effect.damageType} damage.`;
    }
    return `${casterName} casts ${def.name} at ${target.name} — misses (attack ${result.attackTotal} vs AC ${target.armorClass}).`;
  }
  if (def.effect.kind === "damage") {
    if (result.hit) {
      return `${casterName} casts ${def.name} on ${target.name} — the target fails its save (${result.saveTotal} vs DC ${result.saveDc}) and takes ${result.damageTotal} ${def.effect.damageType} damage.`;
    }
    return `${casterName} casts ${def.name} on ${target.name} — the target succeeds on its save (${result.saveTotal} vs DC ${result.saveDc}) and takes no damage.`;
  }
  if (def.effect.kind === "heal") {
    return `${casterName} casts ${def.name} on ${target.name} — healing ${result.healed} hit points.`;
  }
  return `${casterName} casts ${def.name} on ${target.name} — stabilizing them.`;
}

function summarizeState(state: CampaignState) {
  return {
    phase: state.phase,
    location: state.location,
    scene: state.scene,
    worldProgress: state.worldProgress,
    combat: state.combat.active
      ? {
          round: state.combat.round,
          turnIndex: state.combat.turnIndex,
          combatants: state.combat.combatants.map((c) => ({
            id: c.id,
            name: c.name,
            hp: `${c.currentHp}/${c.maxHp}`,
            status: c.status ?? "active",
            turn: c.id === currentTurnCombatant(state)?.id,
          })),
        }
      : null,
    notes: state.notes,
  };
}

export function campaignCharacters(campaignId: string) {
  return getCampaignCharacters(campaignId);
}
