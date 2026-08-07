import type { CampaignState, Combatant, CombatState } from "@domino/shared";
import { abilityModifier } from "./abilities.js";
import { d, rollDiceNotation } from "./dice.js";

export type NewCombatant = {
  id: string;
  name: string;
  characterId?: string;
  isPlayer: boolean;
  maxHp: number;
  armorClass: number;
  initiative?: number;
  dexterity?: number;
};

export function rollInitiative(dexterityScore: number): { roll: number; total: number } {
  const roll = d(20, 1)[0]!;
  return { roll, total: roll + abilityModifier(dexterityScore) };
}

export function startCombat(
  state: CampaignState,
  entries: NewCombatant[],
): CampaignState {
  const combatants: Combatant[] = entries.map((entry) => {
    const dexterity = entry.dexterity ?? 10;
    const initiative =
      entry.initiative ??
      d(20, 1)[0]! + abilityModifier(dexterity);
    return {
      id: entry.id,
      name: entry.name,
      characterId: entry.characterId,
      isPlayer: entry.isPlayer,
      initiative,
      currentHp: entry.maxHp,
      maxHp: entry.maxHp,
      armorClass: entry.armorClass,
      status: "active",
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    };
  });
  combatants.sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return a.id.localeCompare(b.id);
  });
  return {
    ...state,
    phase: "combat",
    combat: {
      active: true,
      combatants,
      turnIndex: 0,
      round: 1,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function currentTurnCombatant(state: CampaignState): Combatant | undefined {
  const { combat } = state;
  if (!combat.active || combat.combatants.length === 0) return undefined;
  const idx = combat.turnIndex % combat.combatants.length;
  return combat.combatants[idx];
}

export function nextTurn(state: CampaignState): CampaignState {
  const { combat } = state;
  if (!combat.active || combat.combatants.length === 0) return state;
  const nextIndex = (combat.turnIndex + 1) % combat.combatants.length;
  const round = nextIndex === 0 ? combat.round + 1 : combat.round;
  return {
    ...state,
    combat: {
      ...combat,
      turnIndex: nextIndex,
      round,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function endCombat(state: CampaignState): CampaignState {
  return {
    ...state,
    phase: "exploration",
    combat: { active: false, combatants: [], turnIndex: 0, round: 1 },
    updatedAt: new Date().toISOString(),
  };
}

export type AttackInput = {
  attackBonus: number;
  damageNotation: string;
  damageBonus: number;
};

export type AttackResult = {
  hit: boolean;
  critical: boolean;
  fumble: boolean;
  attackRoll: number;
  attackTotal: number;
  damageTotal: number;
  damageRolls: number[];
  targetCurrentHp: number;
  targetStatus: Combatant["status"];
};

export function resolveAttack(
  target: Combatant,
  input: AttackInput,
): AttackResult {
  const attackRoll = d(20, 1)[0]!;
  const critical = attackRoll === 20;
  const fumble = attackRoll === 1;
  const attackTotal = attackRoll + input.attackBonus;
  const hit = critical || attackTotal >= target.armorClass;

  if (!hit) {
    return {
      hit,
      critical: false,
      fumble,
      attackRoll,
      attackTotal,
      damageTotal: 0,
      damageRolls: [],
      targetCurrentHp: target.currentHp,
      targetStatus: target.status ?? "active",
    };
  }

  const first = rollDiceNotation(input.damageNotation);
  const second = critical ? rollDiceNotation(input.damageNotation) : null;
  const damageTotal =
    first.total + (second ? second.total : 0) + input.damageBonus;
  const damageRolls = [...first.rolls, ...(second?.rolls ?? [])];
  const targetCurrentHp = Math.max(0, target.currentHp - damageTotal);
  const targetStatus = targetCurrentHp === 0 ? "downed" : target.status ?? "active";

  return {
    hit,
    critical,
    fumble,
    attackRoll,
    attackTotal,
    damageTotal,
    damageRolls,
    targetCurrentHp,
    targetStatus,
  };
}

export type DeathSaveResult = {
  roll: number;
  successes: number;
  failures: number;
  stable: boolean;
  dead: boolean;
};

export function makeDeathSave(
  target: Combatant,
  roll?: number,
): DeathSaveResult {
  const die = roll ?? d(20, 1)[0]!;
  let successes = target.deathSaveSuccesses ?? 0;
  let failures = target.deathSaveFailures ?? 0;
  if (die === 1) {
    failures += 2;
  } else if (die < 10) {
    failures += 1;
  } else if (die < 20) {
    successes += 1;
  } else {
    // Natural 20: regain 1 HP and become stable.
    return { roll: die, successes, failures, stable: true, dead: false };
  }
  return {
    roll: die,
    successes,
    failures,
    stable: successes >= 3,
    dead: failures >= 3,
  };
}

export function applyDeathSave(
  combat: CombatState,
  combatantId: string,
  roll?: number,
): { combatant: Combatant; result: DeathSaveResult } | undefined {
  const combatant = combat.combatants.find((c) => c.id === combatantId);
  if (!combatant) return undefined;
  const result = makeDeathSave(combatant, roll);
  const updated: Combatant = {
    ...combatant,
    deathSaveSuccesses: result.successes,
    deathSaveFailures: result.failures,
    status: result.dead ? "dead" : result.stable ? "downed" : "active",
  };
  combat.combatants[combat.combatants.indexOf(combatant)] = updated;
  return { combatant: updated, result };
}

export function findCombatant(
  state: CampaignState,
  id: string,
): Combatant | undefined {
  return state.combat.combatants.find((c) => c.id === id);
}

export function combatantByCharacter(
  state: CampaignState,
  characterId: string,
): Combatant | undefined {
  return state.combat.combatants.find((c) => c.characterId === characterId);
}
