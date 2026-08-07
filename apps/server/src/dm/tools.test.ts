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
    updateCharacterHitDice: vi.fn(),
    grantXp: vi.fn(),
    grantLoot: vi.fn(),
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
  updateCharacterHitDice: mock.updateCharacterHitDice,
  grantXp: (id: string, amount: number) => mock.grantXp(id, amount),
  grantLoot: (id: string, gold: number, items: unknown[]) => mock.grantLoot(id, gold, items),
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
  mock.updateCharacterHitDice.mockReset();
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
  mock.grantLoot.mockReset();
  mock.grantLoot.mockImplementation(
    (
      id: string,
      gold: number,
      items: {
        name: string;
        quantity: number;
        weight?: number;
        description?: string;
      }[],
    ) => {
      const ch = mock.characters.get(id);
      if (!ch) return;
      const merged = [...(ch.inventory ?? [])];
      for (const item of items) {
        const match = merged.find(
          (i) =>
            i.name === item.name &&
            (i.description ?? undefined) === (item.description ?? undefined),
        );
        if (match) {
          match.quantity += item.quantity;
        } else {
          merged.push({
            id: `item-${merged.length + 1}`,
            name: item.name,
            quantity: item.quantity,
            weight: item.weight,
            description: item.description,
          });
        }
      }
      mock.characters.set(id, {
        ...ch,
        gold: (ch.gold ?? 0) + gold,
        inventory: merged,
      });
    },
  );
  mock.characters.set("ch1", { ...aria });
  mock.states.set("c1", stateWithCombat());
});

