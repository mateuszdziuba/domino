import { describe, expect, it } from "vitest";
import {
  performAttack,
  performDeathSave,
  applyDeathSave,
  characterAttackInput,
  findCombatant,
  nextTurn,
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
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
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
    expect(outcome).toEqual({ ok: false, error: "Not this combatant's turn" });
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
    expect(outcome).toEqual({ ok: false, error: "Attacker is incapacitated" });
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
    expect(outcome).toEqual({ ok: false, error: "Attacker is incapacitated" });
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
    expect(outcome).toEqual({ ok: false, error: "Attacker is incapacitated" });
  });

  it("rejects attacking yourself", () => {
    const state = combatState(0);
    const outcome = performAttack(state, "char-1", "char-1", {
      attackBonus: 20,
      damageNotation: "1d8",
      damageBonus: 5,
    });
    expect(outcome).toEqual({ ok: false, error: "Cannot attack yourself" });
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
    expect(outcome).toEqual({ ok: false, error: "Attacker is incapacitated" });
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
    expect(outcome).toEqual({ ok: false, error: "Target is dead" });
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
    expect(outcome).toEqual({ ok: false, error: "No combat in progress" });
  });

  it("rejects an unknown combatant id", () => {
    const state = combatState(0);
    expect(
      performAttack(state, "nobody", "enemy-1", { attackBonus: 0, damageNotation: "1d6", damageBonus: 0 }),
    ).toEqual({ ok: false, error: "Combatant not found" });
    expect(
      performAttack(state, "char-1", "nobody", { attackBonus: 0, damageNotation: "1d6", damageBonus: 0 }),
    ).toEqual({ ok: false, error: "Combatant not found" });
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
    Math.random = () => 0.0; // d20 = 1 (attack 100 still hits), 1d1 = 1 damage
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
  });

  it("instantly kills a 0-HP target when damage equals or exceeds its max HP", () => {
    const state = combatState(0);
    state.combat.combatants[1] = downedTarget({ maxHp: 10 });
    const outcome = performAttack(state, "char-1", "enemy-1", {
      attackBonus: 99,
      damageNotation: "10d6",
      damageBonus: 0,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.hit).toBe(true);
    expect(enemy(outcome.state).status).toBe("dead");
    expect(enemy(outcome.state).deathSaveFailures).toBe(3);
    expect(enemy(outcome.state).currentHp).toBe(0);
  });

  it("kills a downed target when the hit brings failures to 3", () => {
    const original = Math.random;
    Math.random = () => 0.0; // d20 = 1 (attack 100 still hits), 1d1 = 1 damage
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
      error: "Combatant is not downed",
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
      error: "Combatant is not downed",
    });
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
});

describe("performDeathSave", () => {
  it("rejects a combatant that is not downed", () => {
    const state = combatState(0);
    const outcome = performDeathSave(state, "char-1");
    expect(outcome).toEqual({ ok: false, error: "Combatant is not downed" });
  });

  it("rejects when combat is inactive", () => {
    const state = combatState(0, false);
    expect(performDeathSave(state, "enemy-1")).toEqual({
      ok: false,
      error: "No combat in progress",
    });
  });

  it("rejects an unknown combatant id", () => {
    const state = combatState(0);
    expect(performDeathSave(state, "nobody")).toEqual({ ok: false, error: "Combatant not found" });
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
