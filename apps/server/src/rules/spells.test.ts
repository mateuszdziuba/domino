import { describe, expect, it } from "vitest";
import type { Combatant } from "@domino/shared";
import { applyHitToTarget } from "./combat.js";
import {
  SPELLS,
  resolveSpellCast,
  spellSlotsForLevel,
  summarizeSpells,
  type SpellCasterStats,
} from "./spells.js";

const GUIDING_BOLT = SPELLS["Guiding Bolt"]!;
const SACRED_FLAME = SPELLS["Sacred Flame"]!;
const CURE_WOUNDS = SPELLS["Cure Wounds"]!;
const SPARE_THE_DYING = SPELLS["Spare the Dying"]!;

const casterStats: SpellCasterStats = {
  spellAttackBonus: 5,
  spellSaveDc: 13,
  spellAbilityMod: 3,
};

const noModStats: SpellCasterStats = {
  spellAttackBonus: 0,
  spellSaveDc: 10,
  spellAbilityMod: 0,
};

function target(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "enemy-1",
    name: "Goblin",
    isPlayer: false,
    initiative: 5,
    currentHp: 20,
    maxHp: 20,
    armorClass: 14,
    status: "active",
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    ...overrides,
  };
}

describe("SPELLS catalog", () => {
  it("defines the six mechanically supported SRD spells", () => {
    expect(Object.keys(SPELLS).sort()).toEqual([
      "Cure Wounds",
      "Guiding Bolt",
      "Healing Word",
      "Inflict Wounds",
      "Sacred Flame",
      "Spare the Dying",
    ]);
  });

  it("carries the required SRD fields per spell", () => {
    expect(GUIDING_BOLT).toMatchObject({
      name: "Guiding Bolt",
      level: 1,
      school: "Evocation",
      components: "V, S",
      effect: {
        kind: "damage",
        dice: "4d6",
        damageType: "radiant",
        attack: true,
        range: "120 ft",
        duration: "1 round",
        castingTime: "action",
      },
    });
    expect(SACRED_FLAME).toMatchObject({
      name: "Sacred Flame",
      level: 0,
      school: "Evocation",
      components: "V, S",
      effect: {
        kind: "damage",
        dice: "1d8",
        damageType: "radiant",
        attack: false,
        save: "dexterity",
        range: "60 ft",
        duration: "Instantaneous",
        castingTime: "action",
      },
    });
    expect(CURE_WOUNDS).toMatchObject({
      name: "Cure Wounds",
      level: 1,
      school: "Evocation",
      components: "V, S",
      effect: {
        kind: "heal",
        dice: "1d8",
        mod: true,
        range: "Touch",
        duration: "Instantaneous",
        castingTime: "action",
      },
    });
    expect(SPARE_THE_DYING).toMatchObject({
      name: "Spare the Dying",
      level: 0,
      school: "Necromancy",
      components: "V, S",
      effect: {
        kind: "stabilize",
        range: "Touch",
        duration: "Instantaneous",
        castingTime: "action",
      },
    });
  });
});

