import type { AbilityScore, Combatant } from "@domino/shared";
import { applyHitToTarget } from "./combat.js";
import { d, rollDiceNotation } from "./dice.js";

export type SpellEffect =
  | {
      kind: "damage";
      dice: string;
      damageType: string;
      attack: boolean;
      save?: keyof AbilityScore;
      range: string;
      duration: string;
      castingTime: "action";
    }
  | {
      kind: "heal";
      dice: string;
      mod: boolean;
      range: string;
      duration: string;
      castingTime: "action" | "bonus";
    }
  | {
      kind: "stabilize";
      range: string;
      duration: string;
      castingTime: "action";
    };

export type SpellDef = {
  name: string;
  level: 0 | 1;
  school: string;
  components: string;
  effect: SpellEffect;
};

export const SPELLS: Record<string, SpellDef> = {
  "Sacred Flame": {
    name: "Sacred Flame",
    level: 0,
    school: "Evocation",
    components: "V, S",
    effect: {
      kind: "damage",
      dice: "1d8",
      damageType: "radiant",
      attack: false,
      save: "dexterity",
      range: "60 ft",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
  "Spare the Dying": {
    name: "Spare the Dying",
    level: 0,
    school: "Necromancy",
    components: "V, S",
    effect: {
      kind: "stabilize",
      range: "Touch",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
  "Cure Wounds": {
    name: "Cure Wounds",
    level: 1,
    school: "Evocation",
    components: "V, S",
    effect: {
      kind: "heal",
      dice: "1d8",
      mod: true,
      range: "Touch",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
  "Healing Word": {
    name: "Healing Word",
    level: 1,
    school: "Evocation",
    components: "V",
    effect: {
      kind: "heal",
      dice: "1d4",
      mod: true,
      range: "60 ft",
      duration: "Instantaneous",
      castingTime: "bonus",
    },
  },
  "Guiding Bolt": {
    name: "Guiding Bolt",
    level: 1,
    school: "Evocation",
    components: "V, S",
    effect: {
      kind: "damage",
      dice: "4d6",
      damageType: "radiant",
      attack: true,
      range: "120 ft",
      duration: "1 round",
      castingTime: "action",
    },
  },
  "Inflict Wounds": {
    name: "Inflict Wounds",
    level: 1,
    school: "Necromancy",
    components: "V, S",
    effect: {
      kind: "damage",
      dice: "3d10",
      damageType: "necrotic",
      attack: true,
      range: "Touch",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
};

// Cleric spell slots per caster level (SRD 5.2.1 full-caster table), columns are 1st-5th level spell slots.
// v1 cap: caster levels above 9 use the level-9 row.
export function spellSlotsForLevel(casterLevel: number): number[] {
  const table: Record<number, number[]> = {
    1: [2, 0, 0, 0, 0],
    2: [3, 0, 0, 0, 0],
    3: [4, 2, 0, 0, 0],
    4: [4, 3, 0, 0, 0],
    5: [4, 3, 2, 0, 0],
    6: [4, 3, 3, 0, 0],
    7: [4, 3, 3, 1, 0],
    8: [4, 3, 3, 2, 0],
    9: [4, 3, 3, 3, 1],
  };
  return table[Math.min(Math.max(1, casterLevel), 9)] ?? table[9]!;
}

export type SpellCasterStats = {
  spellAttackBonus: number;
  spellSaveDc: number;
  spellAbilityMod: number;
};

export type SpellRollInput = {
  attack?: number;
  save?: number;
  dice?: number[];
};

export type SpellCastResult = {
  hit?: boolean;
  critical?: boolean;
  attackTotal?: number;
  saveDc?: number;
  saveTotal?: number;
  damageTotal: number;
  damageRolls: number[];
  healed: number;
  healRolls: number[];
  targetCurrentHp: number;
  targetStatus: Combatant["status"];
};

export function resolveSpellCast(
  def: SpellDef,
  caster: SpellCasterStats,
  target: Combatant,
  rolls?: SpellRollInput,
): SpellCastResult {
  const effect = def.effect;

  if (effect.kind === "heal") {
    const healRolls = rolls?.dice ?? rollDiceNotation(effect.dice).rolls;
    const total = healRolls.reduce((sum, r) => sum + r, 0);
    const healed = Math.max(1, total + (effect.mod ? caster.spellAbilityMod : 0));
    const targetCurrentHp = Math.min(target.maxHp, target.currentHp + healed);
    const targetStatus: Combatant["status"] =
      targetCurrentHp > 0 ? "active" : target.status ?? "downed";
    return {
      damageTotal: 0,
      damageRolls: [],
      healed,
      healRolls,
      targetCurrentHp,
      targetStatus,
    };
  }

  if (effect.kind === "stabilize") {
    const targetCurrentHp = target.currentHp;
    const targetStatus: Combatant["status"] =
      target.currentHp === 0 ? "stable" : target.status ?? "active";
    return {
      damageTotal: 0,
      damageRolls: [],
      healed: 0,
      healRolls: [],
      targetCurrentHp,
      targetStatus,
    };
  }

  if (effect.attack) {
    const attackRoll = rolls?.attack ?? d(20, 1)[0]!;
    const critical = attackRoll === 20;
    const attackTotal = attackRoll + caster.spellAttackBonus;
    const hit = critical || attackTotal >= target.armorClass;
    const allDice = rolls?.dice ?? rollDiceNotation(effect.dice).rolls;
    const first = critical ? allDice.slice(0, Math.floor(allDice.length / 2)) : allDice;
    const second = critical ? allDice.slice(Math.floor(allDice.length / 2)) : [];
    const damageTotal = hit
      ? first.reduce((sum, r) => sum + r, 0) +
        (critical ? second.reduce((sum, r) => sum + r, 0) : 0)
      : 0;
    const applied = applyHitToTarget(target, damageTotal, critical);
    return {
      hit,
      critical,
      attackTotal,
      damageTotal,
      damageRolls: [...first, ...second],
      healed: 0,
      healRolls: [],
      targetCurrentHp: applied.currentHp,
      targetStatus: applied.status,
    };
  }

  // Saving-throw spells: Combatant carries no saving-throw modifiers, so v1 uses +0 for the target's save.
  const saveRoll = rolls?.save ?? d(20, 1)[0]!;
  const saveTotal = saveRoll;
  const hit = saveTotal < caster.spellSaveDc;
  const allDice = rolls?.dice ?? rollDiceNotation(effect.dice).rolls;
  const damageTotal = hit ? allDice.reduce((sum, r) => sum + r, 0) : 0;
  const applied = applyHitToTarget(target, damageTotal, false);
  return {
    hit,
    critical: false,
    saveDc: caster.spellSaveDc,
    saveTotal,
    damageTotal,
    damageRolls: allDice,
    healed: 0,
    healRolls: [],
    targetCurrentHp: applied.currentHp,
    targetStatus: applied.status,
  };
}
