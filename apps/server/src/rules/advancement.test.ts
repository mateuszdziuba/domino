import { describe, expect, it } from "vitest";
import {
  XP_BY_CR,
  XP_BY_LEVEL,
  applyLevelUp,
  hitDieForClass,
  levelForXp,
  maxHpForLevel,
  maxHpIncrement,
  xpAwardForDeadEnemies,
  xpForCr,
} from "./advancement.js";

describe("XP_BY_CR / xpForCr", () => {
  it("maps SRD challenge ratings to XP values", () => {
    expect(XP_BY_CR[0]).toBe(10);
    expect(XP_BY_CR[0.125]).toBe(25);
    expect(XP_BY_CR[1]).toBe(200);
    expect(XP_BY_CR[5]).toBe(1800);
    expect(XP_BY_CR[10]).toBe(5900);
  });

  it("falls back to 200 XP for unknown challenge ratings", () => {
    expect(xpForCr(0.75)).toBe(200);
    expect(xpForCr(99)).toBe(200);
  });
});

describe("levelForXp", () => {
  it("maps XP totals to levels via the SRD thresholds", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(299)).toBe(1);
    expect(levelForXp(300)).toBe(2);
    expect(levelForXp(899)).toBe(2);
    expect(levelForXp(900)).toBe(3);
    expect(levelForXp(XP_BY_LEVEL[18]!)).toBe(20);
    expect(levelForXp(999999)).toBe(20);
  });
});

describe("hitDieForClass", () => {
  it("matches the SRD hit dice per class", () => {
    expect(hitDieForClass("Barbarian")).toBe(12);
    expect(hitDieForClass("Fighter")).toBe(10);
    expect(hitDieForClass("Cleric")).toBe(8);
    expect(hitDieForClass("Sorcerer")).toBe(6);
    expect(hitDieForClass("Wizard")).toBe(6);
    expect(hitDieForClass("Unknown")).toBe(8);
  });
});

describe("maxHpIncrement", () => {
  it("adds the SRD average hit points (rounded up) plus the con modifier", () => {
    expect(maxHpIncrement("Cleric", 0)).toBe(5);
    expect(maxHpIncrement("Barbarian", 2)).toBe(9);
    expect(maxHpIncrement("Wizard", 3)).toBe(7);
    expect(maxHpIncrement("Fighter", 0)).toBe(6);
  });
});

describe("maxHpForLevel", () => {
  it("level 1 is the hit die maximum plus the constitution modifier", () => {
    expect(maxHpForLevel("Cleric", 1, 1)).toBe(9);
    expect(maxHpForLevel("Barbarian", 1, 3)).toBe(15);
    expect(maxHpForLevel("Wizard", 1, 0)).toBe(6);
  });

  it("each further level adds the SRD average (rounded up) plus the con modifier", () => {
    expect(maxHpForLevel("Cleric", 3, 1)).toBe(9 + 2 * 6);
  });

  it("matches the grantXp level-up math when leveled from 1", () => {
    const levelUp = applyLevelUp({ xp: 6500, level: 1, className: "Cleric", constitution: 13 });
    expect(maxHpForLevel("Cleric", levelUp.newLevel, 1)).toBe(9 + levelUp.maxHpDelta);
  });
});

describe("xpAwardForDeadEnemies", () => {
  it("sums XP for dead enemies with a challenge rating only", () => {
    const combatants = [
      { cr: 1, status: "dead" },
      { cr: 0.5, status: "dead" },
      { cr: 2, status: "active" },
      { cr: undefined, status: "dead" },
      { status: "dead" },
    ];
    expect(xpAwardForDeadEnemies(combatants)).toBe(200 + 100);
  });

  it("returns 0 when nothing is dead", () => {
    expect(xpAwardForDeadEnemies([{ cr: 5, status: "active" }])).toBe(0);
    expect(xpAwardForDeadEnemies([])).toBe(0);
  });
});

describe("applyLevelUp", () => {
  it("does not level up below the first threshold", () => {
    const result = applyLevelUp({ xp: 299, level: 1, className: "Cleric", constitution: 10 });
    expect(result).toEqual({
      leveledUp: false,
      newLevel: 1,
      maxHpDelta: 0,
      newProficiency: 2,
      newXp: 299,
    });
  });

  it("levels up by one with a single hit-die increment", () => {
    const result = applyLevelUp({ xp: 300, level: 1, className: "Cleric", constitution: 10 });
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
    expect(result.maxHpDelta).toBe(5);
    expect(result.newProficiency).toBe(2);
    expect(result.newXp).toBe(300);
  });

  it("multi-level jumps apply the increment per level", () => {
    const result = applyLevelUp({ xp: 6500, level: 1, className: "Cleric", constitution: 10 });
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(5);
    expect(result.maxHpDelta).toBe(20);
    expect(result.newProficiency).toBe(3);
  });

  it("caps leveling at level 20", () => {
    const result = applyLevelUp({ xp: 999999, level: 20, className: "Cleric", constitution: 10 });
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(20);
    expect(result.maxHpDelta).toBe(0);
    expect(result.newProficiency).toBe(6);
  });
});
