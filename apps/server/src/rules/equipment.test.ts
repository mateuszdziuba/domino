import { describe, expect, it } from "vitest";
import {
  ATTUNEMENT_LIMIT,
  EQUIPMENT_SLOTS,
  isSlotKey,
  slotLabel,
  SRD_GEAR,
} from "./equipment.js";

describe("EQUIPMENT_SLOTS", () => {
  it("defines the ten body slots with Polish labels", () => {
    expect(EQUIPMENT_SLOTS).toEqual([
      { key: "head", label: "Głowa" },
      { key: "neck", label: "Szyja" },
      { key: "cloak", label: "Płaszcz" },
      { key: "armor", label: "Zbroja" },
      { key: "gloves", label: "Rękawice" },
      { key: "belt", label: "Pas" },
      { key: "ring", label: "Pierścień" },
      { key: "weapon", label: "Broń" },
      { key: "shield", label: "Tarcza" },
      { key: "boots", label: "Buty" },
    ]);
  });

  it("isSlotKey accepts known slots and rejects unknown ones", () => {
    expect(isSlotKey("ring")).toBe(true);
    expect(isSlotKey("head")).toBe(true);
    expect(isSlotKey("teleport")).toBe(false);
  });

  it("slotLabel returns the Polish label for a known slot", () => {
    expect(slotLabel("ring")).toBe("Pierścień");
    expect(slotLabel("boots")).toBe("Buty");
    expect(slotLabel("teleport")).toBeUndefined();
  });
});

describe("SRD_GEAR catalog", () => {
  it("curates at least 40 SRD items", () => {
    expect(SRD_GEAR.length).toBeGreaterThanOrEqual(40);
  });

  it("marks every attunable magic item as attuned with a known body slot", () => {
    const magic = SRD_GEAR.filter(
      (g) => g.category === "magic" && !g.name.includes("Potion of Healing"),
    );
    expect(magic.length).toBeGreaterThan(0);
    for (const item of magic) {
      expect(item.attuned).toBe(true);
      expect(isSlotKey(item.slot ?? "")).toBe(true);
    }
  });

  it("gives every armor item the armor slot (shields use the shield slot)", () => {
    const armor = SRD_GEAR.filter((g) => g.category === "armor");
    expect(armor.length).toBeGreaterThan(0);
    for (const item of armor) {
      expect(item.slot).toBe(item.name === "Shield" ? "shield" : "armor");
    }
  });

  it("enforces the SRD attunement limit of three magic items", () => {
    expect(ATTUNEMENT_LIMIT).toBe(3);
  });
});

describe("SRD_GEAR healing potions", () => {
  const potions = [
    { name: "Potion of Healing", price: "50 gp", dice: "2k4+2" },
    { name: "Greater Potion of Healing", price: "150 gp", dice: "4k4+4" },
    { name: "Superior Potion of Healing", price: "450 gp", dice: "8k4+8" },
    { name: "Supreme Potion of Healing", price: "1350 gp", dice: "10k4+20" },
  ];

  it("lists all four healing potions in the magic category with no slot", () => {
    for (const p of potions) {
      const item = SRD_GEAR.find((g) => g.name === p.name);
      expect(item, p.name).toBeDefined();
      expect(item!.category).toBe("magic");
      expect(item!.slot).toBeUndefined();
      expect(item!.price).toBe(p.price);
      expect(item!.description).toContain(p.dice);
    }
  });

  it("does not mark healing potions as attuned", () => {
    for (const p of potions) {
      const item = SRD_GEAR.find((g) => g.name === p.name)!;
      expect(item.attuned).toBeFalsy();
      expect(item.weight).toBe(0.5);
    }
  });
});
