import { describe, expect, it } from "vitest";
import { buildCharacterSheet } from "./sheet.js";
import type { Character } from "@domino/shared";

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "c1",
    userId: "u1",
    name: "Elara",
    race: "Human",
    className: "Cleric",
    level: 3,
    abilityScores: { strength: 14, dexterity: 10, constitution: 13, intelligence: 10, wisdom: 16, charisma: 12 },
    maxHp: 24,
    currentHp: 24,
    armorClass: 15,
    speed: 30,
    proficiencyBonus: 2,
    skills: { perception: true, medicine: true },
    inventory: [],
    spells: ["Cure Wounds", "Bless", "Guiding Bolt"],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("buildCharacterSheet", () => {
  it("computes ability modifiers", () => {
    const sheet = buildCharacterSheet(makeCharacter());
    expect(sheet.abilityModifiers.strength).toBe(2);
    expect(sheet.abilityModifiers.wisdom).toBe(3);
    expect(sheet.abilityModifiers.dexterity).toBe(0);
  });

  it("marks class saving throws proficient (Cleric: WIS, CHA) and uses level 3 proficiency", () => {
    const sheet = buildCharacterSheet(makeCharacter());
    const wisdom = sheet.savingThrows.find((s) => s.ability === "wisdom")!;
    const charisma = sheet.savingThrows.find((s) => s.ability === "charisma")!;
    const strength = sheet.savingThrows.find((s) => s.ability === "strength")!;
    expect(wisdom.proficient).toBe(true);
    expect(wisdom.mod).toBe(5); // WIS 3 + prof 2 (level 3)
    expect(charisma.proficient).toBe(true);
    expect(charisma.mod).toBe(3); // CHA 1 + prof 2
    expect(strength.proficient).toBe(false);
    expect(strength.mod).toBe(2);
  });

  it("adds proficiency bonus to trained skills only", () => {
    const sheet = buildCharacterSheet(makeCharacter());
    const perception = sheet.skills.find((s) => s.key === "perception")!;
    const acrobatics = sheet.skills.find((s) => s.key === "acrobatics")!;
    expect(perception.proficient).toBe(true);
    expect(perception.mod).toBe(5); // WIS 3 + prof 2
    expect(acrobatics.proficient).toBe(false);
    expect(acrobatics.mod).toBe(0); // DEX 10
  });

  it("builds melee and ranged attacks from ability modifiers", () => {
    const sheet = buildCharacterSheet(makeCharacter());
    const melee = sheet.attacks.find((a) => a.name.includes("Melee"))!;
    const ranged = sheet.attacks.find((a) => a.name.includes("Ranged"))!;
    expect(melee.hitBonus).toBe(4); // prof 2 + STR 2
    expect(melee.damageBonus).toBe(2);
    expect(ranged.hitBonus).toBe(2); // prof 2 + DEX 0
  });

  it("computes spell save DC and attack bonus for spellcasters", () => {
    const sheet = buildCharacterSheet(makeCharacter());
    expect(sheet.spellcasting).not.toBeNull();
    expect(sheet.spellcasting?.ability).toBe("wisdom");
    expect(sheet.spellcasting?.saveDc).toBe(13); // 8 + prof 2 + WIS 3
    expect(sheet.spellcasting?.attackBonus).toBe(5);
  });

  it("has no spellcasting for non-casters or characters without spells", () => {
    const fighter = buildCharacterSheet(makeCharacter({ className: "Fighter", spells: ["something"] }));
    expect(fighter.spellcasting).toBeNull();
    const noSpells = buildCharacterSheet(makeCharacter({ spells: [] }));
    expect(noSpells.spellcasting).toBeNull();
  });

  it("includes racial, class and subclass features", () => {
    const sheet = buildCharacterSheet(makeCharacter({ subclass: "Domena Życia (Life Domain)" }));
    expect(sheet.features.length).toBeGreaterThan(0);
    expect(sheet.features.some((f) => f.category === "race")).toBe(true);
    expect(sheet.features.some((f) => f.category === "class")).toBe(true);
    expect(sheet.features.some((f) => f.category === "subclass")).toBe(true);
    expect(sheet.features.some((f) => f.name.includes("Rzucanie zaklęć"))).toBe(true);
  });
});
