import { abilityModifier, proficiencyBonus } from "./abilities.js";

export const XP_BY_CR: Record<number, number> = {
  0: 10,
  0.125: 25,
  0.25: 50,
  0.5: 100,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900,
  9: 5000,
  10: 5900,
};

export function xpForCr(cr: number): number {
  return XP_BY_CR[cr] ?? 200;
}

export const XP_BY_LEVEL: number[] = [
  300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000,
  140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export function levelForXp(xp: number): number {
  let level = 1;
  for (const threshold of XP_BY_LEVEL) {
    if (xp < threshold) break;
    level += 1;
  }
  return Math.min(level, 20);
}

const HIT_DIE_BY_CLASS: Record<string, number> = {
  Barbarian: 12,
  Fighter: 10,
  Paladin: 10,
  Ranger: 10,
  Bard: 8,
  Cleric: 8,
  Druid: 8,
  Monk: 8,
  Rogue: 8,
  Warlock: 8,
  Sorcerer: 6,
  Wizard: 6,
};

export function hitDieForClass(className: string): number {
  return HIT_DIE_BY_CLASS[className] ?? 8;
}

export function maxHpIncrement(className: string, constitutionModifier: number): number {
  return Math.ceil((hitDieForClass(className) + 1) / 2) + constitutionModifier;
}

export function maxHpForLevel(
  className: string,
  level: number,
  constitutionModifier: number,
): number {
  return (
    hitDieForClass(className) +
    constitutionModifier +
    (level - 1) * maxHpIncrement(className, constitutionModifier)
  );
}

export function xpAwardForDeadEnemies(
  combatants: { cr?: number; status?: string }[],
): number {
  return combatants.reduce(
    (sum, combatant) =>
      combatant.status === "dead" && combatant.cr !== undefined
        ? sum + xpForCr(combatant.cr)
        : sum,
    0,
  );
}

export type LevelUpInput = {
  xp?: number;
  level: number;
  className: string;
  constitution: number;
};

export function applyLevelUp(character: LevelUpInput): {
  leveledUp: boolean;
  newLevel: number;
  maxHpDelta: number;
  newProficiency: number;
  newXp: number;
} {
  const newXp = character.xp ?? 0;
  const newLevel = levelForXp(newXp);
  if (newLevel <= character.level) {
    return {
      leveledUp: false,
      newLevel: character.level,
      maxHpDelta: 0,
      newProficiency: proficiencyBonus(character.level),
      newXp,
    };
  }
  return {
    leveledUp: true,
    newLevel,
    maxHpDelta:
      (newLevel - character.level) *
      maxHpIncrement(character.className, abilityModifier(character.constitution)),
    newProficiency: proficiencyBonus(newLevel),
    newXp,
  };
}
