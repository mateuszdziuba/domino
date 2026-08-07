import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignState, Character } from "@domino/shared";
import { applyLevelUp } from "../rules/advancement.js";

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
    updateCharacterSpellSlots: vi.fn(),
    grantXp: vi.fn(),
    members: vi.fn(() => [] as { characterId: string }[]),
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
  updateCharacterSpellSlots: mock.updateCharacterSpellSlots,
  grantXp: (id: string, amount: number) => mock.grantXp(id, amount),
  getCharacterById: (id: string) => mock.characters.get(id),
  getCampaignForUser: () => ({ id: "c1" }),
  getCampaignMembers: mock.members,
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
  mock.updateCharacterSpellSlots.mockReset();
  mock.grantXp.mockReset();
  mock.grantXp.mockImplementation((id: string, amount: number) => {
    const ch = mock.characters.get(id);
    if (!ch) return { xp: 0, level: 1 };
    const result = applyLevelUp({
      xp: (ch.xp ?? 0) + amount,
      level: ch.level,
      className: ch.className,
      constitution: ch.abilityScores.constitution,
    });
    mock.characters.set(id, {
      ...ch,
      xp: result.newXp,
      level: result.newLevel,
      maxHp: result.leveledUp ? ch.maxHp + result.maxHpDelta : ch.maxHp,
      proficiencyBonus: result.newProficiency,
    });
    return { xp: result.newXp, level: result.newLevel };
  });
  mock.characters.set("ch1", { ...aria });
  mock.states.set("c1", stateWithCombat());
});

describe("runDmTool adventures (mocked store)", () => {
  it("start_adventure patches location/scene/worldProgress and pushes state.updated", async () => {
    const result = await runTool("start_adventure", { title: "A Most Potent Brew" });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Rozpoczynacie przygodę: A Most Potent Brew");
    const saved = mock.states.get("c1")!;
    expect(saved.location).toBe("Karczma \"Pod Złotym Kuflem\"");
    expect(saved.scene.length).toBeGreaterThan(0);
    expect(saved.worldProgress).toContain("Przygoda: A Most Potent Brew");
    expect(saved.notes.length).toBeGreaterThan(0);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "state.updated",
      expect.objectContaining({ by: "dm" }),
    );
  });

  it("start_adventure keeps combat state intact", async () => {
    const result = await runTool("start_adventure", { title: "wolves" });
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    expect(saved.combat.active).toBe(true);
    expect(saved.combat.combatants.map((c) => c.name)).toContain("Goblin");
  });

  it("start_adventure rejects an unknown title with the available list", async () => {
    const result = await runTool("start_adventure", { title: "Przygoda o kotach" });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("biblioteki");
    expect(result.message).toContain("A Most Potent Brew");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("create_adventure writes the description into scene and notes", async () => {
    const result = await runTool("create_adventure", {
      description: "Smocze gniazdo w ruinach nad jeziorem",
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Tworzę nową przygodę");
    const saved = mock.states.get("c1")!;
    expect(saved.location).toBe("Nieznane miejsce");
    expect(saved.scene).toBe("Smocze gniazdo w ruinach nad jeziorem");
    expect(saved.notes).toBe("Smocze gniazdo w ruinach nad jeziorem");
    expect(saved.worldProgress[0]).toContain("Nowa przygoda");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "state.updated",
      expect.objectContaining({ by: "dm" }),
    );
  });

  it("create_adventure rejects a too-short description", async () => {
    const result = await runTool("create_adventure", { description: "ok" });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Opisz");
  });
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

describe("runDmTool cast_spell (mocked store)", () => {
  function cleric(overrides: Partial<Character> = {}): Character {
    return {
      id: "ch2",
      userId: "u2",
      name: "Elara",
      race: "Human",
      className: "Cleric",
      level: 3,
      abilityScores: {
        strength: 10,
        dexterity: 10,
        constitution: 13,
        intelligence: 10,
        wisdom: 16,
        charisma: 12,
      },
      maxHp: 20,
      currentHp: 20,
      armorClass: 15,
      speed: 30,
      proficiencyBonus: 2,
      skills: {},
      inventory: [],
      spells: ["Cure Wounds", "Guiding Bolt", "Sacred Flame", "Spare the Dying"],
      spellSlotsUsed: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      ...overrides,
    };
  }

  function clericCombatState(overrides: Partial<CampaignState> = {}): CampaignState {
    return {
      ...mock.defaultState(),
      phase: "combat",
      combat: {
        active: true,
        turnIndex: 0,
        round: 1,
        combatants: [
          {
            id: "char-ch2",
            name: "Elara",
            characterId: "ch2",
            isPlayer: true,
            initiative: 18,
            currentHp: 20,
            maxHp: 20,
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

  beforeEach(() => {
    mock.characters.set("ch2", cleric());
    mock.states.set("c1", clericCombatState());
  });

  it("casts a known spell on the current combatant's turn and consumes a slot", async () => {
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterSpellSlots).toHaveBeenCalledWith("ch2", [1]);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "spell",
        spell: "Guiding Bolt",
        caster: "Elara",
        target: "Goblin",
      }),
    );
  });

  it("refuses an off-turn cast without consuming a slot", async () => {
    const state = clericCombatState();
    state.combat.turnIndex = 1;
    mock.states.set("c1", state);
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("tura");
    expect(mock.updateCharacterSpellSlots).not.toHaveBeenCalled();
  });

  it("rejects a spell unknown to the rules engine", async () => {
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Fireball",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("nie jest znane silnikowi zasad");
  });

  it("rejects a known spell the character does not know", async () => {
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Healing Word",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("nie zna tego zaklęcia");
  });

  it("rejects a cast when no slots are left for that level", async () => {
    mock.characters.set("ch2", cleric({ spellSlotsUsed: [4, 2, 0, 0, 0] }));
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("slotów");
  });

  it("casts a cantrip without consuming a slot", async () => {
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Sacred Flame",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterSpellSlots).not.toHaveBeenCalled();
  });

  it("heals a character outside combat", async () => {
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch2", cleric({ currentHp: 5 }));
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Cure Wounds",
      targetId: "ch2",
    });
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch2", expect.any(Number));
  });

  it("rejects a damage spell outside combat", async () => {
    mock.states.set("c1", mock.defaultState());
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("walki");
  });

  it("rejects a stabilize spell outside combat", async () => {
    mock.states.set("c1", mock.defaultState());
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Spare the Dying",
      targetId: "ch2",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("walce");
  });
});

describe("runDmTool take_long_rest (mocked store)", () => {
  it("heals every campaign member to full and returns to exploration", async () => {
    mock.states.clear();
    mock.characters.clear();
    mock.pushEvent.mockReset();
    mock.updateCharacterHp.mockReset();
    mock.updateCharacterSpellSlots.mockReset();
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }, { characterId: "ch2" }]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", { ...aria, currentHp: 3, maxHp: 10 });
    mock.characters.set("ch2", { ...aria, id: "ch2", name: "Bran", currentHp: 5, maxHp: 12 });

    const result = await runTool("take_long_rest", {});

    expect(result.ok).toBe(true);
    expect(result.message).toContain("odpoczywa");
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 10);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch2", 12);
    expect(mock.updateCharacterSpellSlots).toHaveBeenCalledWith("ch1", []);
    expect(mock.updateCharacterSpellSlots).toHaveBeenCalledWith("ch2", []);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "state.updated",
      expect.objectContaining({ action: "long_rest", healed: ["Aria", "Bran"] }),
    );
    const saved = mock.states.get("c1")!;
    expect(saved.phase).toBe("exploration");
    expect(saved.combat.active).toBe(false);
  });

  it("rejects resting during active combat", async () => {
    mock.states.clear();
    mock.characters.clear();
    mock.pushEvent.mockReset();
    mock.updateCharacterHp.mockReset();
    mock.updateCharacterSpellSlots.mockReset();
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", stateWithCombat());

    const result = await runTool("take_long_rest", {});

    expect(result.ok).toBe(false);
    expect(result.message).toContain("walki");
    expect(mock.updateCharacterHp).not.toHaveBeenCalled();
    expect(mock.updateCharacterSpellSlots).not.toHaveBeenCalled();
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });
});

