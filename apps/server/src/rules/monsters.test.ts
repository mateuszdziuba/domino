import { describe, expect, it } from "vitest";
import { MONSTERS, buildEncounter, matchMonsters } from "./monsters.js";

describe("monster catalog", () => {
  it("has SRD monsters with sane stats", () => {
    expect(MONSTERS.length).toBeGreaterThanOrEqual(10);
    for (const m of MONSTERS) {
      expect(m.maxHp).toBeGreaterThan(0);
      expect(m.armorClass).toBeGreaterThan(0);
      expect(m.cr).toBeGreaterThan(0);
    }
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
});
