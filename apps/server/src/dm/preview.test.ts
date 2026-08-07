import { describe, expect, it, vi } from "vitest";
import type { CampaignState, Character } from "@domino/shared";
import type { DmContext } from "./types.js";
import { previewNarrate, shouldAutoGenerateCombat } from "./preview.js";

describe("shouldAutoGenerateCombat", () => {
  it("detects explicit combat intent", () => {
    expect(shouldAutoGenerateCombat("I attack the goblin")).toBe(true);
    expect(shouldAutoGenerateCombat("We charge into the ambush")).toBe(true);
    expect(shouldAutoGenerateCombat("I draw my sword")).toBe(true);
    expect(shouldAutoGenerateCombat("the bandits attack us!")).toBe(true);
  });

  it("detects common attack verbs", () => {
    expect(shouldAutoGenerateCombat("I slash at them!")).toBe(true);
    expect(shouldAutoGenerateCombat("I stab the guard")).toBe(true);
    expect(shouldAutoGenerateCombat("I shoot an arrow")).toBe(true);
    expect(shouldAutoGenerateCombat("I smash the door in")).toBe(true);
    expect(shouldAutoGenerateCombat("I cleave through them")).toBe(true);
    expect(shouldAutoGenerateCombat("I punch him")).toBe(true);
    expect(shouldAutoGenerateCombat("I lunge at her")).toBe(true);
    expect(shouldAutoGenerateCombat("I hit it hard")).toBe(true);
  });

  it('treats "hit" only as a whole word', () => {
    expect(shouldAutoGenerateCombat("hitching a ride")).toBe(false);
    expect(shouldAutoGenerateCombat("I hit the goblin")).toBe(true);
  });

  it('treats "kill" only as a whole word', () => {
    expect(shouldAutoGenerateCombat("I use my skills")).toBe(false);
    expect(shouldAutoGenerateCombat("I killed the goblin")).toBe(false);
    expect(shouldAutoGenerateCombat("kill the goblin")).toBe(true);
  });

  it("ignores peaceful messages", () => {
    expect(shouldAutoGenerateCombat("I look around the room")).toBe(false);
    expect(shouldAutoGenerateCombat("I talk to the innkeeper")).toBe(false);
    expect(shouldAutoGenerateCombat("we rest by the fire")).toBe(false);
    expect(shouldAutoGenerateCombat("I search the desk")).toBe(false);
  });
});

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
    members: [] as { characterId: string }[],
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
  getCampaignMembers: () => mock.members,
  getCampaignCharacters: () => mock.members.map((m) => mock.characters.get(m.characterId)),
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

function combatState(): CampaignState {
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
  };
}

function context(state: CampaignState): DmContext {
  return {
    campaignId: "c1",
    characters: [aria],
    state,
    recentMessages: [],
  };
}

