import { ABILITY_KEYS, SKILLS, type AbilityScore, type SkillName } from "@domino/shared";
import { rollD20, rollWithAdvantage, rollWithDisadvantage } from "./dice.js";

export const SKILL_TO_ABILITY: Record<SkillName, keyof AbilityScore> =
  Object.fromEntries(SKILLS.map((s) => [s.key, s.ability])) as Record<
    SkillName,
    keyof AbilityScore
  >;

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function abilityModifiers(
  abilityScores: AbilityScore,
): Record<keyof AbilityScore, number> {
  const result = {} as Record<keyof AbilityScore, number>;
  for (const key of ABILITY_KEYS) {
    result[key] = abilityModifier(abilityScores[key]);
  }
  return result;
}

export function proficiencyBonus(level: number): number {
  return Math.min(2 + Math.floor((Math.max(1, level) - 1) / 4), 6);
}

export type CheckResult = {
  total: number;
  roll: number;
  abilityModifier: number;
  proficient: boolean;
  advantage: boolean;
  disadvantage: boolean;
};

export function makeCheck(
  abilityScores: AbilityScore,
  options: {
    skill?: SkillName;
    proficient?: boolean;
    level?: number;
    advantage?: boolean;
    disadvantage?: boolean;
    bonus?: number;
    roll?: number;
  } = {},
): CheckResult {
  const ability = options.skill ? SKILL_TO_ABILITY[options.skill] : undefined;
  const mod = ability ? abilityModifier(abilityScores[ability]) : 0;
  const prof = options.proficient ? proficiencyBonus(options.level ?? 1) : 0;
  const roll =
    options.roll ??
    (options.advantage && !options.disadvantage
      ? rollWithAdvantage()
      : options.disadvantage && !options.advantage
        ? rollWithDisadvantage()
        : rollD20());
  return {
    total: roll + mod + prof + (options.bonus ?? 0),
    roll,
    abilityModifier: mod,
    proficient: prof > 0,
    advantage: Boolean(options.advantage),
    disadvantage: Boolean(options.disadvantage),
  };
}

export function savingThrowModifier(
  abilityScores: AbilityScore,
  ability: keyof AbilityScore,
  proficient: boolean,
  level = 1,
): number {
  const mod = abilityModifier(abilityScores[ability]);
  return mod + (proficient ? proficiencyBonus(level) : 0);
}
