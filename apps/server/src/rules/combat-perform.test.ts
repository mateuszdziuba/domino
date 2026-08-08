import { describe, expect, it } from "vitest";
import {
  performAttack,
  performDeathSave,
  applyDeathSave,
  characterAttackInput,
  extraAttacksForClass,
  findCombatant,
  nextTurn,
  raceHasDarkvision,
  startCombat,
} from "./combat.js";
import { defaultCampaignState } from "./state.js";
import type { CampaignState, Character, Combatant } from "@domino/shared";

function combatState(turnIndex: number, active = true): CampaignState {
  return {
    ...defaultCampaignState(),
    phase: "combat",
    combat: {
      active,
      round: 1,
      turnIndex,
      combatants: [
        {
          id: "char-1",
          name: "Aelar",
          characterId: "ch1",
          isPlayer: true,
          initiative: 18,
          currentHp: 10,
          maxHp: 10,
          armorClass: 14,
          status: "active",
        },
        {
          id: "enemy-1",
          name: "Goblin",
          isPlayer: false,
          initiative: 5,
          currentHp: 8,
          maxHp: 8,
          armorClass: 12,
          status: "active",
        },
      ],
    },
  };
}

const enemy = (state: CampaignState): Combatant =>
  state.combat.combatants.find((c) => c.id === "enemy-1")!;