describe("runDmTool XP award (mocked store)", () => {
  beforeEach(() => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }, { characterId: "ch2" }]);
    mock.characters.set("ch2", { ...aria, id: "ch2", name: "Bran" });
  });

  it("end_combat splits dead-enemy XP equally and pushes an xp-award event", async () => {
    const state = stateWithCombat();
    state.combat.combatants.push({
      id: "enemy-2",
      name: "Bugbear",
      isPlayer: false,
      initiative: 3,
      currentHp: 0,
      maxHp: 27,
      armorClass: 16,
      cr: 1,
      status: "dead",
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    });
    mock.states.set("c1", state);

    const result = await runTool("end_combat");
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Drużyna zdobywa 200 XP (100 na osobę)");
    expect(mock.characters.get("ch1")!.xp).toBe(100);
    expect(mock.characters.get("ch2")!.xp).toBe(100);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "xp-award",
        source: "combat",
        total: 200,
        perCharacter: 100,
      }),
    );
  });

  it("end_combat awards no XP when nothing with a CR died", async () => {
    const result = await runTool("end_combat");
    expect(result.ok).toBe(true);
    expect(result.message).not.toContain("XP");
    expect(mock.grantXp).not.toHaveBeenCalled();
  });

  it("award_xp splits the amount equally and validates it", async () => {
    const result = await runTool("award_xp", { amount: 100, reason: "saving the village" });
    expect(result.ok).toBe(true);
    expect(result.message).toBe(
      "Drużyna zdobywa 100 XP (50 na osobę) za saving the village.",
    );
    expect(mock.characters.get("ch1")!.xp).toBe(50);
    expect(mock.characters.get("ch2")!.xp).toBe(50);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "xp-award",
        source: "award_xp",
        amount: 100,
        reason: "saving the village",
        perCharacter: 50,
      }),
    );

    const bad = await runTool("award_xp", { amount: 0 });
    expect(bad.ok).toBe(false);
  });

  it("award_xp rejects when the campaign has no characters", async () => {
    mock.members.mockReturnValue([]);
    const result = await runTool("award_xp", { amount: 100 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Brak postaci");
  });

  it("award_xp narration reports level-ups with the HP gain", async () => {
    mock.characters.set("ch1", { ...aria, xp: 290 });
    const result = await runTool("award_xp", { amount: 100 });
    expect(result.ok).toBe(true);
    const ariaNow = mock.characters.get("ch1")!;
    expect(ariaNow.xp).toBe(340);
    expect(ariaNow.level).toBe(2);
    expect(ariaNow.maxHp).toBe(18);
    expect(result.message).toContain("Aria osiąga poziom 2!");
  });
});
