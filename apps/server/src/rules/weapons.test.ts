import { describe, expect, it } from "vitest";
import { WEAPONS, findWeapon, weaponAttackStats } from "./weapons.js";

function statsCharacter(strength: number, dexterity: number, proficiencyBonus = 2) {
  return { abilityScores: { strength, dexterity }, proficiencyBonus };
}

describe("weapon catalog", () => {
  it("contains at least 30 SRD weapons", () => {
    expect(WEAPONS.length).toBeGreaterThanOrEqual(30);
  });

  it("every entry has a name, Polish label, damage dice, damage type and properties", () => {
    for (const weapon of WEAPONS) {
      expect(weapon.name.length).toBeGreaterThan(0);
      expect(weapon.label.length).toBeGreaterThan(0);
      expect(weapon.damageDice).toMatch(/^\d+(?:d\d+)?$/);
      expect(["slashing", "piercing", "bludgeoning"]).toContain(weapon.damageType);
      expect(Array.isArray(weapon.properties)).toBe(true);
    }
  });

  it("lists all simple melee weapons with SRD stats", () => {
    const byName = new Map(WEAPONS.map((w) => [w.name, w]));
    expect(byName.get("Club")).toMatchObject({ category: "simple", range: "melee", damageDice: "1d4", damageType: "bludgeoning", properties: ["light"] });
    expect(byName.get("Dagger")).toMatchObject({ damageDice: "1d4", properties: ["finesse", "light", "thrown"] });
    expect(byName.get("Greatclub")).toMatchObject({ damageDice: "1d8", properties: ["two-handed"] });
    expect(byName.get("Handaxe")).toMatchObject({ damageDice: "1d6", properties: ["light", "thrown"] });
    expect(byName.get("Javelin")).toMatchObject({ damageDice: "1d6", properties: ["thrown"] });
    expect(byName.get("Light Hammer")).toMatchObject({ damageDice: "1d4", properties: ["light", "thrown"] });
    expect(byName.get("Mace")).toMatchObject({ damageDice: "1d6", properties: [] });
    expect(byName.get("Quarterstaff")).toMatchObject({ damageDice: "1d6", properties: ["versatile"], versatileDice: "1d8" });
    expect(byName.get("Sickle")).toMatchObject({ damageDice: "1d4", properties: ["light"] });
    expect(byName.get("Spear")).toMatchObject({ damageDice: "1d6", properties: ["thrown", "versatile"], versatileDice: "1d8" });
  });

  it("lists all simple ranged weapons with SRD stats", () => {
    const byName = new Map(WEAPONS.map((w) => [w.name, w]));
    expect(byName.get("Light Crossbow")).toMatchObject({ category: "simple", range: "ranged", damageDice: "1d8", properties: ["ammunition", "loading", "two-handed"] });
    expect(byName.get("Dart")).toMatchObject({ damageDice: "1d4", properties: ["finesse", "thrown"] });
    expect(byName.get("Shortbow")).toMatchObject({ damageDice: "1d6", properties: ["ammunition", "two-handed"] });
    expect(byName.get("Sling")).toMatchObject({ damageDice: "1d4", properties: ["ammunition"] });
  });

  it("lists all martial weapons with SRD stats", () => {
    const byName = new Map(WEAPONS.map((w) => [w.name, w]));
    expect(byName.get("Battleaxe")).toMatchObject({ category: "martial", range: "melee", damageDice: "1d8", properties: ["versatile"], versatileDice: "1d10" });
    expect(byName.get("Flail")).toMatchObject({ damageDice: "1d8", properties: [] });
    expect(byName.get("Glaive")).toMatchObject({ damageDice: "1d10", properties: ["heavy", "reach", "two-handed"] });
    expect(byName.get("Greataxe")).toMatchObject({ damageDice: "1d12", properties: ["heavy", "two-handed"] });
    expect(byName.get("Greatsword")).toMatchObject({ damageDice: "2d6", properties: ["heavy", "two-handed"] });
    expect(byName.get("Halberd")).toMatchObject({ damageDice: "1d10", properties: ["heavy", "reach", "two-handed"] });
    expect(byName.get("Lance")).toMatchObject({ damageDice: "1d10", properties: ["reach", "special"] });
    expect(byName.get("Longsword")).toMatchObject({ damageDice: "1d8", properties: ["versatile"], versatileDice: "1d10", label: "Miecz długi" });
    expect(byName.get("Maul")).toMatchObject({ damageDice: "2d6", properties: ["heavy", "two-handed"] });
    expect(byName.get("Morningstar")).toMatchObject({ damageDice: "1d8", properties: [] });
    expect(byName.get("Pike")).toMatchObject({ damageDice: "1d10", properties: ["heavy", "reach", "two-handed"] });
    expect(byName.get("Rapier")).toMatchObject({ damageDice: "1d8", properties: ["finesse"] });
    expect(byName.get("Scimitar")).toMatchObject({ damageDice: "1d6", properties: ["finesse", "light"] });
    expect(byName.get("Shortsword")).toMatchObject({ damageDice: "1d6", properties: ["finesse", "light"] });
    expect(byName.get("Trident")).toMatchObject({ damageDice: "1d6", properties: ["thrown", "versatile"], versatileDice: "1d8" });
    expect(byName.get("War Pick")).toMatchObject({ damageDice: "1d8", properties: [] });
    expect(byName.get("Warhammer")).toMatchObject({ damageDice: "1d8", properties: ["versatile"], versatileDice: "1d10" });
    expect(byName.get("Whip")).toMatchObject({ damageDice: "1d4", properties: ["finesse", "reach"] });
    expect(byName.get("Blowgun")).toMatchObject({ category: "martial", range: "ranged", damageDice: "1", properties: ["ammunition", "loading"] });
    expect(byName.get("Hand Crossbow")).toMatchObject({ damageDice: "1d6", properties: ["ammunition", "light", "loading"] });
    expect(byName.get("Heavy Crossbow")).toMatchObject({ damageDice: "1d10", properties: ["ammunition", "heavy", "loading", "two-handed"] });
    expect(byName.get("Longbow")).toMatchObject({ damageDice: "1d8", properties: ["ammunition", "heavy", "two-handed"] });
  });
});

