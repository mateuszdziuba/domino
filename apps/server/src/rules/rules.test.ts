import { describe, expect, it } from "vitest";
import { abilityModifier, proficiencyBonus, savingThrowModifier, makeCheck, SKILL_TO_ABILITY } from "./abilities.js";
import { rollDiceNotation, averageResult } from "./dice.js";
import { getAvailableActions, buildDmSuggestion } from "./actions.js";
import {
  startCombat,
  nextTurn,
  endCombat,
  resolveAttack,
  makeDeathSave,
  applyDeathSave,
  currentTurnCombatant,
  findCombatant,
} from "./combat.js";
import { defaultCampaignState } from "./state.js";
import type { Character, CampaignState, Combatant } from "@domino/shared";

const baseCharacter: Character = {
  id: "c1",
  userId: "u1",
  name: "Aelar",
  race: "Elf",
  className: "Fighter",
  level: 1,
  abilityScores: { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8 },
  maxHp: 12,
  currentHp: 12,
  armorClass: 16,
  speed: 30,
  proficiencyBonus: 2,
  skills: {},
  inventory: [],
  spells: [],
  createdAt: "",
  updatedAt: "",
};

describe("abilityModifier", () => {
  it("computes SRD modifiers", () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(14)).toBe(2);
    expect(abilityModifier(15)).toBe(2);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(20)).toBe(5);
    expect(abilityModifier(1)).toBe(-5);
  });
});

describe("proficiencyBonus", () => {
  it("follows the SRD table", () => {
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(4)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(9)).toBe(4);
    expect(proficiencyBonus(13)).toBe(5);
    expect(proficiencyBonus(17)).toBe(6);
    expect(proficiencyBonus(20)).toBe(6);
  });
});

describe("savingThrowModifier", () => {
  it("adds proficiency only when proficient", () => {
    expect(savingThrowModifier(baseCharacter.abilityScores, "constitution", false)).toBe(1);
    expect(savingThrowModifier(baseCharacter.abilityScores, "constitution", true, 1)).toBe(3);
  });
});

describe("makeCheck", () => {
  it("adds ability modifier for a skill", () => {
    expect(SKILL_TO_ABILITY["perception"]).toBe("wisdom");
    const result = makeCheck(baseCharacter.abilityScores, { skill: "perception", roll: 10 });
    expect(result.total).toBe(11);
  });
  it("adds proficiency when proficient", () => {
    const result = makeCheck(baseCharacter.abilityScores, { skill: "athletics", proficient: true, roll: 10 });
    expect(result.total).toBe(14);
  });
});

describe("rollDiceNotation", () => {
  it("parses notation and adds modifiers", () => {
    const { total, rolls } = rollDiceNotation("2d6+3");
    expect(rolls).toHaveLength(2);
    expect(total).toBe(rolls[0]! + rolls[1]! + 3);
  });
  it("rejects invalid notation", () => {
    expect(() => rollDiceNotation("banana")).toThrow();
  });
  it("computes averages", () => {
    expect(averageResult("2d6")).toBe(7);
    expect(averageResult("1d8+2")).toBe(6);
  });
});

describe("getAvailableActions", () => {
  it("offers combat actions in combat phase", () => {
    const state: CampaignState = { ...defaultCampaignState(), phase: "combat" };
    const actions = getAvailableActions(baseCharacter, state);
    const keys = actions.map((a) => a.key);
    expect(keys).toContain("attack");
    expect(keys).toContain("dodge");
    expect(keys).toContain("dash");
  });
  it("marks cast-spell illegal when character has no spells", () => {
    const state: CampaignState = { ...defaultCampaignState(), phase: "combat" };
    const spellAction = getAvailableActions(baseCharacter, state).find((a) => a.key === "cast-spell");
    expect(spellAction?.legal).toBe(false);
  });
  it("offers exploration actions outside combat", () => {
    const actions = getAvailableActions(baseCharacter, defaultCampaignState());
    const keys = actions.map((a) => a.key);
    expect(keys).toContain("investigate");
    expect(keys).not.toContain("attack");
  });
});

describe("turn handling", () => {
  it("returns the combatant whose turn it is", () => {
    const state: CampaignState = {
      ...defaultCampaignState(),
      phase: "combat",
      combat: {
        active: true,
        round: 1,
        turnIndex: 1,
        combatants: [
          { id: "g1", name: "Goblin", isPlayer: false, initiative: 5, currentHp: 7, maxHp: 7, armorClass: 15 },
          { id: "c1", name: "Aelar", characterId: "c1", isPlayer: true, initiative: 18, currentHp: 12, maxHp: 12, armorClass: 16 },
        ],
      },
    };
    expect(currentTurnCombatant(state)?.id).toBe("c1");
  });
  it("only suggests actions to the player on its own turn", () => {
    const state: CampaignState = {
      ...defaultCampaignState(),
      phase: "combat",
      combat: {
        active: true,
        round: 1,
        turnIndex: 0,
        combatants: [
          { id: "g1", name: "Goblin", isPlayer: false, initiative: 5, currentHp: 7, maxHp: 7, armorClass: 15 },
          { id: "c1", name: "Aelar", characterId: "c1", isPlayer: true, initiative: 18, currentHp: 12, maxHp: 12, armorClass: 16 },
        ],
      },
    };
    const suggestion = buildDmSuggestion(baseCharacter, state);
    expect(suggestion.turnOf?.name).toBe("Goblin");
    expect(suggestion.availableActions).toHaveLength(0);
  });
});