describe("performAttack", () => {
  it("succeeds on the current combatant's turn and applies damage", () => {
    const original = Math.random;
    Math.random = () => 0.5; // d20 = 11 (attack 31 >= AC 12) -> hit
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(typeof outcome.result.hit).toBe("boolean");
    expect(outcome.result.hit).toBe(true);
    expect(outcome.state.combat.turnIndex).toBe(0);
    expect(outcome.state.combat.combatants.map((c) => c.id)).toEqual(["char-1", "enemy-1"]);
    expect(enemy(outcome.state).currentHp).toBeLessThanOrEqual(8);
  });

  it("rejects an off-turn attacker", () => {
    const state = combatState(1);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "To nie tura tego kombatanta." });
  });

  it("rejects a downed attacker", () => {
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      currentHp: 0,
      status: "downed",
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Atakujący jest niezdolny do działania." });
  });

  it("rejects a dead attacker", () => {
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      currentHp: 0,
      status: "dead",
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Atakujący jest niezdolny do działania." });
  });

  it("rejects an attacker at 0 HP even when status is active", () => {
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      currentHp: 0,
      status: "active",
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Atakujący jest niezdolny do działania." });
  });

  it("rejects attacking yourself", () => {
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "char-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Nie możesz zaatakować sam siebie." });
  });

  it("rejects a stable attacker", () => {
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      currentHp: 0,
      status: "stable",
      deathSaveSuccesses: 3,
      deathSaveFailures: 0,
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Atakujący jest niezdolny do działania." });
  });

  it("rejects attacking a dead target", () => {
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      currentHp: 0,
      status: "dead",
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Cel jest martwy." });
  });

  it("allows finishing a downed target", () => {
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      currentHp: 0,
      status: "downed",
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome.ok).toBe(true);
  });

  it("rejects when combat is inactive", () => {
    const state = combatState(0, false);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Brak walki w toku." });
  });

  it("rejects an unknown combatant id", () => {
    const state = combatState(0);
    expect(
      performAttack(state, "nobody", "enemy-1", { attackBonus: 0, damageNotation: "1d6", damageBonus: 0 }),
    ).toEqual({ ok: false, error: "Nie znaleziono kombatanta." });
    expect(
      performAttack(state, "char-1", "nobody", { attackBonus: 0, damageNotation: "1d6", damageBonus: 0 }),
    ).toEqual({ ok: false, error: "Nie znaleziono kombatanta." });
  });

  it("misses when the attack total is below AC", () => {
    const original = Math.random;
    Math.random = () => 0.0; // d20 = 1 -> fumble, total 1 < 12
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d8",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.hit).toBe(false);
    expect(outcome.result.fumble).toBe(true);
    expect(outcome.result.damageTotal).toBe(0);
    expect(enemy(outcome.state).currentHp).toBe(8);
  });

  it("does not mutate the input state", () => {
    const state = combatState(0);
    performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(enemy(state).currentHp).toBe(8);
  });

  it("rolls twice and keeps the higher die with advantage", () => {
    const seq = [0.2, 0.85, 0.0]; // d20: 5, 18; damage 1d1
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
      advantage: true,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([5, 18]);
    expect(outcome.result.attackRoll).toBe(18);
    expect(outcome.result.hit).toBe(true);
  });

  it("rolls twice and keeps the lower die with disadvantage", () => {
    const seq = [0.85, 0.2, 0.0]; // d20: 18, 5
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
      disadvantage: true,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([18, 5]);
    expect(outcome.result.attackRoll).toBe(5);
    expect(outcome.result.hit).toBe(false);
  });

  it("crits with advantage when the higher die is a natural 20", () => {
    const seq = [0.2, 0.95, 0.0, 0.0]; // d20: 5, 20; crit doubles 1d1
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
      advantage: true,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([5, 20]);
    expect(outcome.result.attackRoll).toBe(20);
    expect(outcome.result.critical).toBe(true);
    expect(outcome.result.damageRolls).toHaveLength(2);
  });

  it("does not crit with disadvantage unless the taken die is 20", () => {
    const seq = [0.95, 0.2, 0.0]; // d20: 20, 5 -> effective 5
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
      disadvantage: true,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRoll).toBe(5);
    expect(outcome.result.critical).toBe(false);
  });

  it("crits with disadvantage only when the lower die is a natural 20", () => {
    const seq = [0.95, 0.95, 0.0, 0.0]; // d20: 20, 20
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
      disadvantage: true,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([20, 20]);
    expect(outcome.result.attackRoll).toBe(20);
    expect(outcome.result.critical).toBe(true);
  });

  it("applies condition-driven disadvantage (blinded attacker)", () => {
    const seq = [0.85, 0.2, 0.0]; // d20: 18, 5
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      conditions: ["blinded"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([18, 5]);
    expect(outcome.result.attackRoll).toBe(5);
  });

  it("rejects an attacker with exhaustion level 6 (incapacitated)", () => {
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      exhaustionLevel: 6,
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Atakujący jest niezdolny do działania." });
  });

  it("rolls with disadvantage when the attacker has exhaustion level 3", () => {
    const seq = [0.2, 0.95]; // d20: 5, 20 -> effective roll is the lower die (5)
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      exhaustionLevel: 3,
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([5, 20]);
    expect(outcome.result.attackRoll).toBe(5);
    expect(outcome.result.hit).toBe(false);
  });

  it("cancels condition advantage and disadvantage into a normal roll", () => {
    const seq = [0.5]; // single d20: 11
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      conditions: ["blinded"],
    };
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["prone"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([11]);
  });

  it("merges explicit flags with condition modifiers (both present -> normal roll)", () => {
    const seq = [0.5]; // single d20: 11
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      conditions: ["blinded"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
      advantage: true,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([11]);
  });

  it("rejects an attacker with a canAct-false condition (unconscious)", () => {
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      conditions: ["unconscious"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Atakujący jest niezdolny do działania." });
  });

  it("rejects a paralyzed attacker", () => {
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      conditions: ["paralyzed"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Atakujący jest niezdolny do działania." });
  });

  it("auto-crits a HIT against a paralyzed target", () => {
    const original = Math.random;
    Math.random = () => 0.5; // d20 = 11 (attack total 11 < AC 12) — still a miss: NO auto-crit
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["paralyzed"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackTotal).toBe(11);
    expect(outcome.result.critical).toBe(false);
    expect(outcome.result.hit).toBe(false);
  });

  it("auto-crits a HIT against a paralyzed target (roll above AC)", () => {
    const original = Math.random;
    Math.random = () => 0.7; // d20 = 15 (attack total 15 >= AC 12) -> hit -> auto-crit
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["paralyzed"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackTotal).toBe(15);
    expect(outcome.result.critical).toBe(true);
    expect(outcome.result.hit).toBe(true);
    expect(outcome.result.damageRolls).toHaveLength(2);
  });

  it("a natural 1 always misses even against a paralyzed target", () => {
    const original = Math.random;
    Math.random = () => 0.01; // d20 = 1 -> fumble
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["paralyzed"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.hit).toBe(false);
    expect(outcome.result.critical).toBe(false);
    expect(outcome.result.fumble).toBe(true);
    expect(outcome.result.damageRolls).toHaveLength(0);
    expect(enemy(outcome.state).currentHp).toBe(8);
  });

  it("auto-crits a HIT against an unconscious target", () => {
    const original = Math.random;
    Math.random = () => 0.7; // d20 = 15 (attack total 15 >= AC 12) -> hit -> auto-crit
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["unconscious"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.critical).toBe(true);
    expect(outcome.result.hit).toBe(true);
    expect(outcome.result.damageRolls).toHaveLength(2);
  });

  it("does not auto-crit against a normal target", () => {
    const original = Math.random;
    Math.random = () => 0.1; // d20 = 3 -> miss (attack total 3 < AC 12), no critical
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.critical).toBe(false);
    expect(outcome.result.hit).toBe(false);
  });

  it("adds two death-save failures on a critical hit against an unconscious downed target", () => {
    const original = Math.random;
    Math.random = () => 0.5; // d20 = 11; with attackBonus 99 -> hit (110 >= AC 12) -> auto-crit, 1d1 twice = 2 damage
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      currentHp: 0,
      status: "downed",
      conditions: ["unconscious"],
      deathSaveSuccesses: 1,
      deathSaveFailures: 0,
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.critical).toBe(true);
    expect(enemy(outcome.state).currentHp).toBe(0);
    expect(enemy(outcome.state).status).toBe("downed");
    expect(enemy(outcome.state).deathSaveFailures).toBe(2);
    expect(enemy(outcome.state).deathSaveSuccesses).toBe(1);
  });

  it("allows a blinded attacker to act (disadvantage only)", () => {
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      conditions: ["blinded"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome.ok).toBe(true);
  });

  it("consumes the guiding_bolt marker on a successful hit", () => {
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["guiding_bolt"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(enemy(outcome.state).conditions).toEqual([]);
  });

  it("keeps the guiding_bolt marker on a miss", () => {
    const seq = [0.0]; // d20: 1 -> miss (attack total 1 < AC 12)
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["guiding_bolt"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d8",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.hit).toBe(false);
    expect(enemy(outcome.state).conditions).toEqual(["guiding_bolt"]);
  });
});

describe("performAttack — concentration", () => {
  function concentratingTarget(overrides: Partial<Combatant> = {}): Combatant {
    return {
      ...enemy(combatState(0)),
      currentHp: 40,
      maxHp: 40,
      concentratingOn: "Spirit Guardians",
      conSaveMod: 0,
      ...overrides,
    };
  }

  it("rolls a CON save (DC 10) and keeps concentration on a high roll", () => {
    const seq = [0.5, 0.5, 0.99]; // d20 attack: 11 (hit), 1d1: 1 (+5 = 6 dmg), CON save: 20
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[1] = concentratingTarget();
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "1d1",
      damageBonus: 5,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.damageTotal).toBe(6);
    expect(outcome.result.concentrationSave).toEqual({ roll: 20, dc: 10 });
    expect(outcome.result.concentrationBroken).toBe(false);
    expect(enemy(outcome.state).concentratingOn).toBe("Spirit Guardians");
  });

  it("breaks concentration when the CON save fails", () => {
    const seq = [0.5, 0.5, 0.01]; // CON save: 1 -> 1 < 10
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[1] = concentratingTarget();
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "1d1",
      damageBonus: 5,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.concentrationSave).toEqual({ roll: 1, dc: 10 });
    expect(outcome.result.concentrationBroken).toBe(true);
    expect(enemy(outcome.state).concentratingOn).toBeUndefined();
  });

  it("uses half the damage as the save DC when it exceeds 10", () => {
    const seq = [0.5, 0.5, 0.99]; // 1d1 + 29 = 30 dmg -> DC 15, save 20 succeeds
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[1] = concentratingTarget();
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "1d1",
      damageBonus: 29,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.damageTotal).toBe(30);
    expect(outcome.result.concentrationSave).toEqual({ roll: 20, dc: 15 });
    expect(outcome.result.concentrationBroken).toBe(false);
  });

  it("breaks concentration without a save when damage reduces the target to 0 HP", () => {
    const seq = [0.5, 0.5]; // d20 attack: 11 (hit), 1d1: 1 (+99 = 100 dmg)
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[1] = concentratingTarget({ currentHp: 5, maxHp: 5 });
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "1d1",
      damageBonus: 99,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(enemy(outcome.state).currentHp).toBe(0);
    expect(enemy(outcome.state).status).toBe("downed");
    expect(outcome.result.concentrationBroken).toBe(true);
    expect(outcome.result.concentrationSave).toBeUndefined();
    expect(enemy(outcome.state).concentratingOn).toBeUndefined();
  });

  it("records no concentration fields when the target was not concentrating", () => {
    const seq = [0.5, 0.5]; // d20 attack: 11 (hit), 1d1: 1 (+5 = 6 dmg)
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "1d1",
      damageBonus: 5,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.concentrationBroken).toBeUndefined();
    expect(outcome.result.concentrationSave).toBeUndefined();
  });

  it("records no concentration fields when the attack misses", () => {
    const seq = [0.0]; // d20: 1 -> fumble
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[1] = concentratingTarget();
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d8",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.hit).toBe(false);
    expect(outcome.result.concentrationBroken).toBeUndefined();
    expect(outcome.result.concentrationSave).toBeUndefined();
    expect(enemy(outcome.state).concentratingOn).toBe("Spirit Guardians");
  });
});

