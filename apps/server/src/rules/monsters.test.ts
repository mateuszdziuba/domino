import { describe, expect, it } from "vitest";
import {
  MONSTERS,
  buildEncounter,
  matchMonsters,
  randomEncounter,
} from "./monsters.js";

describe("monster catalog", () => {
  it("has SRD monsters with sane stats", () => {
    expect(MONSTERS.length).toBeGreaterThanOrEqual(10);
    for (const m of MONSTERS) {
      expect(m.maxHp).toBeGreaterThan(0);
      expect(m.armorClass).toBeGreaterThan(0);
      expect(m.cr).toBeGreaterThan(0);
    }
  });

  it("gives every monster a positive attack count", () => {
    for (const m of MONSTERS) {
      expect(m.attacks, m.key).toBeGreaterThanOrEqual(1);
    }
  });

  it("grants Multiattack (2 attacks) to troll, hill giant and priest", () => {
    const byKey = new Map(MONSTERS.map((m) => [m.key, m]));
    expect(byKey.get("troll")!.attacks).toBe(2);
    expect(byKey.get("hill-giant")!.attacks).toBe(2);
    expect(byKey.get("priest")!.attacks).toBe(2);
    for (const [key, m] of byKey) {
      if (key !== "troll" && key !== "hill-giant" && key !== "priest") {
        expect(m.attacks, key).toBe(1);
      }
    }
  });

  it("goblin attacks once per turn", () => {
    const goblin = MONSTERS.find((m) => m.key === "goblin")!;
    expect(goblin.attacks).toBe(1);
  });

  it("gives every monster a traits array", () => {
    for (const m of MONSTERS) {
      expect(Array.isArray(m.traits), m.key).toBe(true);
    }
  });

  it("carries the SRD traits on the right monsters", () => {
    const byKey = new Map(MONSTERS.map((m) => [m.key, m]));
    expect(byKey.get("wolf")!.traits).toContain("pack_tactics");
    expect(byKey.get("dire-wolf")!.traits).toContain("pack_tactics");
    expect(byKey.get("zombie")!.traits).toContain("undead_fortitude");
    expect(byKey.get("troll")!.traits).toContain("regeneration");
    expect(byKey.get("ghoul")!.traits).toContain("paralyzing_touch");
    expect(byKey.get("giant-spider")!.traits).toContain("web");
    expect(byKey.get("giant-rat")!.traits).toContain("keen_smell");
    expect(byKey.get("goblin")!.traits).toContain("nimble_escape");
    for (const key of [
      "skeleton",
      "bandit",
      "cultist",
      "priest-acolyte",
      "priest",
      "hobgoblin",
      "orc",
      "worg",
      "bugbear",
      "specter",
      "ogre",
      "hill-giant",
    ]) {
      expect(byKey.get(key)!.traits, key).toEqual([]);
    }
  });

  it("carries SRD movement speeds (walk; fly noted separately)", () => {
    const byKey = new Map(MONSTERS.map((m) => [m.key, m]));
    expect(byKey.get("giant-rat")!.speed).toBe(30);
    expect(byKey.get("goblin")!.speed).toBe(30);
    expect(byKey.get("wolf")!.speed).toBe(40);
    expect(byKey.get("skeleton")!.speed).toBe(30);
    expect(byKey.get("zombie")!.speed).toBe(20);
    expect(byKey.get("bandit")!.speed).toBe(30);
    expect(byKey.get("cultist")!.speed).toBe(30);
    expect(byKey.get("priest-acolyte")!.speed).toBe(30);
    expect(byKey.get("priest")!.speed).toBe(30);
    expect(byKey.get("giant-spider")!.speed).toBe(30);
    expect(byKey.get("hobgoblin")!.speed).toBe(30);
    expect(byKey.get("orc")!.speed).toBe(30);
    expect(byKey.get("worg")!.speed).toBe(50);
    expect(byKey.get("bugbear")!.speed).toBe(30);
    expect(byKey.get("dire-wolf")!.speed).toBe(50);
    expect(byKey.get("ghoul")!.speed).toBe(30);
    expect(byKey.get("specter")!.speed).toBe(0);
    expect(byKey.get("ogre")!.speed).toBe(40);
    expect(byKey.get("troll")!.speed).toBe(30);
    expect(byKey.get("hill-giant")!.speed).toBe(40);
  });

  it("carries the SRD 5.2.1 spellcaster Priest Acolyte (spells, save DC, attack bonus)", () => {
    const priestAcolyte = MONSTERS.find((m) => m.key === "priest-acolyte")!;
    expect(priestAcolyte).toBeDefined();
    expect(priestAcolyte.name).toBe("Priest Acolyte");
    expect(priestAcolyte.cr).toBe(0.25);
    expect(priestAcolyte.maxHp).toBe(11);
    expect(priestAcolyte.armorClass).toBe(13);
    expect(priestAcolyte.attackBonus).toBe(3);
    expect(priestAcolyte.damageNotation).toBe("1d4");
    expect(priestAcolyte.damageBonus).toBe(1);
    expect(priestAcolyte.attacks).toBe(1);
    expect(priestAcolyte.spells).toEqual(["Sacred Flame", "Cure Wounds", "Guiding Bolt"]);
    expect(priestAcolyte.spellSaveDc).toBe(12);
    expect(priestAcolyte.spellAttackBonus).toBe(4);
  });

  it("has no Acolyte monster (5.2.1: Acolyte is a background, not a stat block)", () => {
    expect(MONSTERS.some((m) => m.key === "acolyte")).toBe(false);
  });

  it("carries the SRD 5.2.1 spellcaster Priest (spells, save DC, attack bonus)", () => {
    const priest = MONSTERS.find((m) => m.key === "priest")!;
    expect(priest).toBeDefined();
    expect(priest.name).toBe("Priest");
    expect(priest.cr).toBe(2);
    expect(priest.maxHp).toBe(38);
    expect(priest.armorClass).toBe(13);
    expect(priest.attackBonus).toBe(5);
    expect(priest.damageNotation).toBe("1d6");
    expect(priest.damageBonus).toBe(3);
    expect(priest.attacks).toBe(2);
    expect(priest.spells).toEqual([
      "Sacred Flame",
      "Healing Word",
      "Lesser Restoration",
      "Spirit Guardians",
    ]);
    expect(priest.spellSaveDc).toBe(12);
    expect(priest.spellAttackBonus).toBe(5);
  });

  it("matches priests and priest acolytes from temple/cleric descriptions", () => {
    const acolyte = matchMonsters("an acolyte guards the temple");
    expect(acolyte.map((m) => m.key)).toContain("priest-acolyte");
    const priest = matchMonsters("a priest of the temple preaches");
    expect(priest.map((m) => m.key)).toContain("priest");
  });

  it("builds spellcaster combatants into encounters", () => {
    const encounter = buildEncounter("a priest and acolytes of the temple", 4);
    const keys = new Set(
      encounter.map((e) => MONSTERS.find((m) => e.id.startsWith(`${m.key}-`))?.key),
    );
    expect(keys.has("priest")).toBe(true);
    expect(keys.has("priest-acolyte")).toBe(true);
  });
});

