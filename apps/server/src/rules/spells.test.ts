import { describe, expect, it } from "vitest";
import type { Combatant } from "@domino/shared";
import { applyHitToTarget } from "./combat.js";
import {
  SPELLS,
  resolveSpellCast,
  spellSlotsForLevel,
  summarizeSpells,
  applySpellRider,
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
  it("defines the twenty mechanically supported SRD spells", () => {
    expect(Object.keys(SPELLS).sort()).toEqual([
      "Banishment",
      "Blade Barrier",
      "Blindness/Deafness",
      "Cure Wounds",
      "Greater Restoration",
      "Guardian of Faith",
      "Guiding Bolt",
      "Heal",
      "Healing Word",
      "Hold Person",
      "Inflict Wounds",
      "Lesser Restoration",
      "Mass Heal",
      "Prayer of Healing",
      "Resurrection",
      "Revivify",
      "Sacred Flame",
      "Spare the Dying",
      "Spirit Guardians",
      "Spiritual Weapon",
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

describe("SPELLS — 2nd and 3rd level spells", () => {
  it("defines Spiritual Weapon as a 2nd-level bonus-action attack spell", () => {
    expect(SPELLS["Spiritual Weapon"]).toMatchObject({
      name: "Spiritual Weapon",
      level: 2,
      school: "Evocation",
      components: "V, S",
      effect: {
        kind: "damage",
        dice: "1d8",
        damageType: "force",
        attack: true,
        range: "60 ft",
        duration: "1 min",
        castingTime: "bonus",
      },
    });
  });

  it("defines Prayer of Healing as a 2nd-level party heal", () => {
    expect(SPELLS["Prayer of Healing"]).toMatchObject({
      name: "Prayer of Healing",
      level: 2,
      school: "Evocation",
      components: "V",
      effect: {
        kind: "heal_all",
        dice: "2d8",
        mod: true,
        range: "30 ft",
        duration: "Instantaneous",
        castingTime: "action",
      },
    });
  });

  it("defines Lesser Restoration as a 2nd-level condition remover", () => {
    expect(SPELLS["Lesser Restoration"]).toMatchObject({
      name: "Lesser Restoration",
      level: 2,
      school: "Abjuration",
      components: "V, S",
      effect: {
        kind: "condition_remove",
        range: "Touch",
        duration: "Instantaneous",
        castingTime: "action",
      },
    });
  });

  it("defines Hold Person as a 2nd-level paralyzing save spell", () => {
    expect(SPELLS["Hold Person"]).toMatchObject({
      name: "Hold Person",
      level: 2,
      school: "Enchantment",
      components: "V, S, M",
      effect: {
        kind: "condition_apply",
        condition: "paralyzed",
        save: "wisdom",
        range: "60 ft",
        duration: "1 min",
        castingTime: "action",
      },
    });
  });

  it("defines Blindness/Deafness as a 2nd-level blinding save spell", () => {
    expect(SPELLS["Blindness/Deafness"]).toMatchObject({
      name: "Blindness/Deafness",
      level: 2,
      school: "Necromancy",
      components: "V",
      effect: {
        kind: "condition_apply",
        condition: "blinded",
        save: "constitution",
        range: "30 ft",
        duration: "1 min",
        castingTime: "action",
      },
    });
  });

  it("defines Revivify as a 3rd-level revival spell", () => {
    expect(SPELLS["Revivify"]).toMatchObject({
      name: "Revivify",
      level: 3,
      school: "Necromancy",
      components: "V, S, M",
      effect: {
        kind: "revive",
        range: "Touch",
        duration: "Instantaneous",
        castingTime: "action",
      },
    });
  });

  it("gives every new spell a Polish description", () => {
    for (const name of [
      "Spiritual Weapon",
      "Prayer of Healing",
      "Lesser Restoration",
      "Hold Person",
      "Blindness/Deafness",
      "Revivify",
    ]) {
      expect(SPELLS[name]!.description.length).toBeGreaterThan(30);
    }
  });
});

describe("SPELLS — 3rd to 5th level spells", () => {
  it("defines Spirit Guardians as a 3rd-level radiant aura save spell", () => {
    expect(SPELLS["Spirit Guardians"]).toMatchObject({
      name: "Spirit Guardians",
      level: 3,
      school: "Conjuration",
      components: "V, S, M",
      effect: {
        kind: "damage",
        dice: "3d8",
        damageType: "radiant",
        attack: false,
        save: "wisdom",
        range: "Self (15 ft)",
        duration: "10 min",
        castingTime: "action",
      },
    });
  });

  it("defines Guardian of Faith as a 4th-level radiant guard save spell", () => {
    expect(SPELLS["Guardian of Faith"]).toMatchObject({
      name: "Guardian of Faith",
      level: 4,
      school: "Conjuration",
      components: "V",
      effect: {
        kind: "damage",
        dice: "4d10",
        damageType: "radiant",
        attack: false,
        save: "dexterity",
        range: "30 ft",
        duration: "8 h",
        castingTime: "action",
      },
    });
  });

  it("defines Banishment as a 4th-level banishment save spell", () => {
    expect(SPELLS["Banishment"]).toMatchObject({
      name: "Banishment",
      level: 4,
      school: "Abjuration",
      components: "V, S, M",
      effect: {
        kind: "condition_apply",
        condition: "banished",
        save: "charisma",
        range: "60 ft",
        duration: "1 min",
        castingTime: "action",
      },
    });
  });

  it("defines Greater Restoration as a 5th-level restore spell", () => {
    expect(SPELLS["Greater Restoration"]).toMatchObject({
      name: "Greater Restoration",
      level: 5,
      school: "Abjuration",
      components: "V, S, M",
      effect: {
        kind: "restore",
        range: "Touch",
        duration: "Instantaneous",
        castingTime: "action",
      },
    });
  });

  it("gives every new higher-level spell a Polish description", () => {
    for (const name of [
      "Spirit Guardians",
      "Guardian of Faith",
      "Banishment",
      "Greater Restoration",
    ]) {
      expect(SPELLS[name]!.description.length).toBeGreaterThan(30);
    }
  });
});

describe("SPELLS — 6th to 9th level spells", () => {
  it("defines Heal as a 6th-level flat 70 heal", () => {
    expect(SPELLS["Heal"]).toMatchObject({
      name: "Heal",
      level: 6,
      school: "Evocation",
      components: "V, S",
      effect: {
        kind: "heal",
        dice: "1d1",
        mod: false,
        range: "60 ft",
        duration: "Instantaneous",
        castingTime: "action",
        flat: 70,
      },
    });
  });

  it("defines Blade Barrier as a 6th-level slashing wall", () => {
    expect(SPELLS["Blade Barrier"]).toMatchObject({
      name: "Blade Barrier",
      level: 6,
      school: "Evocation",
      components: "V, S",
      effect: {
        kind: "damage",
        dice: "6d10",
        damageType: "slashing",
        attack: false,
        save: "dexterity",
        range: "90 ft",
        duration: "10 min",
        castingTime: "action",
      },
    });
  });

  it("defines Resurrection as a 7th-level full-HP revive", () => {
    expect(SPELLS["Resurrection"]).toMatchObject({
      name: "Resurrection",
      level: 7,
      school: "Necromancy",
      components: "V, S, M",
      effect: {
        kind: "revive",
        range: "Touch",
        duration: "Instantaneous",
        castingTime: "action",
        fullHp: true,
      },
    });
  });

  it("defines Mass Heal as a 9th-level flat party heal", () => {
    expect(SPELLS["Mass Heal"]).toMatchObject({
      name: "Mass Heal",
      level: 9,
      school: "Evocation",
      components: "V, S",
      effect: {
        kind: "heal_all",
        dice: "1d1",
        mod: false,
        range: "60 ft",
        duration: "Instantaneous",
        castingTime: "action",
        flat: 700,
      },
    });
  });

  it("gives every new top-level spell a Polish description", () => {
    for (const name of ["Heal", "Blade Barrier", "Resurrection", "Mass Heal"]) {
      expect(SPELLS[name]!.description.length).toBeGreaterThan(30);
    }
  });
});

describe("SPELLS — concentration", () => {
  const CONCENTRATION_SPELLS = [
    "Spirit Guardians",
    "Hold Person",
    "Blindness/Deafness",
    "Banishment",
    "Blade Barrier",
  ];

  it("marks the five SRD concentration spells", () => {
    for (const name of CONCENTRATION_SPELLS) {
      expect(
        "concentration" in SPELLS[name]!.effect ? SPELLS[name]!.effect.concentration : undefined,
      ).toBe(true);
    }
  });

  it("leaves every other spell without a concentration flag", () => {
    for (const [name, def] of Object.entries(SPELLS)) {
      if (CONCENTRATION_SPELLS.includes(name)) continue;
      expect("concentration" in def.effect ? def.effect.concentration : undefined, name).toBeUndefined();
    }
  });
});

describe("spellSlotsForLevel", () => {
  it("follows the SRD Cleric slot table for 1st-9th level spells", () => {
    expect(spellSlotsForLevel(1)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(2)).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(3)).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(4)).toEqual([4, 3, 0, 0, 0, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(5)).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(6)).toEqual([4, 3, 3, 0, 0, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(7)).toEqual([4, 3, 3, 1, 0, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(8)).toEqual([4, 3, 3, 2, 0, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(9)).toEqual([4, 3, 3, 3, 1, 0, 0, 0, 0]);
    expect(spellSlotsForLevel(11)).toEqual([4, 3, 3, 3, 2, 1, 0, 0, 0]);
    expect(spellSlotsForLevel(13)).toEqual([4, 3, 3, 3, 2, 1, 1, 0, 0]);
    expect(spellSlotsForLevel(17)).toEqual([4, 3, 3, 3, 2, 1, 1, 1, 1]);
  });

  it("caps at the level-17 row for casters of level 18 and up", () => {
    expect(spellSlotsForLevel(18)).toEqual([4, 3, 3, 3, 2, 1, 1, 1, 1]);
    expect(spellSlotsForLevel(20)).toEqual([4, 3, 3, 3, 2, 1, 1, 1, 1]);
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

  it("uses the higher die on an attack roll with advantage", () => {
    const result = resolveSpellCast(GUIDING_BOLT, casterStats, target(), {
      attack: 5,
      attackSecond: 18,
      advantage: true,
      dice: [1, 2, 3, 4],
    });
    expect(result.attackRolls).toEqual([5, 18]);
    expect(result.attackTotal).toBe(23);
    expect(result.hit).toBe(true);
  });

  it("uses the lower die on an attack roll with disadvantage", () => {
    const result = resolveSpellCast(GUIDING_BOLT, casterStats, target(), {
      attack: 18,
      attackSecond: 5,
      disadvantage: true,
      dice: [1, 2, 3, 4],
    });
    expect(result.attackRolls).toEqual([18, 5]);
    expect(result.attackTotal).toBe(10);
    expect(result.hit).toBe(false);
  });

  it("treats both advantage and disadvantage as a normal roll", () => {
    const result = resolveSpellCast(GUIDING_BOLT, casterStats, target(), {
      attack: 15,
      attackSecond: 3,
      advantage: true,
      disadvantage: true,
      dice: [1, 2, 3, 4],
    });
    expect(result.attackRolls).toEqual([15]);
    expect(result.attackTotal).toBe(20);
    expect(result.hit).toBe(true);
  });

  it("sets riderApplied when Guiding Bolt hits", () => {
    const result = resolveSpellCast(GUIDING_BOLT, casterStats, target(), {
      attack: 15,
      dice: [1, 2, 3, 4],
    });
    expect(result.hit).toBe(true);
    expect(result.riderApplied).toBe(true);
  });

  it("does not apply the rider when Guiding Bolt misses", () => {
    const result = resolveSpellCast(GUIDING_BOLT, casterStats, target(), {
      attack: 5,
      dice: [1, 2, 3, 4],
    });
    expect(result.hit).toBe(false);
    expect(result.riderApplied).toBe(false);
  });

  it("carries the rider only on Guiding Bolt", () => {
    expect(GUIDING_BOLT.effect).toMatchObject({
      kind: "damage",
      attack: true,
      rider: "advantage_next_attack",
    });
    expect(SPELLS["Inflict Wounds"]!.effect).not.toHaveProperty("rider");
    const result = resolveSpellCast(SPELLS["Inflict Wounds"]!, casterStats, target(), {
      attack: 15,
      dice: [1, 2, 3],
    });
    expect(result.riderApplied).toBe(false);
  });

  it("applySpellRider appends the guiding_bolt marker once", () => {
    const marked = applySpellRider(target(), GUIDING_BOLT);
    expect(marked?.conditions).toEqual(["guiding_bolt"]);
    const again = applySpellRider(marked!, GUIDING_BOLT);
    expect(again).toBeUndefined();
    expect(applySpellRider(target(), SPELLS["Cure Wounds"]!)).toBeUndefined();
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

describe("resolveSpellCast — flat healing (Heal / Mass Heal)", () => {
  it("Heal restores exactly 70 HP without rolling dice", () => {
    const result = resolveSpellCast(
      SPELLS["Heal"]!,
      casterStats,
      target({ currentHp: 10, maxHp: 100 }),
    );
    expect(result.healed).toBe(70);
    expect(result.healRolls).toEqual([]);
    expect(result.targetCurrentHp).toBe(80);
    expect(result.targetStatus).toBe("active");
    expect(result.damageTotal).toBe(0);
  });

  it("Heal clamps to max HP", () => {
    const result = resolveSpellCast(
      SPELLS["Heal"]!,
      casterStats,
      target({ currentHp: 50, maxHp: 100 }),
    );
    expect(result.healed).toBe(50);
    expect(result.targetCurrentHp).toBe(100);
  });

  it("Heal heals nothing on a full-HP target", () => {
    const result = resolveSpellCast(SPELLS["Heal"]!, casterStats, target());
    expect(result.healed).toBe(0);
    expect(result.targetCurrentHp).toBe(20);
  });

  it("Mass Heal applies its flat amount per target", () => {
    const result = resolveSpellCast(
      SPELLS["Mass Heal"]!,
      casterStats,
      target({ currentHp: 30, maxHp: 900 }),
    );
    expect(result.healed).toBe(700);
    expect(result.healRolls).toEqual([]);
    expect(result.targetCurrentHp).toBe(730);
  });

  it("Mass Heal clamps to max HP", () => {
    const result = resolveSpellCast(
      SPELLS["Mass Heal"]!,
      casterStats,
      target({ currentHp: 30, maxHp: 100 }),
    );
    expect(result.healed).toBe(70);
    expect(result.targetCurrentHp).toBe(100);
  });

  it("flat heal ignores supplied dice rolls", () => {
    const result = resolveSpellCast(
      SPELLS["Heal"]!,
      casterStats,
      target({ currentHp: 10, maxHp: 100 }),
      { dice: [6] },
    );
    expect(result.healed).toBe(70);
    expect(result.healRolls).toEqual([]);
    expect(result.targetCurrentHp).toBe(80);
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

describe("resolveSpellCast — condition_apply spells", () => {
  const HOLD_PERSON = SPELLS["Hold Person"]!;

  it("returns conditionApplied on a failed save without mutating the target", () => {
    const goblin = target();
    const result = resolveSpellCast(HOLD_PERSON, casterStats, goblin, { save: 5 });
    expect(result.hit).toBe(true);
    expect(result.saveDc).toBe(13);
    expect(result.saveTotal).toBe(5);
    expect(result.conditionApplied).toBe("paralyzed");
    expect(result.damageTotal).toBe(0);
    expect(result.healed).toBe(0);
    expect(goblin.conditions).toBeUndefined();
  });

  it("returns no condition on a successful save", () => {
    const result = resolveSpellCast(HOLD_PERSON, casterStats, target(), { save: 18 });
    expect(result.hit).toBe(false);
    expect(result.saveTotal).toBe(18);
    expect(result.conditionApplied).toBeUndefined();
  });

  it("applies the spell's own condition from the definition", () => {
    const result = resolveSpellCast(SPELLS["Blindness/Deafness"]!, casterStats, target(), {
      save: 3,
    });
    expect(result.hit).toBe(true);
    expect(result.conditionApplied).toBe("blinded");
  });
});

describe("resolveSpellCast — heal_all spells", () => {
  const PRAYER_OF_HEALING = SPELLS["Prayer of Healing"]!;

  it("resolves like a heal against a single target", () => {
    const result = resolveSpellCast(
      PRAYER_OF_HEALING,
      casterStats,
      target({ currentHp: 10 }),
      { dice: [3, 4] },
    );
    expect(result.healed).toBe(10);
    expect(result.healRolls).toEqual([3, 4]);
    expect(result.targetCurrentHp).toBe(20);
    expect(result.targetStatus).toBe("active");
    expect(result.damageTotal).toBe(0);
  });

  it("clamps healing to max HP", () => {
    const result = resolveSpellCast(
      PRAYER_OF_HEALING,
      casterStats,
      target({ currentHp: 19 }),
      { dice: [8, 8] },
    );
    expect(result.healed).toBe(19);
    expect(result.targetCurrentHp).toBe(20);
  });
});

describe("resolveSpellCast — condition_remove", () => {
  const LESSER_RESTORATION = SPELLS["Lesser Restoration"]!;

  it("reports the first condition of the target", () => {
    const result = resolveSpellCast(
      LESSER_RESTORATION,
      casterStats,
      target({ conditions: ["poisoned", "prone"] }),
    );
    expect(result.conditionRemoved).toBe("poisoned");
    expect(result.targetCurrentHp).toBe(20);
  });

  it("reports no condition when the target has none", () => {
    const result = resolveSpellCast(LESSER_RESTORATION, casterStats, target());
    expect(result.conditionRemoved).toBeUndefined();
  });
});

describe("resolveSpellCast — restore", () => {
  const GREATER_RESTORATION = SPELLS["Greater Restoration"]!;

  it("removes the target's first condition by default", () => {
    const result = resolveSpellCast(
      GREATER_RESTORATION,
      casterStats,
      target({ conditions: ["poisoned", "prone"] }),
    );
    expect(result.restoredCondition).toBe("poisoned");
    expect(result.restoredExhaustion).toBeUndefined();
    expect(result.damageTotal).toBe(0);
    expect(result.healed).toBe(0);
    expect(result.targetCurrentHp).toBe(20);
    expect(result.targetStatus).toBe("active");
  });

  it("reports no condition when the target has none", () => {
    const result = resolveSpellCast(GREATER_RESTORATION, casterStats, target());
    expect(result.restoredCondition).toBeUndefined();
    expect(result.restoredExhaustion).toBeUndefined();
  });

  it("reports restoredExhaustion in exhaustion mode", () => {
    const result = resolveSpellCast(GREATER_RESTORATION, casterStats, target(), {
      restoreMode: "exhaustion",
    });
    expect(result.restoredExhaustion).toBe(true);
    expect(result.restoredCondition).toBeUndefined();
  });
});

describe("resolveSpellCast — revive", () => {
  const REVIVIFY = SPELLS["Revivify"]!;

  it("revives a dead target to 1 HP and active status", () => {
    const result = resolveSpellCast(
      REVIVIFY,
      casterStats,
      target({ currentHp: 0, status: "dead" }),
    );
    expect(result.revived).toBe(true);
    expect(result.targetCurrentHp).toBe(1);
    expect(result.targetStatus).toBe("active");
    expect(result.damageTotal).toBe(0);
  });

  it("never drops a living target below 1 HP", () => {
    const result = resolveSpellCast(REVIVIFY, casterStats, target({ currentHp: 7 }));
    expect(result.revived).toBe(true);
    expect(result.targetCurrentHp).toBe(7);
    expect(result.targetStatus).toBe("active");
  });
});

describe("resolveSpellCast — full-HP revive (Resurrection)", () => {
  it("revives a dead target at its max HP", () => {
    const result = resolveSpellCast(
      SPELLS["Resurrection"]!,
      casterStats,
      target({ currentHp: 0, status: "dead", maxHp: 60 }),
    );
    expect(result.revived).toBe(true);
    expect(result.targetCurrentHp).toBe(60);
    expect(result.targetCurrentHp).toBe(target({ maxHp: 60 }).maxHp);
    expect(result.targetStatus).toBe("active");
    expect(result.damageTotal).toBe(0);
  });

  it("keeps Revivify at 1 HP (no fullHp flag)", () => {
    const result = resolveSpellCast(
      SPELLS["Revivify"]!,
      casterStats,
      target({ currentHp: 0, status: "dead", maxHp: 60 }),
    );
    expect(result.revived).toBe(true);
    expect(result.targetCurrentHp).toBe(1);
  });
});

describe("summarizeSpells", () => {
  it("returns all twenty known spells with the correct levels and details", () => {
    const metas = summarizeSpells();
    expect(metas).toHaveLength(20);
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
    expect(byName["Spiritual Weapon"]).toMatchObject({
      level: 2,
      castingTime: "bonus",
      effect: { kind: "damage", attack: true, dice: "1d8", damageType: "force" },
    });
    expect(byName["Prayer of Healing"]).toMatchObject({
      level: 2,
      effect: { kind: "heal_all", mod: true, dice: "2d8" },
    });
    expect(byName["Hold Person"]).toMatchObject({
      level: 2,
      effect: { kind: "condition_apply", condition: "paralyzed", save: "wisdom" },
    });
    expect(byName["Lesser Restoration"]).toMatchObject({
      level: 2,
      effect: { kind: "condition_remove" },
    });
    expect(byName["Revivify"]).toMatchObject({
      level: 3,
      effect: { kind: "revive" },
    });
    expect(byName["Spirit Guardians"]).toMatchObject({
      level: 3,
      effect: { kind: "damage", save: "wisdom", dice: "3d8", damageType: "radiant" },
    });
    expect(byName["Guardian of Faith"]).toMatchObject({
      level: 4,
      effect: { kind: "damage", save: "dexterity", dice: "4d10", damageType: "radiant" },
    });
    expect(byName["Banishment"]).toMatchObject({
      level: 4,
      effect: { kind: "condition_apply", condition: "banished", save: "charisma" },
    });
    expect(byName["Greater Restoration"]).toMatchObject({
      level: 5,
      effect: { kind: "restore" },
    });
    expect(byName["Heal"]).toMatchObject({
      level: 6,
      effect: { kind: "heal", mod: false, dice: "1d1", flat: 70 },
    });
    expect(byName["Blade Barrier"]).toMatchObject({
      level: 6,
      effect: { kind: "damage", save: "dexterity", dice: "6d10", damageType: "slashing" },
    });
    expect(byName["Resurrection"]).toMatchObject({
      level: 7,
      effect: { kind: "revive" },
    });
    expect(byName["Mass Heal"]).toMatchObject({
      level: 9,
      effect: { kind: "heal_all", mod: false, dice: "1d1", flat: 700 },
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
      "Blindness/Deafness",
      "Hold Person",
      "Lesser Restoration",
      "Prayer of Healing",
      "Spiritual Weapon",
      "Revivify",
      "Spirit Guardians",
      "Banishment",
      "Guardian of Faith",
      "Greater Restoration",
      "Blade Barrier",
      "Heal",
      "Resurrection",
      "Mass Heal",
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
        effect: {
          kind: expect.stringMatching(
            /^(damage|heal|heal_all|condition_apply|condition_remove|revive|stabilize|restore)$/,
          ),
        },
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
