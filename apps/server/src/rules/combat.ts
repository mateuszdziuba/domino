import type { CampaignState, Character, Combatant, CombatState } from "@domino/shared";
import { abilityModifier } from "./abilities.js";
import {
  GUIDING_BOLT_MARKER,
  attackRollAdvantages,
  canAct,
} from "./conditions.js";
import { d, rollDiceNotation } from "./dice.js";

export type NewCombatant = {
  id: string;
  name: string;
  characterId?: string;
  isPlayer: boolean;
  maxHp: number;
  currentHp?: number;
  armorClass: number;
  initiative?: number;
  dexterity?: number;
  cr?: number;
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
      currentHp: entry.currentHp ?? entry.maxHp,
      maxHp: entry.maxHp,
      armorClass: entry.armorClass,
      cr: entry.cr,
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
  const n = combat.combatants.length;
  let nextIndex = (combat.turnIndex + 1) % n;
  let crossedZero = nextIndex === 0;
  let scanned = 0;
  while (scanned < n && combat.combatants[nextIndex]!.status === "dead") {
    nextIndex = (nextIndex + 1) % n;
    if (nextIndex === 0) crossedZero = true;
    scanned++;
  }
  if (scanned >= n) return state;
  return {
    ...state,
    combat: {
      ...combat,
      turnIndex: nextIndex,
      round: crossedZero ? combat.round + 1 : combat.round,
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
  advantage?: boolean;
  disadvantage?: boolean;
};

export type AttackResult = {
  hit: boolean;
  critical: boolean;
  fumble: boolean;
  attackRoll: number;
  attackRolls: number[];
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
  const useAdvantage = input.advantage === true && input.disadvantage !== true;
  const useDisadvantage = input.disadvantage === true && input.advantage !== true;
  let attackRoll: number;
  let attackRolls: number[];
  if (useAdvantage || useDisadvantage) {
    const [first, second] = d(20, 2);
    attackRolls = [first!, second!];
    attackRoll = useAdvantage ? Math.max(first!, second!) : Math.min(first!, second!);
  } else {
    attackRoll = d(20, 1)[0]!;
    attackRolls = [attackRoll];
  }
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
      attackRolls,
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
    attackRolls,
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
    status: result.dead ? "dead" : result.stable ? "stable" : "downed",
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

export function applyHitToTarget(
  target: Combatant,
  damageTotal: number,
  critical: boolean,
): Combatant {
  if (target.currentHp === 0 && damageTotal > 0) {
    const failures = (target.deathSaveFailures ?? 0) + (critical ? 2 : 1);
    const dead = damageTotal >= target.maxHp || failures >= 3;
    const status: Combatant["status"] = dead
      ? "dead"
      : target.status === "stable"
        ? "stable"
        : "downed";
    return { ...target, currentHp: 0, status, deathSaveFailures: dead ? 3 : failures };
  }
  const currentHp = Math.max(0, target.currentHp - damageTotal);
  const status: Combatant["status"] =
    currentHp === 0 ? "downed" : target.status ?? "active";
  return { ...target, currentHp, status };
}

export type AttackOutcome =
  | { ok: true; state: CampaignState; result: AttackResult; attacker: Combatant; target: Combatant }
  | { ok: false; error: string };

export function performAttack(
  state: CampaignState,
  attackerId: string,
  targetId: string,
  input: AttackInput,
): AttackOutcome {
  if (!state.combat.active) return { ok: false, error: "No combat in progress" };
  const attacker = findCombatant(state, attackerId);
  const target = findCombatant(state, targetId);
  if (!attacker || !target) return { ok: false, error: "Combatant not found" };
  if (attacker.id === target.id) return { ok: false, error: "Cannot attack yourself" };
  if (attacker.currentHp === 0 || !canAct(attacker)) {
    return { ok: false, error: "Attacker is incapacitated" };
  }
  if (target.status === "dead") return { ok: false, error: "Target is dead" };
  const current = currentTurnCombatant(state);
  if (!current || current.id !== attacker.id) {
    return { ok: false, error: "Not this combatant's turn" };
  }
  const mods = attackRollAdvantages(attacker, target);
  const result = resolveAttack(target, {
    ...input,
    advantage: mods.advantage || input.advantage === true,
    disadvantage: mods.disadvantage || input.disadvantage === true,
  });
  let newTarget: Combatant;
  if (result.hit) {
    newTarget = applyHitToTarget(target, result.damageTotal, result.critical);
    if ((target.conditions ?? []).includes(GUIDING_BOLT_MARKER)) {
      newTarget = {
        ...newTarget,
        conditions: (target.conditions ?? []).filter((c) => c !== GUIDING_BOLT_MARKER),
      };
    }
    result.targetStatus = newTarget.status;
  } else {
    newTarget = { ...target, currentHp: result.targetCurrentHp, status: result.targetStatus };
  }
  const combatants = state.combat.combatants.map((c) => (c.id === target.id ? newTarget : c));
  return {
    ok: true,
    state: {
      ...state,
      combat: { ...state.combat, combatants },
      updatedAt: new Date().toISOString(),
    },
    result,
    attacker,
    target,
  };
}

export type DeathSaveOutcome =
  | { ok: true; state: CampaignState; combatant: Combatant; result: DeathSaveResult }
  | { ok: false; error: string };

export function performDeathSave(state: CampaignState, combatantId: string): DeathSaveOutcome {
  if (!state.combat.active) return { ok: false, error: "No combat in progress" };
  const combatant = findCombatant(state, combatantId);
  if (!combatant) return { ok: false, error: "Combatant not found" };
  if (
    combatant.currentHp > 0 ||
    combatant.status === "stable" ||
    combatant.status === "dead"
  ) {
    return { ok: false, error: "Combatant is not downed" };
  }
  const outcome = applyDeathSave(state.combat, combatantId);
  if (!outcome) return { ok: false, error: "Combatant not found" };
  const updated =
    outcome.result.roll === 20
      ? { ...outcome.combatant, currentHp: 1, status: "active" as const }
      : outcome.combatant;
  const combatants = state.combat.combatants.map((c) => (c.id === combatantId ? updated : c));
  return {
    ok: true,
    state: {
      ...state,
      combat: { ...state.combat, combatants },
      updatedAt: new Date().toISOString(),
    },
    combatant: updated,
    result: outcome.result,
  };
}

export function characterAttackInput(
  attacker: Combatant,
  character?: Character,
): AttackInput {
  if (character) {
    return {
      attackBonus: character.proficiencyBonus + abilityModifier(character.abilityScores.strength),
      damageNotation: "1d8",
      damageBonus: abilityModifier(character.abilityScores.strength),
    };
  }
  return { attackBonus: 0, damageNotation: "1d6", damageBonus: 0 };
}