describe("matchMonsters", () => {
  it("matches goblins from a cave ambush description", () => {
    const matches = matchMonsters("goblins ambush the party in a cave");
    expect(matches[0]?.key).toBe("goblin");
  });

  it("matches skeletons and zombies in a crypt", () => {
    const matches = matchMonsters("the crypt is full of skeletons and zombies");
    expect(matches[0]?.key).toBe("skeleton");
    expect(matches.map((m) => m.key)).toContain("zombie");
  });

  it("falls back to a monster when nothing matches", () => {
    const matches = matchMonsters("a strange purple cloud appears");
    expect(matches).toHaveLength(1);
    expect(MONSTERS.some((m) => m.key === matches[0]?.key)).toBe(true);
  });

  it("matches Polish plural monster words", () => {
    const goblins = matchMonsters("gobliny");
    expect(goblins.map((m) => m.key)).toContain("goblin");

    const rats = matchMonsters("szczury w piwnicy");
    expect(rats.map((m) => m.key)).toContain("giant-rat");

    const wolves = matchMonsters("wilki w lesie");
    expect(wolves.map((m) => m.key)).toContain("wolf");

    const orcs = matchMonsters("orki");
    expect(orcs.map((m) => m.key)).toContain("orc");
  });

  it("matches Polish monster words with diacritics", () => {
    const spider = matchMonsters("pająk w sieci");
    expect(spider.map((m) => m.key)).toContain("giant-spider");

    const bandits = matchMonsters("złodziej na drodze");
    expect(bandits.map((m) => m.key)).toContain("bandit");
  });
});