describe("runDmTool adventures (mocked store)", () => {
  it("get_character returns the character with its features", async () => {
    const result = await runTool("get_character", { characterId: "ch1" });
    expect(result.ok).toBe(true);
    const data = result.data as { features: { category: string }[] };
    expect(Array.isArray(data.features)).toBe(true);
    expect(data.features.length).toBeGreaterThan(0);
    expect(data.features.some((f) => f.category === "race")).toBe(true);
    expect(data.features.some((f) => f.category === "class")).toBe(true);
  });

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
  it("get_campaign_state reports per-monster attack counts", async () => {
    const state = stateWithCombat();
    state.combat.combatants = [
      {
        id: "troll-0",
        name: "Troll",
        isPlayer: false,
        initiative: 15,
        currentHp: 84,
        maxHp: 84,
        armorClass: 15,
        status: "active",
        deathSaveSuccesses: 0,
        deathSaveFailures: 0,
      },
      {
        id: "goblin-0",
        name: "Goblin",
        isPlayer: false,
        initiative: 10,
        currentHp: 7,
        maxHp: 7,
        armorClass: 15,
        status: "active",
        deathSaveSuccesses: 0,
        deathSaveFailures: 0,
      },
      {
        id: "enemy-xyz",
        name: "Custom Foe",
        isPlayer: false,
        initiative: 5,
        currentHp: 10,
        maxHp: 10,
        armorClass: 10,
        status: "active",
        deathSaveSuccesses: 0,
        deathSaveFailures: 0,
      },
    ];
    mock.states.set("c1", state);
    const result = await runTool("get_campaign_state");
    expect(result.ok).toBe(true);
    const data = result.data as {
      combat: { combatants: { id: string; attacks: number }[] };
    };
    const attacksById = new Map(
      data.combat.combatants.map((c) => [c.id, c.attacks]),
    );
    expect(attacksById.get("troll-0")).toBe(2);
    expect(attacksById.get("goblin-0")).toBe(1);
    expect(attacksById.get("enemy-xyz")).toBe(1);
  });

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
  const baseSpells = ["Cure Wounds", "Guiding Bolt", "Sacred Flame", "Spare the Dying"];

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
      spells: baseSpells,
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

  it("Hold Person applies paralyzed on a failed save", async () => {
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Hold Person"] }));
    const original = Math.random;
    Math.random = () => 0;
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Hold Person",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const goblin = saved.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions).toEqual(["paralyzed"]);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "spell",
        spell: "Hold Person",
        conditionApplied: "paralyzed",
      }),
    );
    expect(result.message).toContain("Sparaliżowany");
  });

  it("Hold Person does nothing on a successful save", async () => {
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Hold Person"] }));
    const original = Math.random;
    Math.random = () => 0.9;
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Hold Person",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const goblin = mock.states.get("c1")!.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions ?? []).not.toContain("paralyzed");
    expect(result.message).toContain("brak efektu");
  });

  it("Blindness/Deafness blinds on a failed save only", async () => {
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Blindness/Deafness"] }));
    const original = Math.random;
    Math.random = () => 0;
    const fail = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Blindness/Deafness",
      targetId: "enemy-1",
    });
    expect(fail.ok).toBe(true);
    let goblin = mock.states.get("c1")!.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions).toEqual(["blinded"]);

    mock.states.set("c1", clericCombatState());
    mock.characters.set(
      "ch2",
      cleric({ spells: [...baseSpells, "Blindness/Deafness"], spellSlotsUsed: [4, 1, 0, 0, 0] }),
    );
    Math.random = () => 0.9;
    const success = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Blindness/Deafness",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(success.ok).toBe(true);
    goblin = mock.states.get("c1")!.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions ?? []).not.toContain("blinded");
  });

  it("Lesser Restoration removes a condition from the target", async () => {
    const state = clericCombatState();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["poisoned"],
    };
    mock.states.set("c1", state);
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Lesser Restoration"] }));
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Lesser Restoration",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(true);
    const goblin = mock.states.get("c1")!.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions).toEqual([]);
    expect(result.message).toContain("usuwa stan");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "spell",
        spell: "Lesser Restoration",
        conditionRemoved: "poisoned",
      }),
    );
  });

  it("Revivify revives a dead combatant to 1 HP and active status", async () => {
    const state = clericCombatState();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      currentHp: 0,
      status: "dead",
      deathSaveSuccesses: 2,
      deathSaveFailures: 3,
    };
    mock.states.set("c1", state);
    mock.characters.set(
      "ch2",
      cleric({ level: 5, spells: [...baseSpells, "Revivify"] }),
    );
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Revivify",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(true);
    const goblin = mock.states.get("c1")!.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.currentHp).toBe(1);
    expect(goblin.status).toBe("active");
    expect(goblin.deathSaveFailures).toBe(0);
    expect(goblin.deathSaveSuccesses).toBe(0);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "spell", spell: "Revivify", revived: true }),
    );
  });

  it("Revivify revives a character outside combat with 1 HP", async () => {
    mock.states.set("c1", mock.defaultState());
    mock.characters.set(
      "ch2",
      cleric({ level: 5, spells: [...baseSpells, "Revivify"] }),
    );
    mock.characters.set("ch1", { ...aria, currentHp: 0 });
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Revivify",
      targetId: "ch1",
    });
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 1);
    expect(result.message).toContain("wraca do życia");
  });

  it("rejects Prayer of Healing during combat (10-minute ritual)", async () => {
    const state = clericCombatState();
    state.combat.combatants.push({
      id: "char-ch1",
      name: "Aria",
      characterId: "ch1",
      isPlayer: true,
      initiative: 12,
      currentHp: 4,
      maxHp: 10,
      armorClass: 15,
      status: "active",
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    });
    mock.states.set("c1", state);
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Prayer of Healing"] }));
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Prayer of Healing",
      targetId: "char-ch2",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("10 minut");
    expect(mock.updateCharacterSpellSlots).not.toHaveBeenCalled();
    expect(mock.updateCharacterHp).not.toHaveBeenCalled();
  });

  it("Prayer of Healing heals all member characters outside combat", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }, { characterId: "ch2" }]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", { ...aria, currentHp: 3 });
    mock.characters.set(
      "ch2",
      cleric({ spells: [...baseSpells, "Prayer of Healing"], currentHp: 15 }),
    );
    const original = Math.random;
    Math.random = () => 0.95;
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Prayer of Healing",
      targetId: "ch2",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 10);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch2", 20);
    expect(result.message).toContain("Aria odzyskuje");
  });

  it("does not consume a slot when healing an empty party outside combat", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set(
      "ch2",
      cleric({ spells: [...baseSpells, "Prayer of Healing"] }),
    );
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Prayer of Healing",
      targetId: "ch2",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Nie znaleziono postaci-celu");
    expect(mock.updateCharacterSpellSlots).not.toHaveBeenCalled();
  });

  it("rejects a condition spell outside combat", async () => {
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Hold Person"] }));
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Hold Person",
      targetId: "ch1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("walki");
    expect(mock.updateCharacterSpellSlots).not.toHaveBeenCalled();
  });

  it("rejects a cast by an incapacitated caster even on their turn", async () => {
    const state = clericCombatState();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      conditions: ["paralyzed"],
    };
    mock.states.set("c1", state);
    mock.characters.set(
      "ch2",
      cleric({ spells: [...baseSpells, "Hold Person"] }),
    );
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Hold Person",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("obezwładnion");
    expect(mock.updateCharacterSpellSlots).not.toHaveBeenCalled();
  });

  it("rejects Prayer of Healing during combat (10-minute ritual)", async () => {
    mock.characters.set(
      "ch2",
      cleric({ level: 5, spells: [...baseSpells, "Prayer of Healing"] }),
    );
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Prayer of Healing",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("10 minut");
    expect(mock.updateCharacterSpellSlots).not.toHaveBeenCalled();
  });
});

