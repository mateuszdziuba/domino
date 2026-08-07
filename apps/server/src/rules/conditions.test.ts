import { describe, expect, it } from "vitest";
import type { Combatant } from "@domino/shared";
import {
  CONDITIONS,
  GUIDING_BOLT_MARKER,
  attackRollAdvantages,
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
  it("defines the ten SRD 5.2.1 conditions", () => {
    expect(CONDITIONS.length).toBeGreaterThanOrEqual(10);
    expect(CONDITIONS.map((c) => c.key).sort()).toEqual([
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

  it("ignores conditions that do not affect attack rolls", () => {
    expect(attackRollAdvantages(combatant(["stunned"]), combatant())).toEqual({
      advantage: false,
      disadvantage: false,
    });
    expect(attackRollAdvantages(combatant(), combatant(["stunned"]))).toEqual({
      advantage: false,
      disadvantage: false,
    });
  });
});
