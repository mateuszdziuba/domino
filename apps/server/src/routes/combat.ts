import { Hono, type Context } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  getCampaignForUser,
  loadState,
  saveState,
  pushEvent,
  getCampaignMembers,
  getCharacterById,
  updateCharacterHp,
  grantXp,
} from "../campaign/store.js";
import {
  startCombat,
  nextTurn,
  endCombat,
  performAttack,
  performDeathSave,
  currentTurnCombatant,
  findCombatant,
} from "../rules/combat.js";
import { buildEncounter } from "../rules/monsters.js";
import { abilityModifier } from "../rules/abilities.js";
import { xpAwardForDeadEnemies } from "../rules/advancement.js";
import type { Character } from "@domino/shared";

const enemySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(64),
  maxHp: z.number().int().positive(),
  armorClass: z.number().int().positive(),
  initiative: z.number().int().optional(),
});

const startSchema = z.object({
  enemies: z.array(enemySchema).max(20).default([]),
});

const generateSchema = z.object({
  description: z.string().max(300).optional(),
  location: z.string().max(128).optional(),
});

const attackSchema = z.object({
  attackerId: z.string().min(1),
  targetId: z.string().min(1),
  damageNotation: z.string().regex(/^\d*d\d+([+-]\d+)?$/).optional(),
  attackBonus: z.number().optional(),
  damageBonus: z.number().optional(),
});

const deathSaveSchema = z.object({
  combatantId: z.string().min(1),
});

export const combatRoutes = new Hono();

combatRoutes.post("/start", requireAuth, async (c) => {
  const campaignId = c.req.param("id")!;
  if (!requireCampaign(c, campaignId)) return c.json({ error: "Campaign not found" }, 404);
  const parsed = startSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid encounter", details: parsed.error.flatten() }, 400);

  let state = loadState(campaignId);
  const members = getCampaignMembers(campaignId);
  const combatants = members
    .map((m) => getCharacterById(m.characterId))
    .filter((ch): ch is Character => Boolean(ch))
    .map((ch) => ({
      id: `char-${ch.id}`,
      name: ch.name,
      characterId: ch.id,
      isPlayer: true,
      maxHp: ch.maxHp,
      currentHp: ch.currentHp,
      armorClass: ch.armorClass,
      dexterity: ch.abilityScores.dexterity,
    }));
  const enemies = parsed.data.enemies.map((e) => ({
    id: e.id ?? `enemy-${crypto.randomUUID()}`,
    name: e.name,
    isPlayer: false,
    maxHp: e.maxHp,
    armorClass: e.armorClass,
    initiative: e.initiative,
  }));

  if (combatants.length === 0 && enemies.length === 0) {
    return c.json({ error: "No combatants: the campaign has no characters in it" }, 400);
  }

  state = startCombat(state, [...combatants, ...enemies]);
  saveState(campaignId, state);
  pushEvent(campaignId, "encounter.started", {
    combatants: state.combat.combatants.map((c) => ({ id: c.id, name: c.name, initiative: c.initiative })),
  });
  return c.json({ state }, 201);
});

/**
 * The DM generates the encounter from a description: the rules engine picks
 * SRD monsters (keyword match) scaled to the party. Players never add
 * enemies by hand.
 */