describe("runDmTool take_long_rest (mocked store)", () => {
  it("heals every campaign member to full and returns to exploration", async () => {
    mock.states.clear();
    mock.characters.clear();
    mock.pushEvent.mockReset();
    mock.updateCharacterHp.mockReset();
    mock.updateCharacterSpellSlots.mockReset();
    mock.updateCharacterHitDice.mockReset();
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
    mock.updateCharacterHitDice.mockReset();
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", stateWithCombat());

    const result = await runTool("take_long_rest", {});

    expect(result.ok).toBe(false);
    expect(result.message).toContain("walki");
    expect(mock.updateCharacterHp).not.toHaveBeenCalled();
    expect(mock.updateCharacterSpellSlots).not.toHaveBeenCalled();
    expect(mock.updateCharacterHitDice).not.toHaveBeenCalled();
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("resets spent Hit Dice to half of the level (minimum 1)", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", { ...aria, level: 3, hitDiceUsed: 3, currentHp: 4 });

    const result = await runTool("take_long_rest", {});

    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHitDice).toHaveBeenCalledWith("ch1", 2);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 10);
  });

  it("never resets Hit Dice below zero at level 1", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", { ...aria, level: 1, hitDiceUsed: 1 });

    const result = await runTool("take_long_rest", {});

    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHitDice).toHaveBeenCalledWith("ch1", 0);
  });

  it("mentions Hit Dice in the narration", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", mock.defaultState());

    const result = await runTool("take_long_rest", {});

    expect(result.ok).toBe(true);
    expect(result.message).toContain("kości życia");
  });
});