describe("lethal damage at 0 HP and stable status", () => {
  function downedTarget(overrides: Partial<Combatant> = {}): Combatant {
    return {
      ...enemy(combatState(0)),
      currentHp: 0,
      status: "downed",
      maxHp: 999,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      ...overrides,
    };
  }

  it("a hit on a downed target adds one death-save failure and keeps it downed", () => {
    const original = Math.random;
    Math.random = () => 0.3; // d20 = 7 (attack 106 hits AC 12), 1d1 = 1 damage
    const state = combatState(0);
    state.combat.combatants[1] = downedTarget({
      deathSaveSuccesses: 1,
      deathSaveFailures: 1,
    });
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.hit).toBe(true);
    expect(outcome.result.critical).toBe(false);
    expect(enemy(outcome.state).currentHp).toBe(0);
    expect(enemy(outcome.state).status).toBe("downed");
    expect(enemy(outcome.state).deathSaveFailures).toBe(2);
    expect(enemy(outcome.state).deathSaveSuccesses).toBe(1);
  });

  it("a hit on a downed target always increases failures by 1 or 2 and only a crit reaches 2", () => {
    const original = Math.random;
    Math.random = () => 0.3; // d20 = 7 -> hit (attack 106 >= AC 12)
    for (let i = 0; i < 200; i++) {
      const state = combatState(0);
      state.combat.combatants[1] = downedTarget();
      const outcome = performAttack(state, "char-1", "enemy-1", {
        attackBonus: 99,
        damageNotation: "1d1",
        damageBonus: 0,
      });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) continue;
      expect(outcome.result.hit).toBe(true);
      const target = enemy(outcome.state);
      const delta = target.deathSaveFailures!;
      expect([1, 2]).toContain(delta);
      if (delta === 2) {
        expect(outcome.result.critical).toBe(true);
        expect(target.status).toBe("downed");
      }
    }
    Math.random = original;
  });

  it("instantly kills a 0-HP target when damage equals or exceeds its max HP", () => {
    const original = Math.random;
    Math.random = () => 0.3; // d20 = 7 -> hit; 10d6 each = 2 -> total 20 >= maxHp 10
    const state = combatState(0);
    state.combat.combatants[1] = downedTarget({ maxHp: 10 });
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "10d6",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.hit).toBe(true);
    expect(enemy(outcome.state).status).toBe("dead");
    expect(enemy(outcome.state).deathSaveFailures).toBe(3);
    expect(enemy(outcome.state).currentHp).toBe(0);
  });

  it("kills a downed target when the hit brings failures to 3", () => {
    const original = Math.random;
    Math.random = () => 0.3; // d20 = 7 (attack 106 hits AC 12), 1d1 = 1 damage
    const state = combatState(0);
    state.combat.combatants[1] = downedTarget({ deathSaveFailures: 2 });
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(enemy(outcome.state).status).toBe("dead");
    expect(enemy(outcome.state).deathSaveFailures).toBe(3);
  });

  it("applyDeathSave marks a combatant stable at three successes", () => {
    const state = combatState(0);
    state.combat.combatants[1] = downedTarget({ deathSaveSuccesses: 2 });
    const outcome = applyDeathSave(state.combat, "enemy-1", 15);
    expect(outcome).toBeDefined();
    if (!outcome) return;
    expect(outcome.result.stable).toBe(true);
    expect(outcome.combatant.status).toBe("stable");
    expect(outcome.combatant.deathSaveSuccesses).toBe(3);
    expect(outcome.combatant.currentHp).toBe(0);
  });

  it("applyDeathSave counts a natural 1 as two failures", () => {
    const state = combatState(0);
    state.combat.combatants[1] = downedTarget();
    const outcome = applyDeathSave(state.combat, "enemy-1", 1);
    expect(outcome?.combatant.deathSaveFailures).toBe(2);
    expect(outcome?.combatant.status).toBe("downed");
  });

  it("performDeathSave rejects a stable combatant", () => {
    const state = combatState(0);
    state.combat.combatants[1] = downedTarget({
      status: "stable",
      deathSaveSuccesses: 3,
    });
    expect(performDeathSave(state, "enemy-1")).toEqual({
      ok: false,
      error: "Kombatant nie jest powalony.",
    });
  });

  it("performDeathSave rejects a dead combatant", () => {
    const state = combatState(0);
    state.combat.combatants[1] = downedTarget({
      status: "dead",
      deathSaveFailures: 3,
    });
    expect(performDeathSave(state, "enemy-1")).toEqual({
      ok: false,
      error: "Kombatant nie jest powalony.",
    });
  });
});