combatRoutes.post("/generate", requireAuth, async (c) => {
  const campaignId = c.req.param("id")!;
  if (!requireCampaign(c, campaignId)) return c.json({ error: "Campaign not found" }, 404);
  const parsed = generateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid description" }, 400);

  const state0 = loadState(campaignId);
  if (state0.combat.active) return c.json({ error: "Combat already in progress" }, 400);

  const members = getCampaignMembers(campaignId);
  const party = members
    .map((m) => getCharacterById(m.characterId))
    .filter((ch): ch is Character => Boolean(ch));
  if (party.length === 0) {
    return c.json({ error: "No characters in this campaign yet" }, 400);
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
  if (parsed.data.location) {
    state = { ...state, location: parsed.data.location };
  }
  state = saveState(campaignId, state);
  pushEvent(campaignId, "encounter.started", {
    generated: true,
    description,
    combatants: state.combat.combatants.map((m) => ({ id: m.id, name: m.name, initiative: m.initiative })),
  });
  return c.json({ state, monsters }, 201);
});

combatRoutes.post("/advance", requireAuth, async (c) => {
  const campaignId = c.req.param("id")!;
  if (!requireCampaign(c, campaignId)) return c.json({ error: "Campaign not found" }, 404);
  let state = loadState(campaignId);
  if (!state.combat.active) return c.json({ error: "No combat in progress" }, 400);
  state = nextTurn(state);
  saveState(campaignId, state);
  const current = currentTurnCombatant(state);
  pushEvent(campaignId, "turn.advanced", {
    turnIndex: state.combat.turnIndex,
    round: state.combat.round,
    turnOf: current ? { id: current.id, name: current.name } : null,
  });
  return c.json({ state });
});

combatRoutes.post("/end", requireAuth, async (c) => {
  const campaignId = c.req.param("id")!;
  if (!requireCampaign(c, campaignId)) return c.json({ error: "Campaign not found" }, 404);
  let state = loadState(campaignId);
  if (!state.combat.active) return c.json({ error: "No combat in progress" }, 400);
  const xpTotal = xpAwardForDeadEnemies(state.combat.combatants);
  for (const combatant of state.combat.combatants) {
    if (combatant.characterId) {
      updateCharacterHp(combatant.characterId, combatant.currentHp);
    }
  }
  state = endCombat(state);
  saveState(campaignId, state);
  pushEvent(campaignId, "combat.ended", {});
  const members = getCampaignMembers(campaignId)
    .map((m) => getCharacterById(m.characterId))
    .filter((ch): ch is Character => Boolean(ch));
  if (xpTotal > 0 && members.length > 0) {
    const share = Math.floor(xpTotal / members.length);
    const levelUps: { characterId: string; name: string; level: number; className: string }[] = [];
    for (const member of members) {
      const prevLevel = member.level;
      const { level } = grantXp(member.id, share);
      if (level > prevLevel) {
        levelUps.push({
          characterId: member.id,
          name: member.name,
          level,
          className: member.className,
        });
      }
    }
    pushEvent(campaignId, "action.resolved", {
      type: "xp-award",
      source: "combat",
      total: xpTotal,
      perCharacter: share,
      levelUps,
    });
  }
  return c.json({ state });
});

combatRoutes.post("/attack", requireAuth, async (c) => {
  const campaignId = c.req.param("id")!;
  if (!requireCampaign(c, campaignId)) return c.json({ error: "Campaign not found" }, 404);
  const parsed = attackSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid attack", details: parsed.error.flatten() }, 400);

  const state = loadState(campaignId);
  if (!state.combat.active) return c.json({ error: "No combat in progress" }, 400);

  const attacker = findCombatant(state, parsed.data.attackerId);
  const target = findCombatant(state, parsed.data.targetId);
  if (!attacker || !target) return c.json({ error: "Combatant not found" }, 404);

  const current = currentTurnCombatant(state);
  if (!current || current.id !== attacker.id) {
    return c.json({ error: "Not this combatant's turn" }, 400);
  }

  let attackBonus = parsed.data.attackBonus;
  let damageBonus = parsed.data.damageBonus;
  let damageNotation = parsed.data.damageNotation;
  if (attacker.characterId) {
    const character = getCharacterById(attacker.characterId);
    if (character) {
      const strMod = abilityModifier(character.abilityScores.strength);
      attackBonus ??= character.proficiencyBonus + strMod;
      damageBonus ??= strMod;
      damageNotation ??= "1d8";
    }
  }
  if (attackBonus === undefined) attackBonus = 0;
  if (damageBonus === undefined) damageBonus = 0;
  damageNotation ??= "1d6";

  const outcome = performAttack(state, parsed.data.attackerId, parsed.data.targetId, {
    attackBonus,
    damageNotation,
    damageBonus,
  });
  if (!outcome.ok) return c.json({ error: outcome.error }, 400);

  const newTarget = outcome.target;
  if (newTarget.characterId) {
    updateCharacterHp(newTarget.characterId, newTarget.currentHp);
  }
  saveState(campaignId, outcome.state);
  pushEvent(campaignId, "action.resolved", {
    type: "attack",
    attacker: outcome.attacker.name,
    target: outcome.target.name,
    ...outcome.result,
  });

  return c.json({
    result: { ...outcome.result, attackerName: outcome.attacker.name, targetName: outcome.target.name },
    state: outcome.state,
  });
});

combatRoutes.post("/death-save", requireAuth, async (c) => {
  const campaignId = c.req.param("id")!;
  if (!requireCampaign(c, campaignId)) return c.json({ error: "Campaign not found" }, 404);
  const parsed = deathSaveSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Combatant id required" }, 400);

  const state = loadState(campaignId);
  const outcome = performDeathSave(state, parsed.data.combatantId);
  if (!outcome.ok) {
    const status = outcome.error === "Combatant not found" ? 404 : 400;
    return c.json({ error: outcome.error }, status);
  }

  if (outcome.combatant.characterId) {
    updateCharacterHp(outcome.combatant.characterId, outcome.combatant.currentHp);
  }
  saveState(campaignId, outcome.state);
  pushEvent(campaignId, "action.resolved", {
    type: "death-save",
    combatant: outcome.combatant.name,
    ...outcome.result,
  });
  return c.json({ result: outcome.result, combatant: outcome.combatant, state: outcome.state });
});

function requireCampaign(c: Context, campaignId: string): boolean {
  const user = c.get("user");
  return Boolean(getCampaignForUser(campaignId, user.id));
}