describe("runDmTool conditions (mocked store)", () => {
  it("apply_condition adds the condition, saves state and pushes an event", async () => {
    const result = await runTool("apply_condition", {
      combatantId: "enemy-1",
      condition: "prone",
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("otrzymuje stan");
    expect(result.message).toContain("Powalony");
    const saved = mock.states.get("c1")!;
    const goblin = saved.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions).toEqual(["prone"]);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "condition",
        action: "apply",
        combatant: "Goblin",
        condition: "prone",
      }),
    );
  });

  it("apply_condition dedupes an existing condition", async () => {
    await runTool("apply_condition", { combatantId: "enemy-1", condition: "prone" });
    await runTool("apply_condition", { combatantId: "enemy-1", condition: "prone" });
    const saved = mock.states.get("c1")!;
    const goblin = saved.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions).toEqual(["prone"]);
  });

  it("apply_condition rejects an unknown condition and lists the available labels", async () => {
    const result = await runTool("apply_condition", {
      combatantId: "enemy-1",
      condition: "teleport",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Nieznany stan");
    expect(result.message).toContain("Ślepota");
    expect(result.message).toContain("Nieprzytomny");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("apply_condition rejects without active combat", async () => {
    mock.states.set("c1", mock.defaultState());
    const result = await runTool("apply_condition", {
      combatantId: "enemy-1",
      condition: "prone",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Brak walki");
  });

  it("remove_condition clears the condition and pushes an event", async () => {
    await runTool("apply_condition", { combatantId: "enemy-1", condition: "prone" });
    const result = await runTool("remove_condition", {
      combatantId: "enemy-1",
      condition: "prone",
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("traci stan");
    expect(result.message).toContain("Powalony");
    const saved = mock.states.get("c1")!;
    const goblin = saved.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions).toEqual([]);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "condition",
        action: "remove",
        combatant: "Goblin",
        condition: "prone",
      }),
    );
  });

  it("remove_condition also removes the internal guiding_bolt marker", async () => {
    const state = stateWithCombat();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["guiding_bolt"],
    };
    mock.states.set("c1", state);
    const result = await runTool("remove_condition", {
      combatantId: "enemy-1",
      condition: "guiding_bolt",
    });
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const goblin = saved.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions).toEqual([]);
  });
});

describe("runDmTool take_short_rest (mocked store)", () => {
  function fighter(overrides: Partial<Character> = {}): Character {
    return {
      ...aria,
      level: 3,
      currentHp: 5,
      maxHp: 20,
      hitDiceUsed: 0,
      abilityScores: { ...aria.abilityScores, constitution: 14 },
      ...overrides,
    };
  }

  it("heals with spent Hit Dice and updates hitDiceUsed", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", fighter());
    const seq = [0, 0, 0]; // 1d10 = 1 each -> (1 + 2 CON) * 3 = 9
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const result = await runTool("take_short_rest", { hitDice: 3 });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Krótki odpoczynek");
    expect(result.message).toContain("odzyskuje 9 punktów życia");
    expect(result.message).toContain("spędzone kości: 3");
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 14);
    expect(mock.updateCharacterHitDice).toHaveBeenCalledWith("ch1", 3);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "short-rest",
        healed: [{ name: "Aria", healed: 9, diceSpent: 3 }],
      }),
    );
  });

  it("caps spent dice at the character's available Hit Dice", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", fighter({ hitDiceUsed: 1 }));
    const seq = [0, 0]; // 2 dice
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const result = await runTool("take_short_rest", { hitDice: 5 });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 11);
    expect(mock.updateCharacterHitDice).toHaveBeenCalledWith("ch1", 3);
  });

  it("clamps healing to max HP", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", fighter({ currentHp: 17 }));
    const seq = [0.95, 0.95, 0.95]; // 1d10 = 10 each -> (10 + 2) * 3 = 36
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const result = await runTool("take_short_rest", { hitDice: 3 });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 20);
    expect(result.message).toContain("odzyskuje 3 punktów życia");
  });

  it("rejects resting during combat", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    const result = await runTool("take_short_rest", { hitDice: 2 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("walki");
    expect(mock.updateCharacterHp).not.toHaveBeenCalled();
    expect(mock.updateCharacterHitDice).not.toHaveBeenCalled();
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("reports when nobody has Hit Dice to spend", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", fighter({ hitDiceUsed: 3 }));
    const result = await runTool("take_short_rest", {});
    expect(result.ok).toBe(true);
    expect(result.message).toContain("nikt nie ma kości życia");
    expect(mock.updateCharacterHp).not.toHaveBeenCalled();
    expect(mock.updateCharacterHitDice).not.toHaveBeenCalled();
  });

  it("does not spend Hit Dice on characters at full HP", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", fighter({ currentHp: 20 }));
    const result = await runTool("take_short_rest", { hitDice: 3 });
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHp).not.toHaveBeenCalled();
    expect(mock.updateCharacterHitDice).not.toHaveBeenCalled();
  });

  it("validates the hitDice argument", async () => {
    mock.states.set("c1", mock.defaultState());
    const result = await runTool("take_short_rest", { hitDice: 0 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("hitDice");
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
        levelUps: [],
      }),
    );
  });

  it("end_combat reports level-ups in the xp-award payload", async () => {
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
    mock.characters.set("ch1", { ...aria, xp: 290 });

    const result = await runTool("end_combat");
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Aria osiąga poziom 2!");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "xp-award",
        source: "combat",
        levelUps: [{ characterId: "ch1", name: "Aria", level: 2, className: "Fighter" }],
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
        levelUps: [],
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
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "xp-award",
        levelUps: [{ characterId: "ch1", name: "Aria", level: 2, className: "Fighter" }],
      }),
    );
  });
});

