import type { CampaignState, Character, Combatant, CombatState } from "@domino/shared";
import { abilityModifier } from "./abilities.js";
import {
  GUIDING_BOLT_MARKER,
  SAPPED_MARKER,
  SLOWED_MARKER_PREFIX,
  VEXED_MARKER_PREFIX,
  attackRollAdvantages,
  canAct,
  slowedMarker,
  vexedMarker,
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
  speed?: number;
};

export const DARKVISION_RACES = ["Elf", "Dwarf", "Gnome", "Orc", "Tiefling"];

export function raceHasDarkvision(race: string): boolean {
  return DARKVISION_RACES.some((r) => race.includes(r));
}

export function rollInitiative(dexterityScore: number): { roll: number; total: number } {
  const roll = d(20, 1)[0]!;
  return { roll, total: roll + abilityModifier(dexterityScore) };
}

/**
 * Distance in feet between two grid cells (Manhattan, 5 ft per square).
 * Returns null when either combatant has no grid coordinates.
 */
export function gridDistanceInFeet(
  a: { x?: number; y?: number },
  b: { x?: number; y?: number },
): number | null {
  if (
    a.x === undefined ||
    a.y === undefined ||
    b.x === undefined ||
    b.y === undefined
  ) {
    return null;
  }
  return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) * 5;
}

/**
 * Deterministic battlefield placement: player characters line up along the
 * LEFT column (x=1), non-players along the RIGHT column (x=cols). y wraps
 * into rows, so larger groups stack column-wise.
 */
export function placeCombatantsOnGrid(
  combatants: Combatant[],
  cols: number,
  rows: number,
): Combatant[] {
  let playerIndex = 0;
  let enemyIndex = 0;
  return combatants.map((c) => {
    if (c.isPlayer) {
      const y = (playerIndex % rows) + 1;
      playerIndex++;
      return { ...c, x: 1, y };
    }
    const y = (enemyIndex % rows) + 1;
    enemyIndex++;
    return { ...c, x: cols, y };
  });
}

/**
 * Whether the attacker can reach the target with the given reach in feet.
 * On an active grid the Manhattan distance in 5-ft squares is used; without
 * a grid (or when coordinates are missing) the legacy 1-D battle line wins.
 */