describe("combat", () => {
  it("starts combat sorted by initiative", () => {
    const state = startCombat(defaultCampaignState(), [
      { id: "g1", name: "Goblin", isPlayer: false, maxHp: 7, armorClass: 15, initiative: 5 },
      { id: "c1", name: "Aelar", characterId: "c1", isPlayer: true, maxHp: 12, armorClass: 16, initiative: 18 },
    ]);
    expect(state.phase).toBe("combat");
    expect(state.combat.active).toBe(true);
    expect(state.combat.combatants.map((c) => c.id)).toEqual(["c1", "g1"]);
    expect(currentTurnCombatant(state)?.id).toBe("c1");
  });

  it("advances turns and increments round on wrap", () => {
    let state = startCombat(defaultCampaignState(), [
      { id: "g1", name: "Goblin", isPlayer: false, maxHp: 7, armorClass: 15, initiative: 5 },
      { id: "c1", name: "Aelar", characterId: "c1", isPlayer: true, maxHp: 12, armorClass: 16, initiative: 18 },
    ]);
    state = nextTurn(state);
    expect(currentTurnCombatant(state)?.id).toBe("g1");
    expect(state.combat.round).toBe(1);
    state = nextTurn(state);
    expect(currentTurnCombatant(state)?.id).toBe("c1");
    expect(state.combat.round).toBe(2);
  });

  it("resolves a hit with damage", () => {
    const goblin: Combatant = { id: "g1", name: "Goblin", isPlayer: false, initiative: 5, currentHp: 7, maxHp: 7, armorClass: 15, status: "active" };
    const original = Math.random;
    Math.random = () => 0.95; // d20 = 20 -> crit
    const result = resolveAttack(goblin, { attackBonus: 0, damageNotation: "1d4", damageBonus: 0 });
    Math.random = original;
    expect(result.hit).toBe(true);
    expect(result.damageTotal).toBeGreaterThanOrEqual(1);
    expect(result.targetCurrentHp).toBeLessThan(7);
  });

  it("always hits on a natural 20 and rolls double dice", () => {
    const goblin: Combatant = { id: "g1", name: "Goblin", isPlayer: false, initiative: 5, currentHp: 7, maxHp: 7, armorClass: 15, status: "active" };
    // d20 -> 20, then 1d4 (crit) + 1d4
    const values = [0.95, 0.0, 0.25];
    const original = Math.random;
    Math.random = () => values.shift() ?? 0.5;
    const result = resolveAttack(goblin, { attackBonus: 0, damageNotation: "1d4", damageBonus: 0 });
    Math.random = original;
    expect(result.hit).toBe(true);
    expect(result.critical).toBe(true);
    expect(result.damageRolls).toHaveLength(2);
    expect(result.targetCurrentHp).toBe(4);
  });

  it("applies death saves: three failures kill", () => {
    const goblin: Combatant = { id: "g1", name: "Goblin", isPlayer: false, initiative: 5, currentHp: 0, maxHp: 7, armorClass: 15, status: "downed", deathSaveSuccesses: 0, deathSaveFailures: 0 };
    const state: CampaignState = {
      ...defaultCampaignState(),
      phase: "combat",
      combat: { active: true, round: 1, turnIndex: 0, combatants: [goblin] },
    };
    const first = applyDeathSave(state.combat, "g1", 5);
    expect(first?.result.failures).toBe(1);
    const second = applyDeathSave(state.combat, "g1", 5);
    expect(second?.result.failures).toBe(2);
    const third = applyDeathSave(state.combat, "g1", 5);
    expect(third?.result.dead).toBe(true);
    expect(findCombatant(state, "g1")?.status).toBe("dead");
  });

  it("natural 1 counts as two failures", () => {
    const goblin: Combatant = { id: "g1", name: "Goblin", isPlayer: false, initiative: 5, currentHp: 0, maxHp: 7, armorClass: 15, status: "downed", deathSaveSuccesses: 0, deathSaveFailures: 0 };
    const state: CampaignState = {
      ...defaultCampaignState(),
      phase: "combat",
      combat: { active: true, round: 1, turnIndex: 0, combatants: [goblin] },
    };
    const result = applyDeathSave(state.combat, "g1", 1);
    expect(result?.result.failures).toBe(2);
  });

  it("natural 20 stabilizes and restores 1 hp", () => {
    const goblin: Combatant = { id: "g1", name: "Goblin", isPlayer: false, initiative: 5, currentHp: 0, maxHp: 7, armorClass: 15, status: "downed", deathSaveSuccesses: 0, deathSaveFailures: 0 };
    const result = makeDeathSave(goblin, 20);
    expect(result.stable).toBe(true);
    expect(result.dead).toBe(false);
  });

  it("ends combat and returns to exploration", () => {
    let state = startCombat(defaultCampaignState(), [
      { id: "g1", name: "Goblin", isPlayer: false, maxHp: 7, armorClass: 15, initiative: 5 },
    ]);
    state = endCombat(state);
    expect(state.phase).toBe("exploration");
    expect(state.combat.active).toBe(false);
  });
});