describe("weapon masteries (SRD 5.2.1)", () => {
  const MASTERIES = [
    "cleave",
    "graze",
    "hamstring",
    "nick",
    "push",
    "sap",
    "slow",
    "topple",
    "vex",
  ];

  it("assigns the SRD mastery to each melee weapon", () => {
    const byName = new Map(WEAPONS.map((w) => [w.name, w.mastery]));
    expect(byName.get("Dagger")).toBe("nick");
    expect(byName.get("Handaxe")).toBe("vex");
    expect(byName.get("Javelin")).toBe("slow");
    expect(byName.get("Light Hammer")).toBe("push");
    expect(byName.get("Mace")).toBe("sap");
    expect(byName.get("Quarterstaff")).toBe("topple");
    expect(byName.get("Sickle")).toBe("nick");
    expect(byName.get("Spear")).toBe("sap");
    expect(byName.get("Club")).toBe("slow");
    expect(byName.get("Greatclub")).toBe("push");
    expect(byName.get("Battleaxe")).toBe("topple");
    expect(byName.get("Flail")).toBe("sap");
    expect(byName.get("Glaive")).toBe("cleave");
    expect(byName.get("Greataxe")).toBe("cleave");
    expect(byName.get("Greatsword")).toBe("graze");
    expect(byName.get("Halberd")).toBe("cleave");
    expect(byName.get("Lance")).toBe("topple");
    expect(byName.get("Longsword")).toBe("sap");
    expect(byName.get("Maul")).toBe("topple");
    expect(byName.get("Morningstar")).toBe("slow");
    expect(byName.get("Pike")).toBe("push");
    expect(byName.get("Rapier")).toBe("vex");
    expect(byName.get("Scimitar")).toBe("nick");
    expect(byName.get("Shortsword")).toBe("vex");
    expect(byName.get("Trident")).toBe("topple");
    expect(byName.get("War Pick")).toBe("slow");
    expect(byName.get("Warhammer")).toBe("push");
    expect(byName.get("Whip")).toBe("slow");
  });

  it("covers every melee weapon with a known mastery", () => {
    for (const weapon of WEAPONS.filter((w) => w.range === "melee")) {
      expect(MASTERIES, weapon.name).toContain(weapon.mastery);
    }
  });

  it("leaves ranged weapons (crossbows, bows, sling, dart, blowgun) without mastery", () => {
    for (const weapon of WEAPONS.filter((w) => w.range === "ranged")) {
      expect(weapon.mastery, weapon.name).toBeUndefined();
    }
  });
});