export function reachSatisfied(
  attacker: Combatant,
  target: Combatant,
  reach: number,
  grid?: { cols: number; rows: number },
): boolean {
  if (grid) {
    const distance = gridDistanceInFeet(attacker, target);
    if (distance !== null) return distance <= reach;
  }
  return Math.max(attacker.position ?? 0, target.position ?? 0) <= reach;
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
      speed: entry.speed ?? 30,
      movementLeft: entry.speed ?? 30,
    };
  });
  combatants.sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return a.id.localeCompare(b.id);
  });
  const placed = state.combat.grid
    ? placeCombatantsOnGrid(combatants, state.combat.grid.cols, state.combat.grid.rows)
    : combatants;
  return {
    ...state,
    phase: "combat",
    combat: {
      ...state.combat,
      active: true,
      combatants: placed,
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
  // Slow/vex last "until the start of the wielder's next turn": when wielder
  // X's turn starts, remove every slowed:X / vexed:X marker on any combatant.
  // (Sap is consumed by the target's next attack roll instead.)
  const expiredSlowed = `${SLOWED_MARKER_PREFIX}${nextCombatant.id}`;
  const expiredVexed = `${VEXED_MARKER_PREFIX}${nextCombatant.id}`;
  const expiredMarkers = [expiredSlowed, expiredVexed];
  const combatants = combat.combatants.map((c) => {
    const conditions =
      c.id === nextCombatant.id || expiredMarkers.some((m) => (c.conditions ?? []).includes(m))
        ? (c.conditions ?? []).filter((cond) => !expiredMarkers.includes(cond))
        : c.conditions;
    return c.id === nextCombatant.id
      ? {
          ...c,
          currentHp:
            regenerated > 0 ? c.currentHp + regenerated : c.currentHp,
          attacksLeft: c.attacksPerTurn ?? 1,
          reactionAvailable: true,
          bonusActionAvailable: true,
          movementLeft: c.speed ?? 30,
          conditions,
        }
      : conditions !== c.conditions
        ? { ...c, conditions }
        : c;
  });
  return {
    ...state,
    combat: {
      ...combat,
      combatants,
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
  // Weapon Mastery (SRD 5.2.1) of the weapon used for this attack.
  mastery?: string;
  // Name of the weapon the mastery came from (for messages/events).
  masteryWeapon?: string;
  // Topple: DC 8 + STR mod + proficiency bonus of the wielder (PCs); the
  // combat engine falls back to 12 for monsters and legacy callers.
  toppleDc?: number;
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
  masteryApplied?: string;
  grazeDamage?: number;
  pushedDistance?: number;
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

/**
 * SRD 5.2.1 exhaustion effects on speed: level 2-4 halves it (rounded down),
 * level 5+ sets it to 0. Callers compute the combatant's starting speed at
 * build time (PC sites) with this helper.
 */
export function exhaustedSpeed(speed: number, exhaustion: number): number {
  if (exhaustion >= 5) return 0;
  if (exhaustion >= 2) return Math.floor(speed / 2);
  return speed;
}

/**
 * Movement budget currently available to a combatant this turn. The Slow
 * mastery marker reduces it by 10 ft (SRD: −10 ft until the start of the
 * wielder's next turn); the marker is stored as "slowed:<wielderId>".
 */
export function effectiveMovement(combatant: {
  conditions?: string[];
  movementLeft?: number;
  speed?: number;
}): number {
  const base = combatant.movementLeft ?? combatant.speed ?? 30;
  // Any condition starting with "slowed" (the marker is "slowed:<wielderId>").
  const slowed = (combatant.conditions ?? []).some((c) =>
    c.startsWith("slowed"),
  );
  return slowed ? Math.max(0, base - 10) : base;
}

/**
 * SRD 5.2.1 Weapon Mastery feature: Barbarian and Fighter gain it at level 1,
 * Paladin and Ranger at level 9. Without the feature no mastery applies.
 */
export function hasWeaponMastery(character: {
  className: string;
  level: number;
}): boolean {
  const { className, level } = character;
  if (className === "Barbarian" || className === "Fighter") return level >= 1;
  if (className === "Paladin" || className === "Ranger") return level >= 9;
  return false;
}

export function applyHitToTarget(
  target: Combatant,
  damageTotal: number,
  critical: boolean,
): Combatant {
  if (target.currentHp === 0 && damageTotal > 0) {
    const failures = (target.deathSaveFailures ?? 0) + (critical ? 2 : 1);
    // SRD: exhaustion level 4 halves max HP, so the instant-death threshold
    // (damage >= max HP at 0 HP) uses half the max HP.
    const effectiveMaxHp =
      (target.exhaustionLevel ?? 0) >= 4
        ? Math.floor(target.maxHp / 2)
        : target.maxHp;
    // SRD: instant death requires damage that EXCEEDS max HP (not equal).
    const dead = damageTotal >= effectiveMaxHp || failures >= 3;
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

function appendCondition(target: Combatant, key: string): Combatant {
  const existing = target.conditions ?? [];
  return existing.includes(key)
    ? target
    : { ...target, conditions: [...existing, key] };
}

/**
 * Apply the Weapon Mastery rider (SRD 5.2.1) to a resolved attack.
 * - topple: CON save vs DC 8 + STR mod + proficiency bonus (input.toppleDc,
 *   fallback 12); on a fail the target falls prone.
 * - push: the target is pushed 10 ft along the battle line (clamped to 500).
 * - vex: internal "vexed:<wielderId>" marker grants the wielder advantage on
 *   its next attack roll against the target (consumed after that roll).
 * - graze: a miss still deals damage equal to the attacker's damage bonus.
 * - sap: internal "sapped" marker gives the target disadvantage on its next
 *   attack (consumed after that attack resolves).
 * - slow: internal "slowed:<wielderId>" marker reduces the target's movement
 *   by 10 ft until the start of the wielder's next turn.
 * - cleave: data + narration only — the DM chains a second attack.
 * - nick: handled by the tools (off-hand attack costs no bonus action).
 */
export function applyAttackMastery(
  target: Combatant,
  result: AttackResult,
  input: Pick<AttackInput, "mastery" | "damageBonus" | "toppleDc">,
  wielderId: string,
): Combatant {
  if (result.hit) {
    switch (input.mastery) {
      case "topple": {
        const saveRoll = d(20, 1)[0]! + (target.conSaveMod ?? 0);
        if (saveRoll < (input.toppleDc ?? 12)) {
          result.masteryApplied = "topple";
          return appendCondition(target, "prone");
        }
        return target;
      }
      case "push": {
        result.masteryApplied = "push";
        result.pushedDistance = 10;
        return { ...target, position: Math.min(500, (target.position ?? 0) + 10) };
      }
      case "vex": {
        result.masteryApplied = "vex";
        return appendCondition(target, vexedMarker(wielderId));
      }
      case "sap": {
        result.masteryApplied = "sap";
        return appendCondition(target, SAPPED_MARKER);
      }
      case "slow": {
        result.masteryApplied = "slow";
        return appendCondition(target, slowedMarker(wielderId));
      }
      default:
        return target;
    }
  }
  if (input.mastery === "graze" && (input.damageBonus ?? 0) > 0) {
    const grazeDamage = Math.max(0, input.damageBonus ?? 0);
    result.masteryApplied = "graze";
    result.grazeDamage = grazeDamage;
    return applyHitToTarget(target, grazeDamage, false);
  }
  return target;
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
  if (
    reach < 999 &&
    !reachSatisfied(attacker, target, reach, state.combat.grid)
  ) {
    return { ok: false, error: "Poza zasięgiem — cel jest za daleko." };
  }
  const mods = attackRollAdvantages(attacker, target);
  const attackerSapped = (attacker.conditions ?? []).includes(SAPPED_MARKER);
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
    newTarget = applyAttackMastery(newTarget, result, input, attacker.id);
    result.targetStatus = newTarget.status;
    result.targetCurrentHp = newTarget.currentHp;
  } else {
    newTarget = applyAttackMastery(target, result, input, attacker.id);
    result.targetStatus = newTarget.status;
    result.targetCurrentHp = newTarget.currentHp;
  }
  // Vex: the marker is tied to the attack roll — the wielder's next attack
  // roll against the target consumes it on a hit AND on a miss.
  const vexedByAttacker = (target.conditions ?? []).includes(
    `${VEXED_MARKER_PREFIX}${attacker.id}`,
  );
  if (vexedByAttacker) {
    newTarget = {
      ...newTarget,
      conditions: (newTarget.conditions ?? []).filter(
        (c) => c !== `${VEXED_MARKER_PREFIX}${attacker.id}`,
      ),
    };
    result.targetStatus = newTarget.status;
    result.targetCurrentHp = newTarget.currentHp;
  }
  const combatants = state.combat.combatants.map((c) => {
    if (c.id === target.id) return newTarget;
    if (c.id === attacker.id && attackerSapped) {
      return {
        ...c,
        conditions: (c.conditions ?? []).filter((x) => x !== SAPPED_MARKER),
      };
    }
    return c;
  });
  const resolvedAttacker =
    combatants.find((c) => c.id === attacker.id) ?? attacker;
  return {
    ok: true,
    state: {
      ...state,
      combat: { ...state.combat, combatants },
      updatedAt: new Date().toISOString(),
    },
    result,
    attacker: resolvedAttacker,
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

export function martialArtsDie(level: number): string {
  // SRD 5.2.1 Monk: 1d6 at 1st, 1d8 at 5th, 1d10 at 11th, 1d12 at 17th.
  if (level >= 17) return "1d12";
  if (level >= 11) return "1d10";
  if (level >= 5) return "1d8";
  return "1d6";
}

export function characterAttackInput(
  attacker: Combatant,
  character?: Character,
): AttackInput {
  if (character) {
    // SRD Monk "Dexterous Attacks": unarmed strikes use DEX and the
    // Martial Arts die instead of Strength.
    if (character.className === "Monk") {
      const dexterityMod = abilityModifier(character.abilityScores.dexterity);
      return {
        attackBonus: character.proficiencyBonus + dexterityMod,
        damageNotation: martialArtsDie(character.level),
        damageBonus: dexterityMod,
      };
    }
    return {
      attackBonus: character.proficiencyBonus + abilityModifier(character.abilityScores.strength),
      damageNotation: "1d8",
      damageBonus: abilityModifier(character.abilityScores.strength),
    };
  }
  return { attackBonus: 0, damageNotation: "1d6", damageBonus: 0 };
}
