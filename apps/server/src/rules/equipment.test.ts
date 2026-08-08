import { describe, expect, it } from "vitest";
import {
  ATTUNEMENT_LIMIT,
  EQUIPMENT_SLOTS,
  carryingCapacity,
  isEncumbered,
  isSlotKey,
  slotLabel,
  SRD_GEAR,
  totalInventoryWeight,
} from "./equipment.js";

describe("EQUIPMENT_SLOTS", () => {
  it("defines the eleven body slots with Polish labels", () => {
    expect(EQUIPMENT_SLOTS).toEqual([
      { key: "head", label: "Głowa" },
      { key: "neck", label: "Szyja" },
      { key: "cloak", label: "Płaszcz" },
      { key: "armor", label: "Zbroja" },
      { key: "gloves", label: "Rękawice" },
      { key: "belt", label: "Pas" },
      { key: "ring", label: "Pierścień" },
      { key: "weapon", label: "Broń" },
      { key: "offhand", label: "Ręka lewa" },
      { key: "shield", label: "Tarcza" },
      { key: "boots", label: "Buty" },
    ]);
  });

  it("isSlotKey accepts known slots and rejects unknown ones", () => {
    expect(isSlotKey("ring")).toBe(true);
    expect(isSlotKey("head")).toBe(true);
    expect(isSlotKey("offhand")).toBe(true);
    expect(isSlotKey("teleport")).toBe(false);
  });

  it("slotLabel returns the Polish label for a known slot", () => {
    expect(slotLabel("ring")).toBe("Pierścień");
    expect(slotLabel("boots")).toBe("Buty");
    expect(slotLabel("offhand")).toBe("Ręka lewa");
    expect(slotLabel("teleport")).toBeUndefined();
  });
});

describe("encumbrance (SRD carrying capacity)", () => {
  it("carrying capacity is STR x 15 lb", () => {
    expect(carryingCapacity(10)).toBe(150);
    expect(carryingCapacity(16)).toBe(240);
    expect(carryingCapacity(1)).toBe(15);
  });

  it("totalInventoryWeight sums weight x quantity per item", () => {
    expect(totalInventoryWeight([{ weight: 5, quantity: 2 }])).toBe(10);
    expect(
      totalInventoryWeight([
        { weight: 5, quantity: 2 },
        { weight: 1, quantity: 1 },
        { quantity: 3 },
      ]),
    ).toBe(11);
    expect(totalInventoryWeight([])).toBe(0);
  });

  it("isEncumbered is false at or below the carrying capacity", () => {
    expect(isEncumbered(10, [{ weight: 8, quantity: 1 }])).toBe(false);
    expect(isEncumbered(10, [{ weight: 150, quantity: 1 }])).toBe(false);
  });

  it("isEncumbered is true above the carrying capacity", () => {
    expect(isEncumbered(1, [{ weight: 16, quantity: 1 }])).toBe(true);
    expect(isEncumbered(10, [{ weight: 16, quantity: 10 }])).toBe(true);
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
    { name: "Potion of Healing", price: "50 gp", priceGp: 50, dice: "2k4+2" },
    { name: "Greater Potion of Healing", price: "150 gp", priceGp: 150, dice: "4k4+4" },
    { name: "Superior Potion of Healing", price: "450 gp", priceGp: 450, dice: "8k4+8" },
    { name: "Supreme Potion of Healing", price: "1350 gp", priceGp: 1350, dice: "10k4+20" },
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

  it("gives every potion its numeric priceGp", () => {
    for (const p of potions) {
      const item = SRD_GEAR.find((g) => g.name === p.name)!;
      expect(item.priceGp, p.name).toBe(p.priceGp);
    }
  });
});

describe("SRD_GEAR priceGp", () => {
  it("every catalog entry has a numeric priceGp greater than zero", () => {
    for (const item of SRD_GEAR) {
      expect(typeof item.priceGp, item.name).toBe("number");
      expect(item.priceGp!, item.name).toBeGreaterThan(0);
    }
  });

  it("parses gp, sp and cp prices from the price strings", () => {
    const byName = new Map(SRD_GEAR.map((g) => [g.name, g]));
    expect(byName.get("Leather")!.priceGp).toBe(10);
    expect(byName.get("Plate")!.priceGp).toBe(1500);
    expect(byName.get("Club")!.priceGp).toBe(0.2);
    expect(byName.get("Javelin")!.priceGp).toBe(0.5);
    expect(byName.get("Candle")!.priceGp).toBe(0.01);
    expect(byName.get("Torch")!.priceGp).toBe(0.01);
  });

  it("prices non-potion magic items at 500 gp", () => {
    const byName = new Map(SRD_GEAR.map((g) => [g.name, g]));
    for (const name of [
      "Amulet of Health",
      "Boots of Elvenkind",
      "Bracers of Defense",
      "Cloak of Protection",
      "Gauntlets of Ogre Power",
      "Headband of Intellect",
      "Ring of Protection",
      "Wand of Magic Missiles",
    ]) {
      expect(byName.get(name)!.price, name).toBe("—");
      expect(byName.get(name)!.priceGp, name).toBe(500);
    }
  });
});