describe("performAttack reach and lighting", () => {
  it("rejects a melee attack when either combatant is beyond 5 ft reach", () => {
    const state = combatState(0);
    state.combat.combatants[0] = { ...state.combat.combatants[0]!, position: 10 };
    state.combat.combatants[1] = { ...state.combat.combatants[1]!, position: 10 };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Poza zasięgiem — cel jest za daleko." });
  });

  it("allows a reach weapon (10 ft) attack when the target is 8 ft out", () => {
    const state = combatState(0);
    state.combat.combatants[1] = { ...state.combat.combatants[1]!, position: 8 };
    const original = Math.random;
    Math.random = () => 0.5; // d20 = 11 (attack 31 >= AC 12) -> hit
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
      reach: 10,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
  });

  it("allows a ranged attack (reach 999) across 60 ft", () => {
    const state = combatState(0);
    state.combat.combatants[1] = { ...state.combat.combatants[1]!, position: 60 };
    const original = Math.random;
    Math.random = () => 0.5; // d20 = 11 (attack 31 >= AC 12) -> hit
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
      reach: 999,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
  });

  it("in dark lighting an attacker without darkvision rolls with disadvantage", () => {
    const state = combatState(0);
    state.combat.lightLevel = "dark";
    state.combat.combatants[0] = { ...state.combat.combatants[0]!, darkvision: false };
    state.combat.combatants[1] = { ...state.combat.combatants[1]!, darkvision: true };
    const seq = [0.9, 0.1]; // d20s: 19, 3 -> disadvantage keeps the lower die
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([19, 3]);
    expect(outcome.result.attackRoll).toBe(3);
  });

  it("in dark lighting an attacker with darkvision rolls with advantage vs a blind target", () => {
    const state = combatState(0);
    state.combat.lightLevel = "dark";
    state.combat.combatants[0] = { ...state.combat.combatants[0]!, darkvision: true };
    state.combat.combatants[1] = { ...state.combat.combatants[1]!, darkvision: false };
    const seq = [0.1, 0.9]; // d20s: 3, 19 -> advantage keeps the higher die
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([3, 19]);
    expect(outcome.result.attackRoll).toBe(19);
  });

  it("bright lighting does not alter attack rolls", () => {
    const state = combatState(0);
    state.combat.lightLevel = "bright";
    state.combat.combatants[0] = { ...state.combat.combatants[0]!, darkvision: false };
    state.combat.combatants[1] = { ...state.combat.combatants[1]!, darkvision: false };
    const seq = [0.9, 0.9]; // single d20: 19; 1d8: 8
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([19]);
  });
});

