import { z } from "zod";
import {
  getCampaignForUser,
  getCampaignCharacters,
  getCampaignMembers,
  getCharacterById,
  loadState,
  saveState,
  pushEvent,
} from "../campaign/store.js";
import { buildDmSuggestion, getAvailableActions } from "../rules/actions.js";
import { rollDiceNotation } from "../rules/dice.js";
import { nextTurn, currentTurnCombatant, startCombat } from "../rules/combat.js";
import { buildEncounter } from "../rules/monsters.js";
import type { DmToolName } from "./types.js";
import type { CampaignState, Character } from "@domino/shared";

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
  }
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
