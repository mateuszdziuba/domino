import { describe, expect, it } from "vitest";
import type { Combatant } from "@domino/shared";
import {
  CONDITIONS,
  GUIDING_BOLT_MARKER,
  attackRollAdvantages,
  canAct,
  isConditionKey,
} from "./conditions.js";

function combatant(conditions: string[] = []): Combatant {
  return {
    id: "c1",
    name: "Combatant",
    isPlayer: true,
    initiative: 10,
    currentHp: 10,
    maxHp: 10,
    armorClass: 12,
    conditions,
  };
}

describe("CONDITIONS", () => {
  it("defines the eleven SRD 5.2.1 conditions", () => {
    expect(CONDITIONS.length).toBeGreaterThanOrEqual(11);
    expect(CONDITIONS.map((c) => c.key).sort()).toEqual([
      "banished",
      "blinded",
      "frightened",
      "incapacitated",
      "paralyzed",
      "petrified",
      "poisoned",
      "prone",
      "restrained",
      "stunned",
      "unconscious",
    ]);
  });

  it("carries Polish labels and descriptions", () => {
    for (const condition of CONDITIONS) {
      expect(condition.label.length).toBeGreaterThan(2);
      expect(condition.description.length).toBeGreaterThan(10);
    }
  });

  it("marks conditions that prevent acting", () => {
    const byKey = Object.fromEntries(CONDITIONS.map((c) => [c.key, c]));
    expect(byKey.unconscious!.canAct).toBe(false);
    expect(byKey.paralyzed!.canAct).toBe(false);
    expect(byKey.petrified!.canAct).toBe(false);
    expect(byKey.stunned!.canAct).toBe(false);
    expect(byKey.incapacitated!.canAct).toBe(false);
    expect(byKey.banished!.canAct).toBe(false);
    expect(byKey.blinded!.canAct).toBe(true);
    expect(byKey.frightened!.canAct).toBe(true);
    expect(byKey.poisoned!.canAct).toBe(true);
    expect(byKey.prone!.canAct).toBe(true);
    expect(byKey.restrained!.canAct).toBe(true);
  });

  it("isConditionKey recognizes condition keys only", () => {
    expect(isConditionKey("prone")).toBe(true);
    expect(isConditionKey("blinded")).toBe(true);
    expect(isConditionKey("unconscious")).toBe(true);
    expect(isConditionKey("banished")).toBe(true);
    expect(isConditionKey("teleport")).toBe(false);
    expect(isConditionKey("")).toBe(false);
  });

  it("keeps the guiding_bolt marker out of CONDITIONS", () => {
    expect(CONDITIONS.some((c) => c.key === GUIDING_BOLT_MARKER)).toBe(false);
  });
});

describe("attackRollAdvantages", () => {
  it("gives disadvantage to a blinded attacker", () => {
    expect(attackRollAdvantages(combatant(["blinded"]), combatant())).toEqual({
      advantage: false,
      disadvantage: true,
    });
  });

  it("gives disadvantage to frightened, poisoned, prone and restrained attackers", () => {
    for (const condition of ["frightened", "poisoned", "prone", "restrained"]) {
      expect(attackRollAdvantages(combatant([condition]), combatant()).disadvantage).toBe(
        true,
      );
    }
  });

  it("gives advantage against blinded, prone, restrained, paralyzed and unconscious targets", () => {
    for (const condition of ["blinded", "prone", "restrained", "paralyzed", "unconscious"]) {
      expect(attackRollAdvantages(combatant(), combatant([condition])).advantage).toBe(true);
    }
  });

  it("cancels to a normal roll when attacker and target are both affected", () => {
    expect(
      attackRollAdvantages(combatant(["restrained"]), combatant(["prone"])),
    ).toEqual({ advantage: false, disadvantage: false });
    expect(
      attackRollAdvantages(combatant(["blinded"]), combatant(["unconscious"])),
    ).toEqual({ advantage: false, disadvantage: false });
  });

  it("grants advantage from the guiding_bolt marker", () => {
    expect(attackRollAdvantages(combatant(), combatant([GUIDING_BOLT_MARKER]))).toEqual({
      advantage: true,
      disadvantage: false,
    });
  });

  it("grants advantage against stunned and petrified targets", () => {
    expect(attackRollAdvantages(combatant(), combatant(["stunned"]))).toEqual({
      advantage: true,
      disadvantage: false,
    });
    expect(attackRollAdvantages(combatant(), combatant(["petrified"]))).toEqual({
      advantage: true,
      disadvantage: false,
    });
  });
});

describe("exhaustion", () => {
  it("gives disadvantage to an attacker with exhaustion level 3 or more", () => {
    for (const level of [3, 4, 5, 6]) {
      expect(
        attackRollAdvantages({ ...combatant(), exhaustionLevel: level }, combatant()),
      ).toEqual({ advantage: false, disadvantage: true });
    }
  });

  it("has no effect on attack rolls at exhaustion level 0-2", () => {
    for (const level of [0, 1, 2]) {
      expect(
        attackRollAdvantages({ ...combatant(), exhaustionLevel: level }, combatant()),
      ).toEqual({ advantage: false, disadvantage: false });
    }
  });

  it("does not grant advantage against an exhausted target", () => {
    expect(attackRollAdvantages(combatant(), { ...combatant(), exhaustionLevel: 5 })).toEqual({
      advantage: false,
      disadvantage: false,
    });
  });

  it("prevents acting at exhaustion level 6 but not at level 5", () => {
    expect(canAct({ exhaustionLevel: 6 })).toBe(false);
    expect(canAct({ exhaustionLevel: 5 })).toBe(true);
    expect(canAct({})).toBe(true);
    expect(canAct({ conditions: ["prone"], exhaustionLevel: 6 })).toBe(false);
  });
});