describe("findWeapon", () => {
  it("matches the SRD English name case-insensitively", () => {
    expect(findWeapon("Longsword")?.name).toBe("Longsword");
    expect(findWeapon("longsword")?.name).toBe("Longsword");
    expect(findWeapon("light crossbow")?.name).toBe("Light Crossbow");
  });

  it("matches the Polish label", () => {
    expect(findWeapon("Miecz długi")?.name).toBe("Longsword");
    expect(findWeapon("miecz długi")?.name).toBe("Longsword");
    expect(findWeapon("Sztylet")?.name).toBe("Dagger");
  });

  it("returns undefined for an unknown weapon", () => {
    expect(findWeapon("Excalibur")).toBeUndefined();
  });
});

describe("weaponAttackStats", () => {
  it("uses DEX for a finesse weapon when DEX is higher", () => {
    const stats = weaponAttackStats(
      findWeapon("Rapier")!,
      statsCharacter(8, 16),
    );
    expect(stats).toEqual({
      hitBonus: 5, // prof 2 + DEX 3
      damageNotation: "1d8",
      damageBonus: 3,
      ability: "dexterity",
    });
  });

  it("uses STR for a finesse weapon when STR is higher", () => {
    const stats = weaponAttackStats(
      findWeapon("Rapier")!,
      statsCharacter(18, 12),
    );
    expect(stats.ability).toBe("strength");
    expect(stats.hitBonus).toBe(6); // prof 2 + STR 4
    expect(stats.damageBonus).toBe(4);
  });

  it("uses STR for a plain melee weapon", () => {
    const stats = weaponAttackStats(
      findWeapon("Longsword")!,
      statsCharacter(14, 10),
    );
    expect(stats).toEqual({
      hitBonus: 4, // prof 2 + STR 2
      damageNotation: "1d10", // versatile two-handed
      damageBonus: 2,
      ability: "strength",
    });
  });

  it("uses DEX for a ranged weapon", () => {
    const stats = weaponAttackStats(
      findWeapon("Shortbow")!,
      statsCharacter(14, 12),
    );
    expect(stats).toEqual({
      hitBonus: 3, // prof 2 + DEX 1
      damageNotation: "1d6",
      damageBonus: 1,
      ability: "dexterity",
    });
  });

  it("uses STR for a thrown melee weapon without finesse (Javelin)", () => {
    const stats = weaponAttackStats(
      findWeapon("Javelin")!,
      statsCharacter(16, 14),
    );
    expect(stats).toEqual({
      hitBonus: 5, // prof 2 + STR 3
      damageNotation: "1d6",
      damageBonus: 3,
      ability: "strength",
    });
  });

  it("uses the higher of STR and DEX for a thrown finesse weapon (Dagger)", () => {
    const stats = weaponAttackStats(
      findWeapon("Dagger")!,
      statsCharacter(8, 16),
    );
    expect(stats.ability).toBe("dexterity");
    expect(stats.damageBonus).toBe(3);
  });

  it("uses the versatile die for versatile weapons", () => {
    expect(weaponAttackStats(findWeapon("Longsword")!, statsCharacter(14, 10)).damageNotation).toBe("1d10");
    expect(weaponAttackStats(findWeapon("Battleaxe")!, statsCharacter(14, 10)).damageNotation).toBe("1d10");
  });
});