describe("monster traits (combat mechanics)", () => {
  function packState(allyAlive: boolean): CampaignState {
    return {
      ...defaultCampaignState(),
      phase: "combat",
      combat: {
        active: true,
        round: 1,
        turnIndex: 0,
        combatants: [
          {
            id: "wolf-0",
            name: "Wolf",
            isPlayer: false,
            initiative: 18,
            currentHp: 11,
            maxHp: 11,
            armorClass: 13,
            status: "active",
            traits: ["keen_senses", "pack_tactics"],
          },
          {
            id: "goblin-0",
            name: "Goblin",
            isPlayer: false,
            initiative: 12,
            currentHp: allyAlive ? 7 : 0,
            maxHp: 7,
            armorClass: 12,
            status: allyAlive ? "active" : "dead",
            traits: ["nimble_escape"],
          },
          {
            id: "char-1",
            name: "Aelar",
            characterId: "ch1",
            isPlayer: true,
            initiative: 5,
            currentHp: 10,
            maxHp: 10,
            armorClass: 14,
            status: "active",
          },
        ],
      },
    };
  }

  it("gains advantage from pack tactics when a non-player ally is alive", () => {
    const seq = [0.2, 0.85, 0.0]; // d20s: 5, 18; damage 1d1: 1
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const outcome = performAttack(packState(true), "wolf-0", "char-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([5, 18]);
    expect(outcome.result.attackRoll).toBe(18);
    expect(outcome.result.hit).toBe(true);
  });

  it("does not gain advantage from pack tactics without a living ally", () => {
    const seq = [0.5, 0.0]; // single d20: 11; damage 1d1: 1
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const outcome = performAttack(packState(false), "wolf-0", "char-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([11]);
    expect(outcome.result.attackRoll).toBe(11);
  });

  it("merges pack tactics with condition disadvantage into a normal roll", () => {
    const seq = [0.5]; // single d20: 11
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = packState(true);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      conditions: ["blinded"],
    };
    const outcome = performAttack(state, "wolf-0", "char-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 0,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.attackRolls).toEqual([11]);
  });

  it("undead fortitude saves against DC 5 + damage and leaves the zombie at 1 HP", () => {
    const seq = [0.5, 0.5, 0.95]; // d20: 11 (hit), 1d1: 1 (+4 = 5 dmg), CON save: 20
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...enemy(state),
      maxHp: 22,
      currentHp: 5,
      armorClass: 8,
      status: "active",
      traits: ["undead_fortitude"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 4,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.damageTotal).toBe(5);
    expect(outcome.result.undeadFortitudeSaved).toBe(true);
    expect(enemy(outcome.state).currentHp).toBe(1);
    expect(enemy(outcome.state).status).toBe("active");
  });

  it("undead fortitude falls at a failed CON save and the zombie drops to 0 HP", () => {
    const seq = [0.5, 0.5, 0.01]; // CON save: 1 < DC 10
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[1] = {
      ...enemy(state),
      maxHp: 22,
      currentHp: 5,
      armorClass: 8,
      status: "active",
      traits: ["undead_fortitude"],
    };
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 0,
      damageNotation: "1d1",
      damageBonus: 4,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.undeadFortitudeSaved).toBeUndefined();
    expect(enemy(outcome.state).currentHp).toBe(0);
    expect(enemy(outcome.state).status).toBe("downed");
  });

  it("paralyzing touch paralyzes on a failed CON save (DC 11)", () => {
    const seq = [0.5, 0.5, 0.01]; // d20: 11 (+5 = 16 hit), 1d1: 1 (+2 = 3 dmg), CON save: 1
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      id: "ghoul-0",
      isPlayer: false,
      maxHp: 22,
      currentHp: 22,
      armorClass: 12,
      status: "active",
      traits: ["paralyzing_touch"],
    };
    const outcome = performAttack(state, "ghoul-0", "enemy-1", {
      attackBonus: 5,
      damageNotation: "1d1",
      damageBonus: 2,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.conditionApplied).toBe("paralyzed");
    expect(enemy(outcome.state).conditions).toEqual(["paralyzed"]);
  });

  it("web restrains on a failed CON save (DC 11)", () => {
    const seq = [0.5, 0.5, 0.01]; // d20: 11 (+5 = 16 hit), 1d1: 1 (+3 = 4 dmg), CON save: 1
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const state = combatState(0);
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      id: "spider-0",
      isPlayer: false,
      maxHp: 26,
      currentHp: 26,
      armorClass: 14,
      status: "active",
      traits: ["web"],
    };
    const outcome = performAttack(state, "spider-0", "enemy-1", {
      attackBonus: 5,
      damageNotation: "1d1",
      damageBonus: 3,
    });
    Math.random = original;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.conditionApplied).toBe("restrained");
    expect(enemy(outcome.state).conditions).toEqual(["restrained"]);
  });
});