describe("runDmTool grant_loot (mocked store)", () => {
  beforeEach(() => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }, { characterId: "ch2" }]);
    mock.characters.set("ch1", {
      ...aria,
      gold: 10,
      inventory: [{ id: "i1", name: "Rope", quantity: 1 }],
    });
    mock.characters.set("ch2", { ...aria, id: "ch2", name: "Bran", gold: 0, inventory: [] });
  });

  it("grants gold and items to a target character", async () => {
    const result = await runTool("grant_loot", {
      characterId: "ch1",
      gold: 50,
      items: [{ name: "Healing Potion", quantity: 2 }],
    });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Nagroda: 50 sztuk złota oraz 2× Healing Potion.");
    const ch = mock.characters.get("ch1")!;
    expect(ch.gold).toBe(60);
    expect(ch.inventory).toEqual([
      expect.objectContaining({ name: "Rope", quantity: 1 }),
      expect.objectContaining({ name: "Healing Potion", quantity: 2 }),
    ]);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "loot", characterId: "ch1", gold: 50, items: [
        { name: "Healing Potion", quantity: 2 },
      ] }),
    );
  });

  it("merges items with the same name and description", async () => {
    const first = await runTool("grant_loot", {
      characterId: "ch1",
      gold: 0,
      items: [{ name: "Rope", quantity: 2 }],
    });
    expect(first.ok).toBe(true);
    const second = await runTool("grant_loot", {
      characterId: "ch1",
      gold: 0,
      items: [{ name: "Rope", quantity: 3 }],
    });
    expect(second.ok).toBe(true);
    const ch = mock.characters.get("ch1")!;
    expect(ch.inventory).toEqual([
      expect.objectContaining({ name: "Rope", quantity: 6 }),
    ]);
  });

  it("splits gold among all members when characterId is omitted", async () => {
    const result = await runTool("grant_loot", {
      gold: 100,
      items: [{ name: "Gem", quantity: 1 }],
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Każdy członek drużyny otrzymuje 50 złota");
    expect(mock.characters.get("ch1")!.gold).toBe(60);
    expect(mock.characters.get("ch2")!.gold).toBe(50);
    const ch1 = mock.characters.get("ch1")!;
    expect(ch1.inventory).toEqual([
      expect.objectContaining({ name: "Rope", quantity: 1 }),
      expect.objectContaining({ name: "Gem", quantity: 1 }),
    ]);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "loot", characterId: "ch1", gold: 50 }),
    );
  });

  it("rejects when neither gold nor items are provided", async () => {
    const result = await runTool("grant_loot", {});
    expect(result.ok).toBe(false);
    expect(result.message).toContain("złota");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("rejects malformed item schemas", async () => {
    const result = await runTool("grant_loot", { gold: 10, items: [{ name: "", quantity: 0 }] });
    expect(result.ok).toBe(false);
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("rejects an unknown characterId", async () => {
    const result = await runTool("grant_loot", { characterId: "ghost", gold: 10 });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Nie znaleziono postaci.");
  });
});