describe("spellSlotsForLevel", () => {
  it("follows the SRD Cleric slot table for 1st-5th level spells", () => {
    expect(spellSlotsForLevel(1)).toEqual([2, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(2)).toEqual([3, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(3)).toEqual([4, 2, 0, 0, 0]);
    expect(spellSlotsForLevel(4)).toEqual([4, 3, 0, 0, 0]);
    expect(spellSlotsForLevel(5)).toEqual([4, 3, 2, 0, 0]);
    expect(spellSlotsForLevel(6)).toEqual([4, 3, 3, 0, 0]);
    expect(spellSlotsForLevel(7)).toEqual([4, 3, 3, 1, 0]);
    expect(spellSlotsForLevel(8)).toEqual([4, 3, 3, 2, 0]);
    expect(spellSlotsForLevel(9)).toEqual([4, 3, 3, 3, 1]);
  });

  it("caps at the level-9 row for casters of level 10 and up", () => {
    expect(spellSlotsForLevel(10)).toEqual([4, 3, 3, 3, 1]);
    expect(spellSlotsForLevel(20)).toEqual([4, 3, 3, 3, 1]);
  });
});

describe("resolveSpellCast — attack-roll damage spells", () => {
  it("hits when the attack total meets the target AC", () => {
    const result = resolveSpellCast(GUIDING_BOLT, casterStats, target(), {
      attack: 15,
      dice: [1, 2, 3, 4],
    });
    expect(result.hit).toBe(true);
    expect(result.critical).toBe(false);
    expect(result.attackTotal).toBe(20);
    expect(result.damageTotal).toBe(10);
    expect(result.damageRolls).toEqual([1, 2, 3, 4]);
    expect(result.targetCurrentHp).toBe(10);
    expect(result.targetStatus).toBe("active");
  });

  it("misses when the attack total is below AC", () => {
    const result = resolveSpellCast(GUIDING_BOLT, casterStats, target(), {
      attack: 5,
      dice: [1, 2, 3, 4],
    });
    expect(result.hit).toBe(false);
    expect(result.attackTotal).toBe(10);
    expect(result.damageTotal).toBe(0);
    expect(result.damageRolls).toEqual([1, 2, 3, 4]);
    expect(result.targetCurrentHp).toBe(20);
    expect(result.targetStatus).toBe("active");
  });

  it("crits on a natural 20 and rolls double dice", () => {
    const result = resolveSpellCast(GUIDING_BOLT, casterStats, target(), {
      attack: 20,
      dice: [6, 6, 6, 6, 6, 6, 6, 6],
    });
    expect(result.hit).toBe(true);
    expect(result.critical).toBe(true);
    expect(result.damageTotal).toBe(48);
    expect(result.damageRolls).toHaveLength(8);
    expect(result.targetCurrentHp).toBe(0);
    expect(result.targetStatus).toBe("downed");
  });
});

describe("resolveSpellCast — saving-throw damage spells", () => {
  it("applies full damage when the target fails the save", () => {
    const result = resolveSpellCast(SACRED_FLAME, casterStats, target(), {
      save: 5,
      dice: [8],
    });
    expect(result.hit).toBe(true);
    expect(result.saveDc).toBe(13);
    expect(result.saveTotal).toBe(5);
    expect(result.damageTotal).toBe(8);
    expect(result.targetCurrentHp).toBe(12);
    expect(result.targetStatus).toBe("active");
  });

  it("deals no damage when the target succeeds on the save", () => {
    const result = resolveSpellCast(SACRED_FLAME, casterStats, target(), {
      save: 18,
      dice: [8],
    });
    expect(result.hit).toBe(false);
    expect(result.saveTotal).toBe(18);
    expect(result.damageTotal).toBe(0);
    expect(result.targetCurrentHp).toBe(20);
    expect(result.targetStatus).toBe("active");
  });
});

describe("resolveSpellCast — healing spells", () => {
  it("heals dice + spellcasting modifier", () => {
    const result = resolveSpellCast(CURE_WOUNDS, casterStats, target({ currentHp: 10 }), {
      dice: [4],
    });
    expect(result.healed).toBe(7);
    expect(result.healRolls).toEqual([4]);
    expect(result.targetCurrentHp).toBe(17);
    expect(result.targetStatus).toBe("active");
    expect(result.damageTotal).toBe(0);
    expect(result.damageRolls).toEqual([]);
  });

  it("clamps healing to max HP", () => {
    const result = resolveSpellCast(CURE_WOUNDS, casterStats, target({ currentHp: 18 }), {
      dice: [4],
    });
    expect(result.healed).toBe(7);
    expect(result.targetCurrentHp).toBe(20);
  });

  it("heals at least 1 point", () => {
    const result = resolveSpellCast(CURE_WOUNDS, noModStats, target({ currentHp: 10 }), {
      dice: [0],
    });
    expect(result.healed).toBe(1);
    expect(result.targetCurrentHp).toBe(11);
  });

  it("revives a 0-HP target to active", () => {
    const result = resolveSpellCast(
      CURE_WOUNDS,
      casterStats,
      target({ currentHp: 0, status: "downed" }),
      { dice: [4] },
    );
    expect(result.healed).toBe(7);
    expect(result.targetCurrentHp).toBe(7);
    expect(result.targetStatus).toBe("active");
  });
});

describe("resolveSpellCast — lethal damage at 0 HP", () => {
  it("adds a death-save failure when a downed target takes damage", () => {
    const downed = target({ currentHp: 0, status: "downed", maxHp: 999 });
    const result = resolveSpellCast(GUIDING_BOLT, casterStats, downed, {
      attack: 15,
      dice: [1, 1, 1, 0],
    });
    expect(result.hit).toBe(true);
    expect(result.damageTotal).toBe(3);
    expect(result.targetCurrentHp).toBe(0);
    expect(result.targetStatus).toBe("downed");
    const applied = applyHitToTarget(downed, result.damageTotal, result.critical ?? false);
    expect(applied.deathSaveFailures).toBe(1);
  });

  it("instantly kills a 0-HP target when damage reaches its max HP", () => {
    const downed = target({ currentHp: 0, status: "downed", maxHp: 10 });
    const result = resolveSpellCast(GUIDING_BOLT, casterStats, downed, {
      attack: 15,
      dice: [5, 5, 5, 5],
    });
    expect(result.damageTotal).toBe(20);
    expect(result.targetCurrentHp).toBe(0);
    expect(result.targetStatus).toBe("dead");
    const applied = applyHitToTarget(downed, result.damageTotal, false);
    expect(applied.deathSaveFailures).toBe(3);
  });
});

describe("resolveSpellCast — stabilize", () => {
  it("stabilizes a 0-HP target", () => {
    const result = resolveSpellCast(
      SPARE_THE_DYING,
      casterStats,
      target({ currentHp: 0, status: "downed" }),
    );
    expect(result.targetCurrentHp).toBe(0);
    expect(result.targetStatus).toBe("stable");
    expect(result.damageTotal).toBe(0);
    expect(result.healed).toBe(0);
    expect(result.healRolls).toEqual([]);
  });

  it("leaves a healthy target active", () => {
    const result = resolveSpellCast(SPARE_THE_DYING, casterStats, target());
    expect(result.targetCurrentHp).toBe(20);
    expect(result.targetStatus).toBe("active");
  });
});

describe("summarizeSpells", () => {
  it("returns all six known spells with the correct levels and details", () => {
    const metas = summarizeSpells();
    expect(metas).toHaveLength(6);
    const byName = Object.fromEntries(metas.map((m) => [m.name, m]));
    expect(byName["Sacred Flame"]).toMatchObject({
      level: 0,
      castingTime: "action",
      range: "60 ft",
      duration: "Instantaneous",
      effect: { kind: "damage", save: "dexterity", dice: "1d8" },
    });
    expect(byName["Spare the Dying"]).toMatchObject({
      level: 0,
      effect: { kind: "stabilize" },
    });
    expect(byName["Guiding Bolt"]).toMatchObject({
      level: 1,
      effect: { kind: "damage", attack: true, dice: "4d6", damageType: "radiant" },
    });
    expect(byName["Cure Wounds"]).toMatchObject({
      level: 1,
      effect: { kind: "heal", mod: true, dice: "1d8" },
    });
  });

  it("sorts by level then name", () => {
    expect(summarizeSpells().map((m) => m.name)).toEqual([
      "Sacred Flame",
      "Spare the Dying",
      "Cure Wounds",
      "Guiding Bolt",
      "Healing Word",
      "Inflict Wounds",
    ]);
  });

  it("includes every required field on each entry", () => {
    for (const meta of summarizeSpells()) {
      expect(meta).toMatchObject({
        name: expect.any(String),
        level: expect.any(Number),
        school: expect.any(String),
        components: expect.any(String),
        description: expect.any(String),
        castingTime: expect.any(String),
        range: expect.any(String),
        duration: expect.any(String),
        effect: { kind: expect.stringMatching(/^(damage|heal|stabilize)$/) },
      });
    }
  });

  it("gives every spell a rich Polish description", () => {
    for (const meta of summarizeSpells()) {
      expect(meta.description.length).toBeGreaterThan(30);
    }
  });

  it("describes the Guiding Bolt advantage rider and damage dice", () => {
    const guidingBolt = summarizeSpells().find((m) => m.name === "Guiding Bolt");
    expect(guidingBolt?.description).toContain("przewag");
    expect(guidingBolt?.description).toContain("4k6");
  });

  it("describes Cure Wounds healing dice", () => {
    const cureWounds = summarizeSpells().find((m) => m.name === "Cure Wounds");
    expect(cureWounds?.description).toContain("1k8");
  });
});