describe("nextTurn", () => {
  function turnState(
    combatants: Combatant[],
    turnIndex: number,
    round = 1,
  ): CampaignState {
    return {
      ...defaultCampaignState(),
      phase: "combat",
      combat: { active: true, round, turnIndex, combatants },
    };
  }

  function fighter(
    id: string,
    status: Combatant["status"] = "active",
  ): Combatant {
    return {
      id,
      name: id,
      isPlayer: true,
      initiative: 10,
      currentHp: status === "active" ? 10 : 0,
      maxHp: 10,
      armorClass: 12,
      status,
    };
  }

  it("skips a dead combatant in the middle of the order", () => {
    const state = turnState([fighter("a"), fighter("b", "dead"), fighter("c")], 0);
    const next = nextTurn(state);
    expect(next.combat.turnIndex).toBe(2);
    expect(next.combat.round).toBe(1);
  });

  it("skips dead combatants across the wrap and increments the round once", () => {
    const state = turnState([fighter("a"), fighter("b"), fighter("c", "dead")], 1);
    const next = nextTurn(state);
    expect(next.combat.turnIndex).toBe(0);
    expect(next.combat.round).toBe(2);
  });

  it("returns the state unchanged when all combatants are dead", () => {
    const state = turnState([fighter("a", "dead"), fighter("b", "dead")], 0);
    const next = nextTurn(state);
    expect(next).toBe(state);
    expect(next.combat.turnIndex).toBe(0);
  });

  it("does not skip a downed combatant", () => {
    const state = turnState([fighter("a"), fighter("b", "downed")], 0);
    const next = nextTurn(state);
    expect(next.combat.turnIndex).toBe(1);
    expect(next.combat.round).toBe(1);
  });

  function troll(overrides: Partial<Combatant> = {}): Combatant {
    return {
      id: "troll-0",
      name: "Troll",
      isPlayer: false,
      initiative: 5,
      currentHp: 10,
      maxHp: 84,
      armorClass: 15,
      status: "active",
      traits: ["regeneration", "keen_senses"],
      ...overrides,
    };
  }

  it("regenerates 10 HP at the start of the troll's turn", () => {
    const state = turnState([fighter("a"), troll()], 0);
    const next = nextTurn(state);
    const regenerated = next.combat.combatants.find((c) => c.id === "troll-0")!;
    expect(regenerated.currentHp).toBe(20);
    expect(next.combat.turnIndex).toBe(1);
  });

  it("caps regeneration at the troll's max HP", () => {
    const state = turnState([fighter("a"), troll({ currentHp: 80 })], 0);
    const next = nextTurn(state);
    const regenerated = next.combat.combatants.find((c) => c.id === "troll-0")!;
    expect(regenerated.currentHp).toBe(84);
  });

  it("does not heal a combatant without regeneration", () => {
    const state = turnState([fighter("a"), fighter("b")], 0);
    const next = nextTurn(state);
    expect(next.combat.combatants[1]!.currentHp).toBe(10);
  });

  it("resets only the new current combatant's attacksLeft to its attacksPerTurn", () => {
    const state = turnState(
      [
        {
          ...fighter("a"),
          attacksPerTurn: 1,
          attacksLeft: 0,
        },
        {
          ...fighter("b"),
          attacksPerTurn: 2,
          attacksLeft: 1,
        },
      ],
      0,
    );
    const next = nextTurn(state);
    const a = next.combat.combatants.find((c) => c.id === "a")!;
    const b = next.combat.combatants.find((c) => c.id === "b")!;
    expect(b.attacksLeft).toBe(2);
    expect(b.attacksPerTurn).toBe(2);
    expect(a.attacksLeft).toBe(0);
  });

  it("resets the new current combatant's reactionAvailable to true at the start of its turn", () => {
    const state = turnState(
      [
        { ...fighter("a"), reactionAvailable: false },
        { ...fighter("b"), reactionAvailable: false },
      ],
      0,
    );
    const next = nextTurn(state);
    const a = next.combat.combatants.find((c) => c.id === "a")!;
    const b = next.combat.combatants.find((c) => c.id === "b")!;
    expect(b.reactionAvailable).toBe(true);
    expect(a.reactionAvailable).toBe(false);
  });

  it("resets the new current combatant's bonusActionAvailable to true at the start of its turn", () => {
    const state = turnState(
      [
        { ...fighter("a"), bonusActionAvailable: true },
        { ...fighter("b"), bonusActionAvailable: false },
      ],
      0,
    );
    const next = nextTurn(state);
    const a = next.combat.combatants.find((c) => c.id === "a")!;
    const b = next.combat.combatants.find((c) => c.id === "b")!;
    expect(b.bonusActionAvailable).toBe(true);
    expect(a.bonusActionAvailable).toBe(true);
  });
});

