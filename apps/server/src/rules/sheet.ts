import {
  ABILITY_KEYS,
  SKILLS,
  savingThrowProficiencies,
  spellcastingAbility,
  type AbilityScore,
  type Character,
  type CharacterSheet,
  type SheetAttack,
} from "@domino/shared";
import { abilityModifier, proficiencyBonus } from "./abilities.js";
import { buildCharacterFeatures } from "./features.js";
import { spellSlotsForLevel } from "./spells.js";
import { findEquippedWeapon, weaponAttackStats } from "./weapons.js";
import { martialArtsDie } from "./combat.js";

export function buildCharacterSheet(character: Character): CharacterSheet {
  const level = Math.max(1, character.level);
  const prof = proficiencyBonus(level);
  const classSaves = savingThrowProficiencies(character.className);
  const castingAbility = spellcastingAbility(character.className);
  const knownSkills = character.skills ?? {};

  const abilityModifiers = {} as Record<keyof AbilityScore, number>;
  for (const key of ABILITY_KEYS) {
    abilityModifiers[key] = abilityModifier(character.abilityScores[key]);
  }

  const savingThrows = ABILITY_KEYS.map((ability) => {
    const proficient = classSaves.includes(ability);
    return {
      ability,
      proficient,
      mod: abilityModifiers[ability] + (proficient ? prof : 0),
    };
  });

  const skills = SKILLS.map((skill) => {
    const proficient = Boolean(knownSkills[skill.key]);
    return {
      key: skill.key,
      label: skill.label,
      ability: skill.ability,
      proficient,
      mod: abilityModifiers[skill.ability] + (proficient ? prof : 0),
    };
  });

  const strengthMod = abilityModifiers.strength;
  const dexterityMod = abilityModifiers.dexterity;

  const equippedWeapon = findEquippedWeapon(character);
  const attacks: SheetAttack[] = equippedWeapon
    ? [{ name: equippedWeapon.name, ...weaponAttackStats(equippedWeapon, character) }]
    : character.className === "Monk"
      ? [
          {
            name: "Atak bez broni (Zręczność)",
            hitBonus: prof + dexterityMod,
            damageNotation: martialArtsDie(character.level),
            damageBonus: dexterityMod,
            ability: "dexterity",
          },
        ]
      : [
          {
            name: "Melee (Strength)",
            hitBonus: prof + strengthMod,
            damageNotation: "1d8",
            damageBonus: strengthMod,
            ability: "strength",
          },
          {
            name: "Ranged (Dexterity)",
            hitBonus: prof + dexterityMod,
            damageNotation: "1d6",
            damageBonus: dexterityMod,
            ability: "dexterity",
          },
        ];

  const hasSpells = (character.spells?.length ?? 0) > 0;
  const spellcasting = hasSpells && castingAbility
    ? {
        ability: castingAbility,
        saveDc: 8 + prof + abilityModifiers[castingAbility],
        attackBonus: prof + abilityModifiers[castingAbility],
      }
    : null;

  return {
    character,
    abilityModifiers,
    savingThrows,
    skills,
    attacks,
    spellcasting,
    spellSlots: spellSlotsForLevel(character.level)
      .map((max, i) => ({
        level: i + 1,
        used: (character.spellSlotsUsed ?? [])[i] ?? 0,
        max,
      }))
      .filter((s) => s.max > 0),
    features: buildCharacterFeatures({ ...character, background: character.background }),
  };
}
