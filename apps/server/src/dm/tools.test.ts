import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignState, Character } from "@domino/shared";

const mock = vi.hoisted(() => {
  function defaultState(): CampaignState {
    return {
      phase: "exploration",
      location: "The campaign's starting location",
      scene: "The adventure begins",
      worldProgress: [],
      combat: { active: false, combatants: [], turnIndex: 0, round: 1 },
      notes: "",
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    states: new Map<string, CampaignState>(),
    characters: new Map<string, Character>(),
    pushEvent: vi.fn(),
    updateCharacterHp: vi.fn(),
    defaultState,
  };
});

vi.mock("../campaign/store.js", () => ({
  loadState: (id: string) => mock.states.get(id) ?? mock.defaultState(),
  saveState: (id: string, s: CampaignState) => {
    mock.states.set(id, s);
    return s;
  },
  pushEvent: mock.pushEvent,
  updateCharacterHp: mock.updateCharacterHp,
  getCharacterById: (id: string) => mock.characters.get(id),
  getCampaignForUser: () => ({ id: "c1" }),
  getCampaignMembers: () => [],
  getCampaignCharacters: () => [],
}));

const aria: Character = {
  id: "ch1",
  userId: "u1",
  name: "Aria",
  race: "Elf",
  className: "Fighter",
  level: 1,
  abilityScores: {
    strength: 16,
    dexterity: 14,
    constitution: 14,
    intelligence: 10,
    wisdom: 10,
    charisma: 8,
  },
  maxHp: 10,
  currentHp: 10,
  armorClass: 15,
  speed: 30,
  proficiencyBonus: 2,
  skills: {},
  inventory: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function stateWithCombat(overrides: Partial<CampaignState> = {}): CampaignState {
  return {
    ...mock.defaultState(),
    phase: "combat",
    combat: {
      active: true,
      turnIndex: 0,
      round: 1,
      combatants: [
        {
          id: "char-ch1",
          name: "Aria",
          characterId: "ch1",
          isPlayer: true,
          initiative: 18,
          currentHp: 10,
          maxHp: 10,
          armorClass: 15,
          status: "active",
          deathSaveSuccesses: 0,
          deathSaveFailures: 0,
        },
        {
          id: "enemy-1",
          name: "Goblin",
          isPlayer: false,
          initiative: 5,
          currentHp: 7,
          maxHp: 7,
          armorClass: 12,
          status: "active",
          deathSaveSuccesses: 0,
          deathSaveFailures: 0,
        },
      ],
    },
    ...overrides,
  };
}

async function runTool(name: string, args: unknown = {}) {
  const { runDmTool } = await import("./tools.js");
  return runDmTool("c1", "dm", name as never, args);
}

beforeEach(() => {
  mock.states.clear();
  mock.characters.clear();
  mock.pushEvent.mockReset();
  mock.updateCharacterHp.mockReset();
  mock.characters.set("ch1", { ...aria });
  mock.states.set("c1", stateWithCombat());
});

describe("runDmTool combat tools (mocked store)", () => {
  it("attack_combatant resolves on the current combatant's turn", async () => {
    const result = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const goblin = saved.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.currentHp).toBeLessThanOrEqual(7);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "attack" }),
    );
  });

  it("attack_combatant refuses attacks off-turn", async () => {
    const state = stateWithCombat();
    state.combat.turnIndex = 1;
    mock.states.set("c1", state);
    const result = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("turn");
  });

  it("attack_combatant rejects a missing target", async () => {
    const result = await runTool("attack_combatant", { attackerId: "char-ch1" });
    expect(result.ok).toBe(false);
  });

  it("resolve_death_save works on a downed combatant", async () => {
    const state = stateWithCombat();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      currentHp: 0,
      status: "downed",
    };
    mock.states.set("c1", state);
    const result = await runTool("resolve_death_save", { combatantId: "char-ch1" });
    expect(result.ok).toBe(true);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "death-save" }),
    );
  });

  it("resolve_death_save rejects a healthy combatant", async () => {
    const result = await runTool("resolve_death_save", { combatantId: "char-ch1" });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("downed");
  });

  it("end_combat deactivates combat and writes back HP", async () => {
    const result = await runTool("end_combat");
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    expect(saved.combat.active).toBe(false);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 10);
    expect(mock.pushEvent).toHaveBeenCalledWith("c1", "combat.ended", expect.anything());
  });

  it("end_combat fails without active combat", async () => {
    mock.states.set("c1", mock.defaultState());
    const result = await runTool("end_combat");
    expect(result.ok).toBe(false);
  });
});
