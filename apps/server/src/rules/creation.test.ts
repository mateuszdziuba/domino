import { describe, expect, it } from "vitest";
import { abilityModifier } from "./abilities.js";
import {
  ARMOR_AC,
  POINT_BUY_COST,
  POINT_BUY_TOTAL,
  RACE_SPEED,
  STARTING_EQUIPMENT,
  computeArmorClass,
  pointBuyCost,
} from "./creation.js";
import { SRD_GEAR } from "./equipment.js";

describe("RACE_SPEED", () => {
  it("matches the SRD base speeds for the supported races", () => {
    expect(RACE_SPEED).toEqual({
      Human: 30,
      Elf: 30,
      Dwarf: 25,
      Halfling: 25,
      Gnome: 30,
      Dragonborn: 30,
      Orc: 30,
      Tiefling: 30,
    });
  });
});

describe("ARMOR_AC", () => {
  it("matches the SRD armor values with their dexterity caps", () => {
    expect(ARMOR_AC).toEqual({
      Leather: { base: 11, dexCap: null },
      "Studded Leather": { base: 12, dexCap: null },
      "Chain Shirt": { base: 13, dexCap: 2 },
      "Scale Mail": { base: 14, dexCap: 2 },
      Breastplate: { base: 14, dexCap: 2 },
      "Half Plate": { base: 15, dexCap: 2 },
      "Ring Mail": { base: 14, dexCap: 0 },
      "Chain Mail": { base: 16, dexCap: 0 },
      Splint: { base: 17, dexCap: 0 },
      Plate: { base: 18, dexCap: 0 },
    });
  });

  it("every armor name exists in the SRD_GEAR catalog", () => {
    for (const name of Object.keys(ARMOR_AC)) {
      expect(SRD_GEAR.some((g) => g.name === name), name).toBe(true);
    }
  });
});

describe("computeArmorClass", () => {
  it("armored characters use the armor base plus the capped dexterity modifier", () => {
    expect(
      computeArmorClass({
        dexterityMod: abilityModifier(14),
        equippedArmor: "Chain Mail",
        shield: true,
        className: "Fighter",
        abilityScores: { constitution: 14, wisdom: 10 },
      }),
    ).toBe(18);
  });

  it("light armor adds the full dexterity modifier", () => {
    expect(
      computeArmorClass({
        dexterityMod: abilityModifier(16),
        equippedArmor: "Leather",
        shield: false,
        className: "Rogue",
        abilityScores: { constitution: 10, wisdom: 10 },
      }),
    ).toBe(14);
  });

  it("medium armor caps the dexterity modifier at 2", () => {
    expect(
      computeArmorClass({
        dexterityMod: abilityModifier(12),
        equippedArmor: "Scale Mail",
        shield: false,
        className: "Cleric",
        abilityScores: { constitution: 10, wisdom: 10 },
      }),
    ).toBe(15);
  });

  it("a Barbarian without armor uses Unarmored Defense with Constitution", () => {
    expect(
      computeArmorClass({
        dexterityMod: abilityModifier(14),
        shield: false,
        className: "Barbarian",
        abilityScores: { constitution: 16, wisdom: 10 },
      }),
    ).toBe(15);
  });

  it("a Monk without armor uses Unarmored Defense with Wisdom", () => {
    expect(
      computeArmorClass({
        dexterityMod: abilityModifier(14),
        shield: false,
        className: "Monk",
        abilityScores: { constitution: 10, wisdom: 16 },
      }),
    ).toBe(15);
  });

  it("an unarmored character without a special defense uses 10 + DEX", () => {
    expect(
      computeArmorClass({
        dexterityMod: abilityModifier(10),
        shield: false,
        className: "Wizard",
        abilityScores: { constitution: 10, wisdom: 10 },
      }),
    ).toBe(10);
  });
});

describe("STARTING_EQUIPMENT", () => {
  it("defines a starting set for every class", () => {
    for (const className of [
      "Barbarian",
      "Bard",
      "Cleric",
      "Druid",
      "Fighter",
      "Monk",
      "Paladin",
      "Ranger",
      "Rogue",
      "Sorcerer",
      "Warlock",
      "Wizard",
    ]) {
      const set = STARTING_EQUIPMENT[className]!;
      expect(set, className).toBeDefined();
      expect(set.items.length, className).toBeGreaterThan(0);
    }
  });

  it("every starting item name exists in the SRD_GEAR catalog", () => {
    for (const set of Object.values(STARTING_EQUIPMENT)) {
      for (const item of set.items) {
        expect(SRD_GEAR.some((g) => g.name === item.name), item.name).toBe(true);
      }
    }
  });

  it("gives the Cleric Scale Mail, a Shield and a Mace with proper slots", () => {
    const cleric = STARTING_EQUIPMENT.Cleric!;
    expect(cleric.items).toContainEqual({ name: "Scale Mail", slot: "armor" });
    expect(cleric.items).toContainEqual({ name: "Shield", slot: "shield" });
    expect(cleric.items).toContainEqual({ name: "Mace", slot: "weapon" });
  });

  it("marks the primary weapon slot and offhand for the second light weapon", () => {
    expect(STARTING_EQUIPMENT.Barbarian!.items).toContainEqual({
      name: "Greataxe",
      slot: "weapon",
    });
    expect(STARTING_EQUIPMENT.Barbarian!.items).toContainEqual({
      name: "Handaxe",
      quantity: 2,
      slot: "offhand",
    });
    expect(STARTING_EQUIPMENT.Wizard!.items).toContainEqual({
      name: "Quarterstaff",
      slot: "weapon",
    });
    expect(STARTING_EQUIPMENT.Wizard!.items).toContainEqual({
      name: "Dagger",
      slot: "offhand",
    });
  });
});

describe("point buy (SRD 5.2.1)", () => {
  it("maps each score 8-15 to its point cost", () => {
    expect(POINT_BUY_COST).toEqual({
      8: 0,
      9: 1,
      10: 2,
      11: 3,
      12: 4,
      13: 5,
      14: 7,
      15: 9,
    });
    expect(POINT_BUY_TOTAL).toBe(27);
  });

  it("sums the point costs across the six abilities", () => {
    const sixOf = (score: number) => ({
      strength: score,
      dexterity: score,
      constitution: score,
      intelligence: score,
      wisdom: score,
      charisma: score,
    });
    expect(pointBuyCost(sixOf(10))).toBe(12);
    expect(
      pointBuyCost({ strength: 15, dexterity: 15, constitution: 15, intelligence: 8, wisdom: 8, charisma: 8 }),
    ).toBe(27);
    expect(
      pointBuyCost({ strength: 14, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 8, charisma: 8 }),
    ).toBe(23);
  });

  it("counts out-of-range scores as zero cost", () => {
    expect(pointBuyCost({ strength: 30, dexterity: 7, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 })).toBe(
      2 + 2 + 2 + 2,
    );
  });
});
