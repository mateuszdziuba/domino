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
  exhaustionLevel?: number;
  traits?: string[];
  attacksPerTurn?: number;
  position?: number;
  darkvision?: boolean;
};

export const DARKVISION_RACES = ["Elf", "Dwarf", "Gnome", "Orc", "Tiefling"];

export function raceHasDarkvision(race: string): boolean {
  return DARKVISION_RACES.some((r) => race.includes(r));
}

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
      exhaustionLevel: entry.exhaustionLevel ?? 0,
      traits: entry.traits ?? [],
      attacksPerTurn: entry.attacksPerTurn ?? 1,
      attacksLeft: entry.attacksPerTurn ?? 1,
      reactionAvailable: true,
      bonusActionAvailable: true,
      position: entry.position ?? 0,
      darkvision: entry.darkvision ?? false,
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
  const nextCombatant = combat.combatants[nextIndex]!;
  const regenerated =
    (nextCombatant.traits ?? []).includes("regeneration") &&
    nextCombatant.currentHp < nextCombatant.maxHp
      ? Math.min(nextCombatant.maxHp, nextCombatant.currentHp + 10) -
        nextCombatant.currentHp
      : 0;
  return {
    ...state,
    combat: {
      ...combat,
      combatants: combat.combatants.map((c) =>
        c.id === nextCombatant.id
          ? {
              ...c,
              currentHp:
                regenerated > 0 ? c.currentHp + regenerated : c.currentHp,
              attacksLeft: c.attacksPerTurn ?? 1,
              reactionAvailable: true,
              bonusActionAvailable: true,
            }
          : c,
      ),
      turnIndex: nextIndex,
      round: crossedZero ? combat.round + 1 : combat.round,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function extraAttacksForClass(className: string, level: number): number {
  if (className === "Fighter") {
    if (level >= 20) return 4;
    if (level >= 11) return 3;
    if (level >= 5) return 2;
    return 1;
  }
  if (
    level >= 5 &&
    ["Barbarian", "Monk", "Paladin", "Ranger"].includes(className)
  ) {
    return 2;
  }
  return 1;
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
  reach?: number;
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
  concentrationBroken?: boolean;
  concentrationSave?: { roll: number; dc: number };
  conditionApplied?: string;
  undeadFortitudeSaved?: boolean;
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
  const fumble = attackRoll === 1;
  const attackTotal = attackRoll + input.attackBonus;
  const naturalHit = attackTotal >= target.armorClass;
  const helplessTarget = (target.conditions ?? []).some(
    (c) => c === "paralyzed" || c === "unconscious",
  );
  const critical =
    attackRoll === 20 || (fumble ? false : naturalHit && helplessTarget);
  const hit = fumble ? false : critical || naturalHit;

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
  if (!state.combat.active) return { ok: false, error: "Brak walki w toku." };
  const attacker = findCombatant(state, attackerId);
  const target = findCombatant(state, targetId);
  if (!attacker || !target) return { ok: false, error: "Nie znaleziono kombatanta." };
  if (attacker.id === target.id) return { ok: false, error: "Nie możesz zaatakować sam siebie." };
  if (attacker.currentHp === 0 || !canAct(attacker)) {
    return { ok: false, error: "Atakujący jest niezdolny do działania." };
  }
  if (target.status === "dead") return { ok: false, error: "Cel jest martwy." };
  const current = currentTurnCombatant(state);
  if (!current || current.id !== attacker.id) {
    return { ok: false, error: "To nie tura tego kombatanta." };
  }
  const reach = input.reach ?? 5;
  if (reach < 999 && Math.max(attacker.position ?? 0, target.position ?? 0) > reach) {
    return { ok: false, error: "Poza zasięgiem — cel jest za daleko." };
  }
  const mods = attackRollAdvantages(attacker, target);
  const darkAdvantage =
    state.combat.lightLevel === "dark" && target.darkvision !== true;
  const darkDisadvantage =
    state.combat.lightLevel === "dark" && attacker.darkvision !== true;
  const packTacticsAdvantage =
    (attacker.traits ?? []).includes("pack_tactics") &&
    state.combat.combatants.some(
      (c) => c.id !== attacker.id && !c.isPlayer && c.currentHp > 0,
    );
  const result = resolveAttack(target, {
    ...input,
    advantage: mods.advantage || input.advantage === true || packTacticsAdvantage || darkAdvantage,
    disadvantage: mods.disadvantage || input.disadvantage === true || darkDisadvantage,
  });
  let newTarget: Combatant;
  if (result.hit) {
    newTarget = applyHitToTarget(target, result.damageTotal, result.critical);
    if (
      newTarget.currentHp === 0 &&
      (target.traits ?? []).includes("undead_fortitude")
    ) {
      const dc = 5 + result.damageTotal;
      const saveRoll = d(20, 1)[0]! + (target.conSaveMod ?? 0);
      if (saveRoll >= dc) {
        result.undeadFortitudeSaved = true;
        newTarget = { ...newTarget, currentHp: 1, status: "active" };
      }
    }
    const attackerTraits = attacker.traits ?? [];
    const traitCondition = attackerTraits.includes("paralyzing_touch")
      ? "paralyzed"
      : attackerTraits.includes("web")
        ? "restrained"
        : undefined;
    if (traitCondition) {
      const saveRoll = d(20, 1)[0]! + (target.conSaveMod ?? 0);
      if (saveRoll < 11) {
        const existing = newTarget.conditions ?? [];
        if (!existing.includes(traitCondition)) {
          newTarget = { ...newTarget, conditions: [...existing, traitCondition] };
        }
        result.conditionApplied = traitCondition;
      }
    }
    if ((target.conditions ?? []).includes(GUIDING_BOLT_MARKER)) {
      newTarget = {
        ...newTarget,
        conditions: (target.conditions ?? []).filter((c) => c !== GUIDING_BOLT_MARKER),
      };
    }
    if (target.concentratingOn && result.damageTotal > 0) {
      if (newTarget.currentHp === 0) {
        result.concentrationBroken = true;
        newTarget = { ...newTarget, concentratingOn: undefined };
      } else {
        const dc = Math.max(10, Math.floor(result.damageTotal / 2));
        const saveRoll = d(20, 1)[0]! + (target.conSaveMod ?? 0);
        result.concentrationSave = { roll: saveRoll, dc };
        if (saveRoll < dc) {
          result.concentrationBroken = true;
          newTarget = { ...newTarget, concentratingOn: undefined };
        } else {
          result.concentrationBroken = false;
        }
      }
    }
    result.targetStatus = newTarget.status;
    result.targetCurrentHp = newTarget.currentHp;
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
  if (!state.combat.active) return { ok: false, error: "Brak walki w toku." };
  const combatant = findCombatant(state, combatantId);
  if (!combatant) return { ok: false, error: "Nie znaleziono kombatanta." };
  if (
    combatant.currentHp > 0 ||
    combatant.status === "stable" ||
    combatant.status === "dead"
  ) {
    return { ok: false, error: "Kombatant nie jest powalony." };
  }
  const outcome = applyDeathSave(state.combat, combatantId);
  if (!outcome) return { ok: false, error: "Nie znaleziono kombatanta." };
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