describe("previewNarrate combat loop", () => {
  it("resolves a player's attack through the tools and advances the turn", async () => {
    mock.states.clear();
    mock.characters.clear();
    mock.pushEvent.mockReset();
    mock.characters.set("ch1", { ...aria });
    mock.states.set("c1", combatState());

    const reply = await previewNarrate(context(combatState()), "I attack the goblin");

    expect(reply.narration).not.toBe(
      `(DM preview) Combat is underway — describe an attack or say "end turn".`,
    );
    expect(reply.narration).toContain("turn");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "attack" }),
    );
  });

  it('advances the turn on an "end turn" message', async () => {
    mock.states.clear();
    mock.pushEvent.mockReset();
    mock.characters.set("ch1", { ...aria });
    mock.states.set("c1", combatState());

    const reply = await previewNarrate(context(combatState()), "end turn");

    expect(reply.narration).toContain("turn");
    expect(mock.pushEvent).toHaveBeenCalledWith("c1", "turn.advanced", expect.anything());
  });

  it("mentions combat for a non-combat message while combat is active", async () => {
    mock.states.clear();
    mock.pushEvent.mockReset();
    mock.characters.set("ch1", { ...aria });
    mock.states.set("c1", combatState());

    const reply = await previewNarrate(context(combatState()), "I look around the room");

    expect(reply.narration).toContain("Combat is underway");
  });

  it("rolls a death save when a downed hostile is on its turn", async () => {
    mock.states.clear();
    mock.characters.clear();
    mock.pushEvent.mockReset();
    mock.characters.set("ch1", { ...aria });
    const state = combatState();
    state.combat.turnIndex = 1;
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      currentHp: 0,
      status: "downed",
    };
    mock.states.set("c1", state);

    const reply = await previewNarrate(context(state), "I attack the goblin");

    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "death-save", combatant: "Goblin" }),
    );
    expect(mock.pushEvent).toHaveBeenCalledWith("c1", "turn.advanced", expect.anything());
    expect(reply.narration).toContain("Goblin");
  });

  it('resolves a "slash" combat message through the attack path', async () => {
    mock.states.clear();
    mock.characters.clear();
    mock.pushEvent.mockReset();
    mock.characters.set("ch1", { ...aria });
    mock.states.set("c1", combatState());

    const reply = await previewNarrate(context(combatState()), "I slash at the goblin!");

    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "attack" }),
    );
    expect(reply.narration).not.toBe(
      `(DM preview) Combat is underway — describe an attack or say "end turn".`,
    );
    expect(reply.narration).toContain("turn");
  });
});

describe("previewNarrate long rest and stable combatants", () => {
  it("triggers a long rest for a rest message outside combat", async () => {
    mock.states.clear();
    mock.characters.clear();
    mock.pushEvent.mockReset();
    mock.characters.set("ch1", { ...aria });
    mock.states.set("c1", mock.defaultState());

    const reply = await previewNarrate(context(mock.defaultState()), "We rest by the fire");

    expect(reply.narration).toContain("long rest");
    expect(reply.narration).toContain("recover");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "state.updated",
      expect.objectContaining({ action: "long_rest" }),
    );
    const saved = mock.states.get("c1")!;
    expect(saved.phase).toBe("exploration");
  });

  it('generates an encounter for "I attack the sleeping guard" instead of a long rest', async () => {
    mock.states.clear();
    mock.characters.clear();
    mock.members = [];
    mock.pushEvent.mockReset();
    mock.characters.set("ch1", { ...aria });
    mock.members = [{ characterId: "ch1" }];
    mock.states.set("c1", mock.defaultState());

    const reply = await previewNarrate(
      context(mock.defaultState()),
      "I attack the sleeping guard",
    );

    expect(reply.narration).not.toContain("long rest");
    expect(reply.narration).toContain("Combat begins");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "encounter.started",
      expect.objectContaining({ generated: true }),
    );
    const saved = mock.states.get("c1")!;
    expect(saved.combat.active).toBe(true);
  });

  it("advances the turn when the current combatant is stable", async () => {
    mock.states.clear();
    mock.characters.clear();
    mock.pushEvent.mockReset();
    mock.characters.set("ch1", { ...aria });
    const state = combatState();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      currentHp: 0,
      status: "stable",
      deathSaveSuccesses: 3,
      deathSaveFailures: 0,
    };
    mock.states.set("c1", state);

    const reply = await previewNarrate(context(state), "I attack the goblin");

    expect(mock.pushEvent).toHaveBeenCalledWith("c1", "turn.advanced", expect.anything());
    expect(mock.pushEvent).not.toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "attack" }),
    );
    expect(reply.narration).toContain("turn");
  });

  it("targets a downed enemy for a finishing blow", async () => {
    mock.states.clear();
    mock.characters.clear();
    mock.pushEvent.mockReset();
    mock.characters.set("ch1", { ...aria });
    const state = combatState();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      currentHp: 0,
      status: "downed",
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    };
    mock.states.set("c1", state);

    const reply = await previewNarrate(context(state), "I hit the goblin");

    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "attack", target: "Goblin" }),
    );
    expect(reply.narration).toContain("Goblin");
  });
});