describe("startCombat", () => {
  it("uses entry.currentHp when provided", () => {
    const state = startCombat(defaultCampaignState(), [
      { id: "c1", name: "Aelar", isPlayer: true, maxHp: 10, currentHp: 3, armorClass: 14 },
    ]);
    expect(state.combat.combatants[0]!.currentHp).toBe(3);
    expect(state.combat.combatants[0]!.maxHp).toBe(10);
  });

  it("falls back to maxHp when currentHp is absent", () => {
    const state = startCombat(defaultCampaignState(), [
      { id: "c1", name: "Aelar", isPlayer: true, maxHp: 10, armorClass: 14 },
    ]);
    expect(state.combat.combatants[0]!.currentHp).toBe(10);
  });

  it("stores the combatant's exhaustion level (defaulting to 0)", () => {
    const state = startCombat(defaultCampaignState(), [
      { id: "c1", name: "Aelar", isPlayer: true, maxHp: 10, armorClass: 14, exhaustionLevel: 2 },
      { id: "c2", name: "Bran", isPlayer: true, maxHp: 10, armorClass: 12 },
    ]);
    const byId = Object.fromEntries(state.combat.combatants.map((c) => [c.id, c]));
    expect(byId.c1!.exhaustionLevel).toBe(2);
    expect(byId.c2!.exhaustionLevel).toBe(0);
  });

  it("initializes attacksPerTurn and attacksLeft to 1 by default", () => {
    const state = startCombat(defaultCampaignState(), [
      { id: "c1", name: "Aelar", isPlayer: true, maxHp: 10, armorClass: 14 },
    ]);
    expect(state.combat.combatants[0]!.attacksPerTurn).toBe(1);
    expect(state.combat.combatants[0]!.attacksLeft).toBe(1);
  });

  it("initializes attacksPerTurn and attacksLeft from entry.attacksPerTurn", () => {
    const state = startCombat(defaultCampaignState(), [
      { id: "troll-0", name: "Troll", isPlayer: false, maxHp: 84, armorClass: 15, attacksPerTurn: 2 },
    ]);
    expect(state.combat.combatants[0]!.attacksPerTurn).toBe(2);
    expect(state.combat.combatants[0]!.attacksLeft).toBe(2);
  });

  it("initializes reactionAvailable to true on every combatant", () => {
    const state = startCombat(defaultCampaignState(), [
      { id: "c1", name: "Aelar", isPlayer: true, maxHp: 10, armorClass: 14 },
      { id: "c2", name: "Bran", isPlayer: true, maxHp: 10, armorClass: 12 },
    ]);
    for (const c of state.combat.combatants) {
      expect(c.reactionAvailable).toBe(true);
    }
  });

  it("initializes position, darkvision and bonusActionAvailable", () => {
    const state = startCombat(defaultCampaignState(), [
      {
        id: "c1",
        name: "Aelar",
        isPlayer: true,
        maxHp: 10,
        armorClass: 14,
        position: 12,
        darkvision: true,
      },
      { id: "c2", name: "Bran", isPlayer: true, maxHp: 10, armorClass: 12 },
    ]);
    const byId = Object.fromEntries(state.combat.combatants.map((c) => [c.id, c]));
    expect(byId.c1!.position).toBe(12);
    expect(byId.c1!.darkvision).toBe(true);
    expect(byId.c1!.bonusActionAvailable).toBe(true);
    expect(byId.c2!.position).toBe(0);
    expect(byId.c2!.darkvision).toBe(false);
    expect(byId.c2!.bonusActionAvailable).toBe(true);
  });
});

describe("raceHasDarkvision", () => {
  it("follows the SRD Darkvision races", () => {
    expect(raceHasDarkvision("Elf")).toBe(true);
    expect(raceHasDarkvision("Dwarf")).toBe(true);
    expect(raceHasDarkvision("Gnome")).toBe(true);
    expect(raceHasDarkvision("Orc")).toBe(true);
    expect(raceHasDarkvision("Tiefling")).toBe(true);
    expect(raceHasDarkvision("Human")).toBe(false);
    expect(raceHasDarkvision("Dragonborn")).toBe(false);
  });
});