describe("buildEncounter", () => {
  it("scales goblin count to party size", () => {
    const encounter = buildEncounter("goblins in a cave", 4);
    const goblins = encounter.filter((g) => g.name === "Goblin");
    expect(goblins.length).toBe(8); // budget 2 / cr 0.25, capped at 8
  });

  it("gives at least one monster for a tiny party", () => {
    const encounter = buildEncounter("a troll blocks the bridge", 1);
    expect(encounter.length).toBeGreaterThanOrEqual(1);
  });

  it("produces unique ids and valid combatant entries", () => {
    const encounter = buildEncounter("skeleton and zombie horde", 4);
    const ids = new Set(encounter.map((e) => e.id));
    expect(ids.size).toBe(encounter.length);
    for (const e of encounter) {
      expect(e.isPlayer).toBe(false);
      expect(e.maxHp).toBeGreaterThan(0);
    }
  });

  it("carries the monster traits onto the combatants", () => {
    const encounter = buildEncounter("a troll blocks the bridge", 1);
    expect(encounter[0]!.traits).toContain("regeneration");
  });

  it("carries the monster speed onto the combatants (default 30)", () => {
    const encounter = buildEncounter("a dire wolf stalks the party", 1);
    const direWolf = encounter.find((e) => e.name === "Dire Wolf")!;
    expect(direWolf.speed).toBe(50);
    expect(buildEncounter("a goblin tribe", 1)[0]!.speed).toBe(30);
  });
});

describe("randomEncounter", () => {
  it("returns at least one monster within the CR budget", () => {
    const encounter = randomEncounter(3, 4);
    expect(encounter.length).toBeGreaterThanOrEqual(1);
    expect(encounter.length).toBeLessThanOrEqual(6);
    const totalCr = encounter.reduce((sum, e) => sum + (e.cr ?? 0), 0);
    const budget = Math.max(1, Math.ceil((3 * 4) / 4));
    expect(totalCr).toBeLessThanOrEqual(budget * 2);
    for (const e of encounter) {
      expect(e.isPlayer).toBe(false);
      expect(e.maxHp).toBeGreaterThan(0);
    }
  });

  it("respects the terrain filter or falls back to the whole catalog", () => {
    const encounter = randomEncounter(3, 4, "cave");
    expect(encounter.length).toBeGreaterThanOrEqual(1);
    const caveKinds = MONSTERS.filter((m) => m.tags.includes("cave"));
    if (caveKinds.length > 0) {
      const keys = new Set(caveKinds.map((m) => m.key));
      for (const e of encounter) {
        const kind = MONSTERS.find((m) => e.id.startsWith(`${m.key}-`));
        expect(kind, e.id).toBeDefined();
        expect(keys.has(kind!.key), e.id).toBe(true);
      }
    }
  });

  it("stays under the budget for a high-level party too", () => {
    const encounter = randomEncounter(5, 4);
    const totalCr = encounter.reduce((sum, e) => sum + (e.cr ?? 0), 0);
    const budget = Math.max(1, Math.ceil((5 * 4) / 4));
    expect(totalCr).toBeLessThanOrEqual(budget * 2);
    expect(encounter.length).toBeLessThanOrEqual(6);
  });

  it("is deterministic with Math.random stubbed", () => {
    const original = Math.random;
    Math.random = () => 0.5;
    const first = randomEncounter(2, 3);
    const second = randomEncounter(2, 3);
    Math.random = original;
    expect(first).toEqual(second);
  });
});