describe("extraAttacksForClass", () => {
  it("follows the SRD Extra Attack progression", () => {
    expect(extraAttacksForClass("Fighter", 4)).toBe(1);
    expect(extraAttacksForClass("Fighter", 5)).toBe(2);
    expect(extraAttacksForClass("Fighter", 11)).toBe(3);
    expect(extraAttacksForClass("Fighter", 20)).toBe(4);
    expect(extraAttacksForClass("Barbarian", 5)).toBe(2);
    expect(extraAttacksForClass("Monk", 6)).toBe(2);
    expect(extraAttacksForClass("Paladin", 5)).toBe(2);
    expect(extraAttacksForClass("Ranger", 5)).toBe(2);
    expect(extraAttacksForClass("Rogue", 5)).toBe(1);
    expect(extraAttacksForClass("Barbarian", 4)).toBe(1);
    expect(extraAttacksForClass("Wizard", 20)).toBe(1);
  });
});

describe("performDeathSave", () => {
  it("rejects a combatant that is not downed", () => {
    const state = combatState(0);
    const outcome = performDeathSave(state, "char-1");
    expect(outcome).toEqual({ ok: false, error: "Kombatant nie jest powalony." });
  });

  it("rejects when combat is inactive", () => {
    const state = combatState(0, false);
    expect(performDeathSave(state, "enemy-1")).toEqual({
      ok: false,
      error: "Brak walki w toku.",
    });
  });

  it("rejects an unknown combatant id", () => {
    const state = combatState(0);
    expect(performDeathSave(state, "nobody")).toEqual({ ok: false, error: "Nie znaleziono kombatanta." });
  });

  it("applies a death save to a downed combatant consistently", () => {
    const state = combatState(0);
    const downed: Combatant = { ...enemy(state), currentHp: 0, status: "downed" };
    state.combat.combatants[1] = downed;
    const outcome = performDeathSave(state, "enemy-1");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const result = outcome.result;
    if (result.roll === 20) {
      expect(outcome.combatant.currentHp).toBe(1);
      expect(outcome.combatant.status).toBe("active");
      expect(outcome.combatant.deathSaveSuccesses).toBe(0);
      expect(outcome.combatant.deathSaveFailures).toBe(0);
    } else if (result.dead) {
      expect(outcome.combatant.status).toBe("dead");
      expect(outcome.combatant.currentHp).toBe(0);
    } else {
      expect(outcome.combatant.status).toBe("downed");
      expect(outcome.combatant.currentHp).toBe(0);
      if (result.roll === 1) expect(outcome.combatant.deathSaveFailures).toBe(2);
      if (result.roll >= 2 && result.roll <= 9) expect(outcome.combatant.deathSaveFailures).toBe(1);
      if (result.roll >= 10 && result.roll <= 19) expect(outcome.combatant.deathSaveSuccesses).toBe(1);
    }
    expect(findCombatant(outcome.state, "enemy-1")).toEqual(outcome.combatant);
  });

  it("kills a combatant on the third failure", () => {
    const state = combatState(0);
    const downed: Combatant = {
      ...enemy(state),
      currentHp: 0,
      status: "downed",
      deathSaveSuccesses: 0,
      deathSaveFailures: 2,
    };
    state.combat.combatants[1] = downed;
    const outcome = performDeathSave(state, "enemy-1");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    if (outcome.result.roll === 20) {
      expect(outcome.combatant.status).toBe("active");
    } else if (outcome.result.roll < 10) {
      expect(outcome.result.dead).toBe(true);
      expect(outcome.combatant.status).toBe("dead");
    }
  });
});

describe("characterAttackInput", () => {
  const character: Character = {
    id: "ch1",
    userId: "u1",
    name: "Aelar",
    race: "Elf",
    className: "Fighter",
    level: 1,
    abilityScores: { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8 },
    maxHp: 10,
    currentHp: 10,
    armorClass: 14,
    speed: 30,
    proficiencyBonus: 2,
    skills: {},
    inventory: [],
    spells: [],
    createdAt: "",
    updatedAt: "",
  };
  const attacker: Combatant = {
    id: "char-1",
    name: "Aelar",
    characterId: "ch1",
    isPlayer: true,
    initiative: 18,
    currentHp: 10,
    maxHp: 10,
    armorClass: 14,
  };

  it("derives proficiency + strength modifier and 1d8 for a PC", () => {
    expect(characterAttackInput(attacker, character)).toEqual({
      attackBonus: 4,
      damageNotation: "1d8",
      damageBonus: 2,
    });
  });

  it("falls back to unarmed defaults for a monster", () => {
    expect(characterAttackInput(attacker, undefined)).toEqual({
      attackBonus: 0,
      damageNotation: "1d6",
      damageBonus: 0,
    });
  });
});
