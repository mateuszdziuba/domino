import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignState, Character } from "@domino/shared";
import { applyLevelUp } from "../rules/advancement.js";
import { MONSTERS } from "../rules/monsters.js";

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
    updateCharacterExhaustion: vi.fn(),
    updateCharacterInspiration: vi.fn(),
    updateCharacterInventory: vi.fn(),
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
  updateCharacterExhaustion: mock.updateCharacterExhaustion,
  updateCharacterInspiration: mock.updateCharacterInspiration,
  updateCharacterInventory: (id: string, inventory: unknown[]) =>
    mock.updateCharacterInventory(id, inventory),
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
          bonusActionAvailable: true,
          attacksLeft: 1,
          attacksPerTurn: 1,
          speed: 30,
          movementLeft: 30,
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
          speed: 30,
          movementLeft: 30,
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
  mock.updateCharacterExhaustion.mockReset();
  mock.updateCharacterInspiration.mockReset();
  mock.updateCharacterInventory.mockReset();
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
        slot?: string;
        attuned?: boolean;
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
            slot: item.slot,
            attuned: item.attuned,
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
  it("get_campaign_state reports per-combatant attack budgets", async () => {
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
        attacksPerTurn: 2,
        attacksLeft: 2,
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
        attacksPerTurn: 1,
        attacksLeft: 1,
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
      combat: {
        combatants: { id: string; attacksPerTurn: number; attacksLeft: number }[];
      };
    };
    const attacksById = new Map(
      data.combat.combatants.map((c) => [c.id, c]),
    );
    expect(attacksById.get("troll-0")!.attacksPerTurn).toBe(2);
    expect(attacksById.get("troll-0")!.attacksLeft).toBe(2);
    expect(attacksById.get("goblin-0")!.attacksPerTurn).toBe(1);
    expect(attacksById.get("goblin-0")!.attacksLeft).toBe(1);
    expect(attacksById.get("enemy-xyz")!.attacksPerTurn).toBe(1);
    expect(attacksById.get("enemy-xyz")!.attacksLeft).toBe(1);
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
    expect(result.message).toContain("To nie tura tego kombatanta.");
  });

  it("attack_combatant rejects a missing target", async () => {
    const result = await runTool("attack_combatant", { attackerId: "char-ch1" });
    expect(result.ok).toBe(false);
  });

  it("attack_combatant refuses a second attack in the same turn", async () => {
    const original = Math.random;
    Math.random = () => 0.5;
    const first = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(first.ok).toBe(true);
    const second = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(second.ok).toBe(false);
    expect(second.message).toContain("nie ma już akcji ataku");
  });

  it("attack_combatant spends the action on a miss and reports attacksLeft in the event", async () => {
    const original = Math.random;
    Math.random = () => 0.01; // d20 = 1 -> miss, but the action is still spent
    const result = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const aria = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(aria.attacksLeft).toBe(0);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "attack", attacksLeft: 0 }),
    );
  });

  it("advance_turn refreshes only the new current combatant's attacksLeft", async () => {
    const original = Math.random;
    Math.random = () => 0.01; // miss keeps the goblin alive
    await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    let saved = mock.states.get("c1")!;
    const aria = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(aria.attacksLeft).toBe(0);
    const result = await runTool("advance_turn");
    expect(result.ok).toBe(true);
    saved = mock.states.get("c1")!;
    const goblin = saved.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.attacksLeft).toBe(1);
    expect(saved.combat.combatants.find((c) => c.id === "char-ch1")!.attacksLeft).toBe(0);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "turn.advanced",
      expect.objectContaining({
        turnOf: { id: "enemy-1", name: "Goblin" },
        attacksLeft: 1,
        attacksPerTurn: 1,
      }),
    );
  });

  it("a troll with Multiattack attacks twice, then the third attack is refused", async () => {
    const state = stateWithCombat();
    state.combat.combatants = [
      {
        id: "troll-0",
        name: "Troll",
        isPlayer: false,
        initiative: 18,
        currentHp: 84,
        maxHp: 84,
        armorClass: 15,
        status: "active",
        attacksPerTurn: 2,
        attacksLeft: 2,
      },
      {
        id: "char-ch1",
        name: "Aria",
        characterId: "ch1",
        isPlayer: true,
        initiative: 5,
        currentHp: 10,
        maxHp: 10,
        armorClass: 15,
        status: "active",
      },
    ];
    mock.states.set("c1", state);
    const original = Math.random;
    Math.random = () => 0.01; // both attacks miss
    const first = await runTool("attack_combatant", {
      attackerId: "troll-0",
      targetId: "char-ch1",
    });
    expect(first.ok).toBe(true);
    const second = await runTool("attack_combatant", {
      attackerId: "troll-0",
      targetId: "char-ch1",
    });
    expect(second.ok).toBe(true);
    const third = await runTool("attack_combatant", {
      attackerId: "troll-0",
      targetId: "char-ch1",
    });
    Math.random = original;
    expect(third.ok).toBe(false);
    expect(third.message).toContain("nie ma już akcji ataku");
    const troll = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "troll-0")!;
    expect(troll.attacksLeft).toBe(0);
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
    expect(result.message).toContain("Kombatant nie jest powalony.");
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

describe("runDmTool encounter generation (mocked store)", () => {
  beforeEach(() => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", mock.defaultState());
  });

  it("generate_encounter carries monster traits onto the saved combatants", async () => {
    const result = await runTool("generate_encounter", {
      description: "a troll blocks the bridge",
    });
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const troll = saved.combat.combatants.find((c) => c.id === "troll-0");
    expect(troll).toBeDefined();
    expect(troll!.traits).toContain("regeneration");
  });

  it("generate_encounter sets attack budgets (troll 2, goblin 1, Fighter 5 → 2)", async () => {
    mock.characters.set("ch1", { ...aria, level: 5 });
    const result = await runTool("generate_encounter", {
      description: "a troll tribe",
    });
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const byId = new Map(saved.combat.combatants.map((c) => [c.id, c]));
    expect(byId.get("troll-0")!.attacksPerTurn).toBe(2);
    expect(byId.get("troll-0")!.attacksLeft).toBe(2);
    expect(byId.get("goblin-0")!.attacksPerTurn).toBe(1);
    expect(byId.get("char-ch1")!.attacksPerTurn).toBe(2);
    expect(byId.get("char-ch1")!.attacksLeft).toBe(2);
  });

  it("generate_encounter gives PCs darkvision by race (Elf true, Human false)", async () => {
    mock.characters.set("ch1", { ...aria, race: "Elf" });
    let result = await runTool("generate_encounter", {
      description: "goblins in a cave",
    });
    expect(result.ok).toBe(true);
    let saved = mock.states.get("c1")!;
    const elf = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(elf.darkvision).toBe(true);
    mock.characters.set("ch1", { ...aria, race: "Human" });
    mock.states.set("c1", mock.defaultState());
    result = await runTool("generate_encounter", {
      description: "goblins in a cave",
    });
    expect(result.ok).toBe(true);
    saved = mock.states.get("c1")!;
    const human = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(human.darkvision).toBe(false);
  });

  it("random_encounter starts combat with monsters and pushes an encounter.started event", async () => {
    const result = await runTool("random_encounter", {});
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Losowe spotkanie");
    const saved = mock.states.get("c1")!;
    expect(saved.combat.active).toBe(true);
    expect(saved.combat.combatants.some((c) => !c.isPlayer)).toBe(true);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "encounter.started",
      expect.objectContaining({ generated: true, random: true }),
    );
  });

  it("random_encounter filters kinds by terrain", async () => {
    const result = await runTool("random_encounter", { terrain: "cave" });
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const caveKinds = MONSTERS.filter((m) => m.tags.includes("cave"));
    for (const c of saved.combat.combatants.filter((c) => !c.isPlayer)) {
      const kind = MONSTERS.find((m) => c.id.startsWith(`${m.key}-`));
      expect(kind, c.id).toBeDefined();
      expect(caveKinds.some((m) => m.key === kind!.key), c.id).toBe(true);
    }
  });

  it("random_encounter uses the description as the encounter label", async () => {
    const result = await runTool("random_encounter", {
      description: "Szmer w ciemności",
    });
    expect(result.ok).toBe(true);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "encounter.started",
      expect.objectContaining({ description: "Szmer w ciemności" }),
    );
  });

  it("advance_turn reports regenerated HP for a troll", async () => {
    mock.states.set("c1", {
      ...mock.defaultState(),
      phase: "combat",
      combat: {
        active: true,
        round: 1,
        turnIndex: 0,
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
          },
          {
            id: "troll-0",
            name: "Troll",
            isPlayer: false,
            initiative: 5,
            currentHp: 10,
            maxHp: 84,
            armorClass: 15,
            status: "active",
            traits: ["regeneration"],
          },
        ],
      },
    });
    const result = await runTool("advance_turn");
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const troll = saved.combat.combatants.find((c) => c.id === "troll-0")!;
    expect(troll.currentHp).toBe(20);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "turn.advanced",
      expect.objectContaining({ regenerated: 10, turnOf: { id: "troll-0", name: "Troll" } }),
    );
  });

  it("summarizeState includes the combatants' traits", async () => {
    mock.states.set("c1", {
      ...mock.defaultState(),
      phase: "combat",
      combat: {
        active: true,
        round: 1,
        turnIndex: 0,
        combatants: [
          {
            id: "troll-0",
            name: "Troll",
            isPlayer: false,
            initiative: 15,
            currentHp: 84,
            maxHp: 84,
            armorClass: 15,
            status: "active",
            traits: ["regeneration", "keen_senses"],
          },
        ],
      },
    });
    const result = await runTool("get_campaign_state");
    expect(result.ok).toBe(true);
    const data = result.data as {
      combat: { combatants: { id: string; traits: string[] }[] };
    };
    const troll = data.combat.combatants.find((c) => c.id === "troll-0")!;
    expect(troll.traits).toEqual(["regeneration", "keen_senses"]);
  });
});

describe("runDmTool attack_combatant weapon derivation (mocked store)", () => {
  function withLongsword() {
    mock.characters.set("ch1", {
      ...aria,
      inventory: [{ id: "i1", name: "Longsword", quantity: 1, slot: "weapon" }],
    });
  }

  it("derives the attack from the equipped weapon (Longsword 1d10 + STR)", async () => {
    withLongsword();
    const original = Math.random;
    Math.random = () => 0.9; // d20 = 19, 1d10 = 10
    const result = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const data = result.data as { attackTotal: number; damageTotal: number };
    expect(data.attackTotal).toBe(24); // 19 + prof 2 + STR 3
    expect(data.damageTotal).toBe(13); // 1d10 (10) + STR 3, not 1d8
  });

  it("keeps the 1d8 + STR fallback when no weapon is equipped", async () => {
    const original = Math.random;
    Math.random = () => 0.9; // d20 = 19, 1d8 = 8
    const result = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const data = result.data as { damageTotal: number };
    expect(data.damageTotal).toBe(11); // 1d8 (8) + STR 3
  });

  it("explicit damageNotation still overrides the equipped weapon", async () => {
    withLongsword();
    const original = Math.random;
    Math.random = () => 0.9; // 1d4 = 4
    const result = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
      damageNotation: "1d4",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const data = result.data as { damageTotal: number };
    expect(data.damageTotal).toBe(7); // 1d4 (4) + STR 3, not the Longsword 13
  });
});

describe("runDmTool bonus_attack (mocked store)", () => {
  function dualWielder(overrides: Partial<Character> = {}): Character {
    return {
      ...aria,
      inventory: [
        { id: "i1", name: "Shortsword", quantity: 1, slot: "weapon" },
        { id: "i2", name: "Shortsword", quantity: 1, slot: "offhand" },
      ],
      ...overrides,
    };
  }

  it("resolves a two-weapon-fighting bonus attack with no damage bonus", async () => {
    mock.characters.set("ch1", dualWielder());
    const original = Math.random;
    Math.random = () => 0.9; // d20 = 19, 1d6 = 6
    const result = await runTool("bonus_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toContain("wykonuje dodatkowy atak Shortsword");
    const data = result.data as { attackTotal: number; damageTotal: number };
    expect(data.attackTotal).toBe(24); // 19 + prof 2 + STR 3 (finesse picks the higher mod)
    expect(data.damageTotal).toBe(6); // 1d6 (6) + 0, no STR bonus on the off-hand
    const saved = mock.states.get("c1")!;
    const ariaCombatant = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(ariaCombatant.bonusActionAvailable).toBe(false);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "bonus-attack",
        attacker: "Aria",
        target: "Goblin",
      }),
    );
  });

  it("refuses a second bonus action in the same turn", async () => {
    mock.characters.set("ch1", dualWielder());
    const original = Math.random;
    Math.random = () => 0.9;
    const first = await runTool("bonus_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(first.ok).toBe(true);
    const second = await runTool("bonus_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(second.ok).toBe(false);
    expect(second.message).toContain("akcji dodatkowej");
  });

  it("refuses when only one weapon is equipped", async () => {
    mock.characters.set("ch1", {
      ...aria,
      inventory: [{ id: "i1", name: "Shortsword", quantity: 1, slot: "weapon" }],
    });
    const result = await runTool("bonus_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("dwóch broni");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("refuses when a weapon lacks the light property", async () => {
    mock.characters.set("ch1", {
      ...aria,
      inventory: [
        { id: "i1", name: "Longsword", quantity: 1, slot: "weapon" },
        { id: "i2", name: "Dagger", quantity: 1, slot: "offhand" },
      ],
    });
    const result = await runTool("bonus_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("lekkich");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("refuses a monster attacker", async () => {
    const state = stateWithCombat();
    state.combat.turnIndex = 1; // Goblin is the current combatant
    mock.states.set("c1", state);
    const result = await runTool("bonus_attack", {
      attackerId: "enemy-1",
      targetId: "char-ch1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Potwory");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("refuses an off-turn attacker", async () => {
    mock.characters.set("ch1", dualWielder());
    const state = stateWithCombat();
    state.combat.turnIndex = 1;
    mock.states.set("c1", state);
    const result = await runTool("bonus_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("tura");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("refuses a dead target", async () => {
    mock.characters.set("ch1", dualWielder());
    const state = stateWithCombat();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      currentHp: 0,
      status: "dead",
    };
    mock.states.set("c1", state);
    const result = await runTool("bonus_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("martwy");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("keeps the action attack intact for the same turn", async () => {
    mock.characters.set("ch1", dualWielder());
    const original = Math.random;
    Math.random = () => 0.9;
    const bonus = await runTool("bonus_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(bonus.ok).toBe(true);
    const attack = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(attack.ok).toBe(true);
    const aria = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(aria.attacksLeft).toBe(0);
  });
});

describe("runDmTool opportunity_attack (mocked store)", () => {
  it("resolves an off-turn reaction attack and consumes the attacker's reaction", async () => {
    const state = stateWithCombat();
    state.combat.turnIndex = 1;
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      reactionAvailable: true,
    };
    mock.states.set("c1", state);
    const original = Math.random;
    Math.random = () => 0.9; // d20 = 19, 1d8 = 8
    const result = await runTool("opportunity_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toContain("atak okazyjny");
    const saved = mock.states.get("c1")!;
    const aria = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(aria.reactionAvailable).toBe(false);
    const goblin = saved.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.currentHp).toBeLessThanOrEqual(7);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "opportunity-attack",
        attacker: "Aria",
        target: "Goblin",
      }),
    );
  });

  it("refuses an attacker that already used its reaction this round", async () => {
    const state = stateWithCombat();
    state.combat.turnIndex = 1;
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      reactionAvailable: false,
    };
    mock.states.set("c1", state);
    const result = await runTool("opportunity_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("reakcję");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("refuses the current combatant (a reaction is off-turn)", async () => {
    const result = await runTool("opportunity_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("twoja tura");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("refuses an incapacitated off-turn attacker", async () => {
    const state = stateWithCombat();
    state.combat.turnIndex = 1;
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      conditions: ["paralyzed"],
    };
    mock.states.set("c1", state);
    const result = await runTool("opportunity_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("obezwładnion");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("refuses without active combat and with unknown combatants", async () => {
    mock.states.set("c1", mock.defaultState());
    const inactive = await runTool("opportunity_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(inactive.ok).toBe(false);
    expect(inactive.message).toContain("Brak walki");
    mock.states.set("c1", stateWithCombat());
    const ghost = await runTool("opportunity_attack", {
      attackerId: "ghost",
      targetId: "enemy-1",
    });
    expect(ghost.ok).toBe(false);
    expect(ghost.message).toContain("Nie znaleziono kombatanta");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("refuses a dead target", async () => {
    const state = stateWithCombat();
    state.combat.turnIndex = 1;
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      currentHp: 0,
      status: "dead",
    };
    mock.states.set("c1", state);
    const result = await runTool("opportunity_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("martwy");
  });

  it("refuses when the target is beyond the attacker's weapon reach", async () => {
    const state = stateWithCombat();
    state.combat.turnIndex = 1;
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      reactionAvailable: true,
    };
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      position: 12,
    };
    mock.states.set("c1", state);
    const result = await runTool("opportunity_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("poza zasięgiem ataku okazyjnego");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("resolves when the target is within the attacker's weapon reach", async () => {
    const state = stateWithCombat();
    state.combat.turnIndex = 1;
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      reactionAvailable: true,
    };
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      position: 4,
    };
    mock.states.set("c1", state);
    const original = Math.random;
    Math.random = () => 0.9; // d20 = 19, 1d8 = 8
    const result = await runTool("opportunity_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toContain("atak okazyjny");
  });

  it("restores the attacker's reaction at the start of its next turn", async () => {
    const state = stateWithCombat();
    state.combat.turnIndex = 1;
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      reactionAvailable: true,
    };
    mock.states.set("c1", state);
    const original = Math.random;
    Math.random = () => 0.01; // miss keeps the goblin alive
    const used = await runTool("opportunity_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(used.ok).toBe(true);
    let saved = mock.states.get("c1")!;
    expect(
      saved.combat.combatants.find((c) => c.id === "char-ch1")!.reactionAvailable,
    ).toBe(false);
    const advance = await runTool("advance_turn");
    Math.random = original;
    expect(advance.ok).toBe(true);
    saved = mock.states.get("c1")!;
    expect(
      saved.combat.combatants.find((c) => c.id === "char-ch1")!.reactionAvailable,
    ).toBe(true);
  });
});

describe("runDmTool move_combatant (mocked store)", () => {
  it("sets the combatant's position and emits a move event", async () => {
    const result = await runTool("move_combatant", {
      combatantId: "enemy-1",
      feet: 30,
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("30 stóp");
    const saved = mock.states.get("c1")!;
    expect(
      saved.combat.combatants.find((c) => c.id === "enemy-1")!.position,
    ).toBe(30);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "move", combatant: "Goblin", position: 30 }),
    );
  });

  it("uses the melee wording for position 0", async () => {
    const result = await runTool("move_combatant", {
      combatantId: "enemy-1",
      feet: 0,
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("w sam środek walki w zwarciu");
    const saved = mock.states.get("c1")!;
    expect(
      saved.combat.combatants.find((c) => c.id === "enemy-1")!.position,
    ).toBe(0);
  });

  it("rejects without active combat", async () => {
    mock.states.set("c1", mock.defaultState());
    const result = await runTool("move_combatant", {
      combatantId: "enemy-1",
      feet: 10,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Brak walki");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("rejects an unknown combatant", async () => {
    const result = await runTool("move_combatant", {
      combatantId: "ghost",
      feet: 10,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Nie znaleziono kombatanta");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("rejects feet outside the 0-500 range", async () => {
    const result = await runTool("move_combatant", {
      combatantId: "enemy-1",
      feet: 501,
    });
    expect(result.ok).toBe(false);
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });
});

describe("runDmTool set_lighting (mocked store)", () => {
  it("persists the light level and emits a lighting event", async () => {
    const result = await runTool("set_lighting", { level: "dark" });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("ciemności");
    const saved = mock.states.get("c1")!;
    expect(saved.combat.lightLevel).toBe("dark");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "lighting", level: "dark" }),
    );
  });

  it("narrates bright and dim levels", async () => {
    const bright = await runTool("set_lighting", { level: "bright" });
    expect(bright.ok).toBe(true);
    expect(bright.message).toContain("jasnym świetle");
    const dim = await runTool("set_lighting", { level: "dim" });
    expect(dim.ok).toBe(true);
    expect(dim.message).toContain("przyćmionym świetle");
  });

  it("rejects an invalid level", async () => {
    const result = await runTool("set_lighting", { level: "neon" });
    expect(result.ok).toBe(false);
    expect(mock.pushEvent).not.toHaveBeenCalled();
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

  it("applies disadvantage to an attack-roll spell in dark lighting for a caster without darkvision", async () => {
    const state = clericCombatState();
    state.combat.lightLevel = "dark";
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      darkvision: false,
    };
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      darkvision: true,
    };
    mock.states.set("c1", state);
    const seq = [0.9, 0.1, 0.5]; // d20s: 19, 3 -> disadvantage keeps the lower die
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const data = result.data as { attackRolls: number[] };
    expect(data.attackRolls).toEqual([19, 3]);
  });

  it("casts a known spell given its Polish name (findSpellByName)", async () => {
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Healing Word"] }));
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Uzdrawiające słowo",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Healing Word");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "spell", spell: "Healing Word" }),
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

  it("an action spell consumes the caster's attack action", async () => {
    const original = Math.random;
    Math.random = () => 0.9;
    const cast = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    expect(cast.ok).toBe(true);
    const caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.attacksLeft).toBe(0);
    const attack = await runTool("attack_combatant", {
      attackerId: "char-ch2",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(attack.ok).toBe(false);
    expect(attack.message).toContain("nie ma już akcji ataku");
  });

  it("a second action spell in the same turn is refused", async () => {
    const original = Math.random;
    Math.random = () => 0.9;
    const first = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    expect(first.ok).toBe(true);
    const second = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(second.ok).toBe(false);
    expect(second.message).toContain("Brak akcji");
  });

  it("a bonus-action spell (Healing Word) does not consume the attack action", async () => {
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Healing Word"] }));
    const state = clericCombatState();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      attacksLeft: 1,
    };
    mock.states.set("c1", state);
    const original = Math.random;
    Math.random = () => 0.9;
    const cast = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Healing Word",
      targetId: "enemy-1",
    });
    expect(cast.ok).toBe(true);
    let caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.attacksLeft).toBe(1);
    const attack = await runTool("attack_combatant", {
      attackerId: "char-ch2",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(attack.ok).toBe(true);
    caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.attacksLeft).toBe(0);
  });

  it("a bonus-action spell (Healing Word) consumes the bonus action", async () => {
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Healing Word"] }));
    const state = clericCombatState();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      attacksLeft: 1,
    };
    mock.states.set("c1", state);
    const original = Math.random;
    Math.random = () => 0.9;
    const cast = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Healing Word",
      targetId: "enemy-1",
    });
    expect(cast.ok).toBe(true);
    const caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.bonusActionAvailable).toBe(false);
    expect(caster.attacksLeft).toBe(1);
    const second = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Healing Word",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(second.ok).toBe(false);
    expect(second.message).toContain("akcji dodatkowej");
  });

  it("a bonus-action spell (Spiritual Weapon) consumes the bonus action", async () => {
    mock.characters.set(
      "ch2",
      cleric({ spells: [...baseSpells, "Spiritual Weapon"] }),
    );
    const original = Math.random;
    Math.random = () => 0.9;
    const cast = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Spiritual Weapon",
      targetId: "enemy-1",
    });
    expect(cast.ok).toBe(true);
    const caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.bonusActionAvailable).toBe(false);
    const second = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Spiritual Weapon",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(second.ok).toBe(false);
    expect(second.message).toContain("akcji dodatkowej");
  });

  it("an attack is still allowed after a bonus-action spell (attacksLeft untouched)", async () => {
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Healing Word"] }));
    const state = clericCombatState();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      attacksLeft: 1,
    };
    mock.states.set("c1", state);
    const original = Math.random;
    Math.random = () => 0.9;
    const cast = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Healing Word",
      targetId: "enemy-1",
    });
    expect(cast.ok).toBe(true);
    let caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.attacksLeft).toBe(1);
    const attack = await runTool("attack_combatant", {
      attackerId: "char-ch2",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(attack.ok).toBe(true);
    caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.attacksLeft).toBe(0);
  });

  it("rejects a bonus-action spell without an available bonus action (already used)", async () => {
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Healing Word"] }));
    const state = clericCombatState();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      bonusActionAvailable: false,
    };
    mock.states.set("c1", state);
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Healing Word",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("akcji dodatkowej");
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

  it("Resurrection revives a dead character outside combat with FULL HP", async () => {
    mock.states.set("c1", mock.defaultState());
    mock.characters.set(
      "ch2",
      cleric({ level: 13, spells: [...baseSpells, "Resurrection"] }),
    );
    mock.characters.set("ch1", { ...aria, currentHp: 0 });
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Resurrection",
      targetId: "ch1",
    });
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", aria.maxHp);
    expect(result.message).toContain("pełnym punktem życia");
  });

  it("rejects reviving a LIVING character outside combat", async () => {
    mock.states.set("c1", mock.defaultState());
    mock.characters.set(
      "ch2",
      cleric({ level: 5, spells: [...baseSpells, "Revivify"] }),
    );
    mock.characters.set("ch1", { ...aria, currentHp: 8 });
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Revivify",
      targetId: "ch1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("nie jest martwy");
    expect(mock.updateCharacterHp).not.toHaveBeenCalled();
  });

  it("Heal restores exactly 70 HP outside combat without dice", async () => {
    mock.states.set("c1", mock.defaultState());
    mock.characters.set(
      "ch2",
      cleric({
        level: 11,
        maxHp: 100,
        currentHp: 30,
        spells: [...baseSpells, "Heal"],
      }),
    );
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Heal",
      targetId: "ch2",
    });
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch2", 100);
    expect(result.message).toContain("leczy o 70");
    const data = result.data as { healed: number; healRolls: number[] };
    expect(data.healed).toBe(70);
    expect(data.healRolls).toEqual([]);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "spell", spell: "Heal", healed: 70 }),
    );
  });

  it("Resurrection revives a dead combatant to full HP in combat", async () => {
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
      cleric({ level: 13, spells: [...baseSpells, "Resurrection"] }),
    );
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Resurrection",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(true);
    const goblin = mock.states.get("c1")!.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.currentHp).toBe(goblin.maxHp);
    expect(goblin.status).toBe("active");
    expect(goblin.deathSaveFailures).toBe(0);
    expect(goblin.deathSaveSuccesses).toBe(0);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "spell",
        spell: "Resurrection",
        revived: true,
        targetCurrentHp: 7,
      }),
    );
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

  it("Greater Restoration lowers the target combatant's exhaustion level in combat", async () => {
    const state = clericCombatState();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      exhaustionLevel: 2,
    };
    mock.states.set("c1", state);
    mock.characters.set(
      "ch2",
      cleric({ level: 9, spells: [...baseSpells, "Greater Restoration"] }),
    );
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Greater Restoration",
      targetId: "enemy-1",
      restoreMode: "exhaustion",
    });
    expect(result.ok).toBe(true);
    const goblin = mock.states.get("c1")!.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.exhaustionLevel).toBe(1);
    expect(result.message).toContain("obniża wyczerpanie");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "spell",
        spell: "Greater Restoration",
        restoredExhaustion: true,
      }),
    );
  });

  it("Greater Restoration removes the target's first condition by default in combat", async () => {
    const state = clericCombatState();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["poisoned"],
    };
    mock.states.set("c1", state);
    mock.characters.set(
      "ch2",
      cleric({ level: 9, spells: [...baseSpells, "Greater Restoration"] }),
    );
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Greater Restoration",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(true);
    const goblin = mock.states.get("c1")!.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions).toEqual([]);
    expect(result.message).toContain("usuwa stan");
  });

  it("Greater Restoration reduces exhaustion outside combat", async () => {
    mock.states.set("c1", mock.defaultState());
    mock.characters.set(
      "ch2",
      cleric({ level: 9, spells: [...baseSpells, "Greater Restoration"] }),
    );
    mock.characters.set("ch1", { ...aria, exhaustion: 2 });
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Greater Restoration",
      targetId: "ch1",
      restoreMode: "exhaustion",
    });
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterExhaustion).toHaveBeenCalledWith("ch1", 1);
    expect(result.message).toContain("obniża wyczerpanie");
  });

  it("Greater Restoration refuses condition mode outside combat", async () => {
    mock.states.set("c1", mock.defaultState());
    mock.characters.set(
      "ch2",
      cleric({ level: 9, spells: [...baseSpells, "Greater Restoration"] }),
    );
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Greater Restoration",
      targetId: "ch1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Stany dotyczą tylko walki.");
    expect(mock.updateCharacterSpellSlots).not.toHaveBeenCalled();
    expect(mock.updateCharacterExhaustion).not.toHaveBeenCalled();
  });

  it("starts concentration when casting a concentration spell", async () => {
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Hold Person"] }));
    const original = Math.random;
    Math.random = () => 0; // failed save -> paralyzed
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Hold Person",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const caster = saved.combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.concentratingOn).toBe("Hold Person");
    expect(caster.conSaveMod).toBe(1); // CON 13 -> +1
    expect(result.message).toContain("zaczyna koncentrować");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "spell",
        spell: "Hold Person",
        concentration: true,
      }),
    );
  });

  it("ends the previous concentration spell when casting another concentration spell", async () => {
    mock.characters.set(
      "ch2",
      cleric({ level: 5, spells: [...baseSpells, "Spirit Guardians", "Hold Person"] }),
    );
    const state = clericCombatState();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      attacksPerTurn: 2,
      attacksLeft: 2,
    };
    mock.states.set("c1", state);
    const original = Math.random;
    Math.random = () => 0.9; // successful saves — the spell still starts concentration
    const first = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Spirit Guardians",
      targetId: "enemy-1",
    });
    expect(first.ok).toBe(true);
    let caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.concentratingOn).toBe("Spirit Guardians");
    const second = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Hold Person",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(second.ok).toBe(true);
    caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.concentratingOn).toBe("Hold Person");
    expect(second.message).toContain("kończy koncentrację na Spirit Guardians");
  });

  it("does not start concentration for non-concentration spells", async () => {
    mock.characters.set("ch2", cleric({ spells: [...baseSpells, "Guiding Bolt"] }));
    const original = Math.random;
    Math.random = () => 0.9;
    const result = await runTool("cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch2")!;
    expect(caster.concentratingOn).toBeUndefined();
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

  it("reduces each member's exhaustion by 1 on a long rest (min 0)", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }, { characterId: "ch2" }]);
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", { ...aria, exhaustion: 2 });
    mock.characters.set("ch2", { ...aria, id: "ch2", name: "Bran", exhaustion: 0 });

    const result = await runTool("take_long_rest", {});

    expect(result.ok).toBe(true);
    expect(mock.updateCharacterExhaustion).toHaveBeenCalledWith("ch1", 1);
    expect(mock.updateCharacterExhaustion).toHaveBeenCalledWith("ch2", 0);
    expect(result.message).toContain("wyczerpanie");
  });

  it("does not touch exhaustion when resting during combat", async () => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", stateWithCombat());

    const result = await runTool("take_long_rest", {});

    expect(result.ok).toBe(false);
    expect(mock.updateCharacterExhaustion).not.toHaveBeenCalled();
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

  it("apply_condition works with the banished spell-effect condition", async () => {
    const result = await runTool("apply_condition", {
      combatantId: "enemy-1",
      condition: "banished",
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Wygnańczony");
    const saved = mock.states.get("c1")!;
    const goblin = saved.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.conditions).toEqual(["banished"]);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "condition", action: "apply", condition: "banished" }),
    );
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

  it("apply_condition with an incapacitating condition clears concentration", async () => {
    const state = stateWithCombat();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      concentratingOn: "Hold Person",
    };
    mock.states.set("c1", state);
    const result = await runTool("apply_condition", {
      combatantId: "char-ch1",
      condition: "paralyzed",
    });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Koncentracja zostaje przerwana");
    const saved = mock.states.get("c1")!;
    const caster = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(caster.conditions).toEqual(["paralyzed"]);
    expect(caster.concentratingOn).toBeUndefined();
  });

  it("apply_condition with a harmless condition keeps concentration", async () => {
    const state = stateWithCombat();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      concentratingOn: "Hold Person",
    };
    mock.states.set("c1", state);
    const result = await runTool("apply_condition", {
      combatantId: "char-ch1",
      condition: "prone",
    });
    expect(result.ok).toBe(true);
    expect(result.message).not.toContain("koncentracj");
    const caster = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(caster.concentratingOn).toBe("Hold Person");
  });
});

describe("runDmTool set_exhaustion (mocked store)", () => {
  it("sets the exhaustion level and pushes an event", async () => {
    const result = await runTool("set_exhaustion", { characterId: "ch1", level: 3 });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Aria ma teraz 3 poziom(y) wyczerpania.");
    expect(mock.updateCharacterExhaustion).toHaveBeenCalledWith("ch1", 3);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "exhaustion", characterId: "ch1", level: 3 }),
    );
  });

  it("reports full recovery at level 0", async () => {
    const result = await runTool("set_exhaustion", { characterId: "ch1", level: 0 });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("odzyskuje pełnię sił");
    expect(mock.updateCharacterExhaustion).toHaveBeenCalledWith("ch1", 0);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "exhaustion", characterId: "ch1", level: 0 }),
    );
  });

  it("validates the level range (0-6)", async () => {
    const result = await runTool("set_exhaustion", { characterId: "ch1", level: 7 });
    expect(result.ok).toBe(false);
    expect(mock.updateCharacterExhaustion).not.toHaveBeenCalled();
    expect(mock.pushEvent).not.toHaveBeenCalled();
    const negative = await runTool("set_exhaustion", { characterId: "ch1", level: -1 });
    expect(negative.ok).toBe(false);
  });

  it("rejects an unknown character", async () => {
    const result = await runTool("set_exhaustion", { characterId: "ghost", level: 2 });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Nie znaleziono postaci.");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });
});

describe("runDmTool stop_concentration (mocked store)", () => {
  it("clears concentration and pushes a concentration event", async () => {
    const state = stateWithCombat();
    state.combat.combatants[0] = {
      ...state.combat.combatants[0]!,
      concentratingOn: "Spirit Guardians",
    };
    mock.states.set("c1", state);
    const result = await runTool("stop_concentration", { combatantId: "char-ch1" });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Aria przerywa koncentrację na zaklęciu Spirit Guardians.");
    const saved = mock.states.get("c1")!;
    const caster = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(caster.concentratingOn).toBeUndefined();
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "concentration",
        action: "stop",
        combatant: "Aria",
        spell: "Spirit Guardians",
      }),
    );
  });

  it("rejects a combatant that is not concentrating", async () => {
    const result = await runTool("stop_concentration", { combatantId: "char-ch1" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Aria nie koncentruje się na żadnym zaklęciu.");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("rejects an unknown combatant", async () => {
    const result = await runTool("stop_concentration", { combatantId: "ghost" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Nie znaleziono kombatanta.");
  });

  it("rejects without active combat", async () => {
    mock.states.set("c1", mock.defaultState());
    const result = await runTool("stop_concentration", { combatantId: "char-ch1" });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Brak walki");
  });
});

describe("runDmTool set_inspiration (mocked store)", () => {
  it("grants inspiration and pushes an inspiration event", async () => {
    const result = await runTool("set_inspiration", { characterId: "ch1", has: true });
    expect(result.ok).toBe(true);
    expect(result.message).toBe(
      "Aria otrzymuje inspirację! (może uzyskać przewagę na jeden rzut)",
    );
    expect(mock.updateCharacterInspiration).toHaveBeenCalledWith("ch1", true);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "inspiration", characterId: "ch1", has: true }),
    );
  });

  it("revokes inspiration", async () => {
    const result = await runTool("set_inspiration", { characterId: "ch1", has: false });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Inspiracja Aria wygasa.");
    expect(mock.updateCharacterInspiration).toHaveBeenCalledWith("ch1", false);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "inspiration", characterId: "ch1", has: false }),
    );
  });

  it("rejects an unknown character", async () => {
    const result = await runTool("set_inspiration", { characterId: "ghost", has: true });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Nie znaleziono postaci.");
    expect(mock.updateCharacterInspiration).not.toHaveBeenCalled();
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("rejects a missing boolean flag", async () => {
    const result = await runTool("set_inspiration", { characterId: "ch1" });
    expect(result.ok).toBe(false);
    expect(mock.updateCharacterInspiration).not.toHaveBeenCalled();
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });
});

describe("runDmTool attack_combatant inspiration (mocked store)", () => {
  it("spends inspiration to force advantage and clears it", async () => {
    mock.characters.set("ch1", { ...aria, inspiration: true });
    const seq = [0.2, 0.9, 0.9]; // d20s: 5, 19; 1d8: 8
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const result = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
      useInspiration: true,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const data = result.data as { attackRolls: number[]; attackRoll: number };
    expect(data.attackRolls).toEqual([5, 19]);
    expect(data.attackRoll).toBe(19);
    expect(mock.updateCharacterInspiration).toHaveBeenCalledWith("ch1", false);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "attack", inspirationUsed: true }),
    );
  });

  it("does not force advantage or clear inspiration without it", async () => {
    const seq = [0.5, 0.5]; // single d20: 11; 1d8: 5
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const result = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
      useInspiration: true,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const data = result.data as { attackRolls: number[] };
    expect(data.attackRolls).toEqual([11]);
    expect(mock.updateCharacterInspiration).not.toHaveBeenCalled();
    expect(mock.pushEvent).not.toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ inspirationUsed: true }),
    );
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

  it("stores slot and attuned fields on granted items", async () => {
    const result = await runTool("grant_loot", {
      characterId: "ch1",
      gold: 0,
      items: [{ name: "Ring of Protection", quantity: 1, slot: "ring", attuned: true }],
    });
    expect(result.ok).toBe(true);
    const ch = mock.characters.get("ch1")!;
    expect(ch.inventory).toContainEqual(
      expect.objectContaining({
        name: "Ring of Protection",
        slot: "ring",
        attuned: true,
      }),
    );
  });

  it("rejects an unknown slot and lists the available slots", async () => {
    const result = await runTool("grant_loot", {
      characterId: "ch1",
      gold: 0,
      items: [{ name: "Mystery Item", quantity: 1, slot: "teleport" }],
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Nieznany slot ekwipunku: teleport");
    expect(result.message).toContain("Głowa (head)");
    expect(result.message).toContain("Buty (boots)");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });
});

describe("runDmTool skill_check (mocked store)", () => {
  beforeEach(() => {
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", {
      ...aria,
      skills: { perception: true, acrobatics: false },
    });
  });

  it("resolves a successful check with the proficiency bonus and pushes the event", async () => {
    const original = Math.random;
    Math.random = () => 0.7; // d20 = 15
    const result = await runTool("skill_check", {
      characterId: "ch1",
      skill: "perception",
      dc: 15,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toBe(
      "Aria testuje Percepcja: rzut 15 + 2 = 17 vs DC 15 — sukces!",
    );
    expect(result.data).toEqual({
      type: "skill-check",
      characterId: "ch1",
      character: "Aria",
      skill: "perception",
      roll: 15,
      rolls: [15],
      mod: 2,
      dc: 15,
      total: 17,
      success: true,
      advantage: false,
      disadvantage: false,
    });
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "skill-check",
        characterId: "ch1",
        character: "Aria",
        skill: "perception",
        roll: 15,
        rolls: [15],
        mod: 2,
        dc: 15,
        total: 17,
        success: true,
      }),
    );
  });

  it("reports a failure against a high DC", async () => {
    const original = Math.random;
    Math.random = () => 0.7; // d20 = 15
    const result = await runTool("skill_check", {
      characterId: "ch1",
      skill: "perception",
      dc: 20,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toBe(
      "Aria testuje Percepcja: rzut 15 + 2 = 17 vs DC 20 — porażka.",
    );
    const data = result.data as { success: boolean };
    expect(data.success).toBe(false);
  });

  it("uses the ability modifier alone without proficiency", async () => {
    mock.characters.set("ch1", { ...aria, skills: {} });
    const original = Math.random;
    Math.random = () => 0.7; // d20 = 15
    const result = await runTool("skill_check", {
      characterId: "ch1",
      skill: "athletics",
      dc: 10,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toBe(
      "Aria testuje Atletyka: rzut 15 + 3 = 18 vs DC 10 — sukces!",
    );
  });

  it("rolls twice and takes the higher die with advantage", async () => {
    const seq = [0.2, 0.9]; // d20s: 5, 19
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const result = await runTool("skill_check", {
      characterId: "ch1",
      skill: "acrobatics",
      dc: 15,
      advantage: true,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const data = result.data as { roll: number; rolls: number[]; advantage: boolean };
    expect(data.rolls).toEqual([5, 19]);
    expect(data.roll).toBe(19);
    expect(data.advantage).toBe(true);
  });

  it("rolls twice and takes the lower die with disadvantage", async () => {
    const seq = [0.2, 0.9]; // d20s: 5, 19
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const result = await runTool("skill_check", {
      characterId: "ch1",
      skill: "acrobatics",
      dc: 15,
      disadvantage: true,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const data = result.data as { roll: number; rolls: number[]; disadvantage: boolean };
    expect(data.rolls).toEqual([5, 19]);
    expect(data.roll).toBe(5);
    expect(data.disadvantage).toBe(true);
  });

  it("rolls a single die when both advantage and disadvantage are set", async () => {
    const seq = [0.2, 0.9];
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const result = await runTool("skill_check", {
      characterId: "ch1",
      skill: "acrobatics",
      dc: 15,
      advantage: true,
      disadvantage: true,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const data = result.data as { roll: number; rolls: number[] };
    expect(data.rolls).toEqual([5]);
  });

  it("rejects an unknown skill and lists the available ones", async () => {
    const result = await runTool("skill_check", {
      characterId: "ch1",
      skill: "cooking",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Nieznana umiejętność: cooking");
    expect(result.message).toContain("Dostępne:");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("spends inspiration to force advantage and clears it", async () => {
    mock.characters.set("ch1", {
      ...aria,
      inspiration: true,
      skills: { perception: true },
    });
    const seq = [0.2, 0.9]; // d20s: 5, 19
    const original = Math.random;
    Math.random = () => seq.shift() ?? 0;
    const result = await runTool("skill_check", {
      characterId: "ch1",
      skill: "perception",
      dc: 10,
      useInspiration: true,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const data = result.data as {
      roll: number;
      rolls: number[];
      advantage: boolean;
      inspirationUsed: boolean;
    };
    expect(data.rolls).toEqual([5, 19]);
    expect(data.roll).toBe(19);
    expect(data.advantage).toBe(true);
    expect(data.inspirationUsed).toBe(true);
    expect(mock.updateCharacterInspiration).toHaveBeenCalledWith("ch1", false);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "skill-check", inspirationUsed: true }),
    );
  });

  it("does not spend inspiration when the character has none", async () => {
    const original = Math.random;
    Math.random = () => 0.7;
    const result = await runTool("skill_check", {
      characterId: "ch1",
      skill: "perception",
      dc: 10,
      useInspiration: true,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterInspiration).not.toHaveBeenCalled();
    const data = result.data as { advantage: boolean; inspirationUsed?: boolean };
    expect(data.advantage).toBe(false);
    expect(data.inspirationUsed).toBeUndefined();
  });

  it("appends the reason to the message and the event", async () => {
    const original = Math.random;
    Math.random = () => 0.7;
    const result = await runTool("skill_check", {
      characterId: "ch1",
      skill: "perception",
      dc: 10,
      reason: "szukając śladów",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toContain("(szukając śladów)");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "skill-check", reason: "szukając śladów" }),
    );
  });

  it("rejects an unknown character", async () => {
    const result = await runTool("skill_check", { characterId: "ghost", skill: "perception" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Nie znaleziono postaci.");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });
});

describe("runDmTool use_item (mocked store)", () => {
  beforeEach(() => {
    mock.states.set("c1", mock.defaultState());
    mock.characters.set("ch1", {
      ...aria,
      currentHp: 5,
      maxHp: 10,
      inventory: [{ id: "pot1", name: "Potion of Healing", quantity: 2 }],
    });
  });

  it("consumes a potion, removes it at quantity 1 and heals the character", async () => {
    mock.characters.set("ch1", {
      ...aria,
      currentHp: 5,
      maxHp: 10,
      inventory: [{ id: "pot1", name: "Potion of Healing", quantity: 1 }],
    });
    const original = Math.random;
    Math.random = () => 0.95; // 2d4: 4, 4 -> +2 = 10
    const result = await runTool("use_item", { characterId: "ch1", itemId: "pot1" });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toBe(
      "Aria pije Potion of Healing — odzyskuje 10 punktów życia.",
    );
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 10);
    expect(mock.updateCharacterInventory).toHaveBeenCalledWith("ch1", []);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "item-use",
        item: "Potion of Healing",
        character: "Aria",
        target: "Aria",
        healed: 10,
        rolls: [4, 4],
      }),
    );
    expect(result.data).toEqual({
      type: "item-use",
      item: "Potion of Healing",
      character: "Aria",
      target: "Aria",
      healed: 10,
      rolls: [4, 4],
    });
  });

  it("decrements quantity instead of removing when more remain", async () => {
    mock.characters.set("ch1", {
      ...aria,
      currentHp: 5,
      maxHp: 10,
      inventory: [
        { id: "pot1", name: "Potion of Healing", quantity: 3 },
        { id: "rope1", name: "Rope", quantity: 1 },
      ],
    });
    const original = Math.random;
    Math.random = () => 0.95;
    const result = await runTool("use_item", { characterId: "ch1", itemId: "pot1" });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterInventory).toHaveBeenCalledWith("ch1", [
      { id: "pot1", name: "Potion of Healing", quantity: 2 },
      { id: "rope1", name: "Rope", quantity: 1 },
    ]);
  });

  it("heals the target character in combat and saves the combatant state", async () => {
    const state = stateWithCombat();
    state.combat.combatants[0] = { ...state.combat.combatants[0]!, currentHp: 3 };
    mock.states.set("c1", state);
    mock.characters.set("ch1", {
      ...aria,
      currentHp: 3,
      inventory: [{ id: "pot1", name: "Potion of Healing", quantity: 1 }],
    });
    const original = Math.random;
    Math.random = () => 0.95; // 2d4+2 = 10
    const result = await runTool("use_item", {
      characterId: "ch1",
      itemId: "pot1",
      targetId: "char-ch1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const ariaCombatant = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(ariaCombatant.currentHp).toBe(10);
    expect(ariaCombatant.status).toBe("active");
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 10);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "item-use", target: "Aria", healed: 10 }),
    );
  });

  it("defaults the in-combat target to the item's owner", async () => {
    const state = stateWithCombat();
    state.combat.combatants[0] = { ...state.combat.combatants[0]!, currentHp: 3 };
    mock.states.set("c1", state);
    mock.characters.set("ch1", {
      ...aria,
      inventory: [{ id: "pot1", name: "Potion of Healing", quantity: 1 }],
    });
    const original = Math.random;
    Math.random = () => 0.95;
    const result = await runTool("use_item", { characterId: "ch1", itemId: "pot1" });
    Math.random = original;
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const ariaCombatant = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(ariaCombatant.currentHp).toBe(10);
  });

  it("rejects an item the character does not have", async () => {
    const result = await runTool("use_item", { characterId: "ch1", itemId: "ghost" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Postać nie posiada tego przedmiotu.");
    expect(mock.updateCharacterHp).not.toHaveBeenCalled();
    expect(mock.updateCharacterInventory).not.toHaveBeenCalled();
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("rejects non-healing-potion items with a mechanics message", async () => {
    mock.characters.set("ch1", {
      ...aria,
      inventory: [{ id: "rope1", name: "Rope", quantity: 1 }],
    });
    const result = await runTool("use_item", { characterId: "ch1", itemId: "rope1" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Ten przedmiot nie ma jeszcze mechaniki użycia.");
    expect(mock.updateCharacterHp).not.toHaveBeenCalled();
    expect(mock.updateCharacterInventory).not.toHaveBeenCalled();
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("uses the right dice for a Greater Potion of Healing", async () => {
    mock.characters.set("ch1", {
      ...aria,
      currentHp: 1,
      maxHp: 30,
      inventory: [{ id: "pot2", name: "Greater Potion of Healing", quantity: 1 }],
    });
    const original = Math.random;
    Math.random = () => 0.95; // 4d4: 4,4,4,4 -> +4 = 20
    const result = await runTool("use_item", { characterId: "ch1", itemId: "pot2" });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 21);
    expect(result.message).toContain("odzyskuje 20 punktów życia");
  });

  it("rejects an unknown character", async () => {
    const result = await runTool("use_item", { characterId: "ghost", itemId: "pot1" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Nie znaleziono postaci.");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });
});

describe("runDmTool environment_hazard (mocked store)", () => {
  it("falling applies 3d6 damage, adds prone and pushes a hazard event", async () => {
    const original = Math.random;
    Math.random = () => 0.99; // d6 = 6 each -> 3d6 = 18
    const result = await runTool("environment_hazard", {
      type: "falling",
      combatantId: "char-ch1",
      feet: 30,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toBe(
      "Aria spada z wysokości 30 stóp — 18 obrażeń (upadek, ląduje powalony).",
    );
    const saved = mock.states.get("c1")!;
    const aria = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(aria.currentHp).toBe(0);
    expect(aria.status).toBe("downed");
    expect(aria.conditions).toEqual(["prone"]);
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 0);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "hazard",
        hazard: "falling",
        combatant: "Aria",
        feet: 30,
        damageTotal: 18,
        damageRolls: [6, 6, 6],
      }),
    );
  });

  it("falling clamps the damage dice to 20d6 (feet 250)", async () => {
    const original = Math.random;
    Math.random = () => 0.99; // d6 = 6 each -> 20d6 = 120
    const result = await runTool("environment_hazard", {
      type: "falling",
      combatantId: "enemy-1",
      feet: 250,
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    const goblin = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.currentHp).toBe(0);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "hazard",
        hazard: "falling",
        combatant: "Goblin",
        feet: 250,
        damageTotal: 120,
        damageRolls: Array(20).fill(6),
      }),
    );
  });

  it("suffocation within air reserves deals no damage and reports the air left", async () => {
    const result = await runTool("environment_hazard", {
      type: "suffocation",
      combatantId: "char-ch1",
      conSaves: 2,
    });
    expect(result.ok).toBe(true);
    expect(result.message).toBe(
      "Aria wstrzymuje oddech — zostało 1 rund powietrza.",
    );
    const saved = mock.states.get("c1")!;
    const aria = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(aria.currentHp).toBe(10);
    expect(mock.updateCharacterHp).not.toHaveBeenCalled();
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("suffocation past air reserves deals 10 damage per round without air", async () => {
    const result = await runTool("environment_hazard", {
      type: "suffocation",
      combatantId: "char-ch1",
      conSaves: 5,
    });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Aria dusi się — 20 obrażeń (uduszenie).");
    const saved = mock.states.get("c1")!;
    const aria = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(aria.currentHp).toBe(0);
    expect(aria.status).toBe("downed");
    expect(mock.updateCharacterHp).toHaveBeenCalledWith("ch1", 0);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "hazard",
        hazard: "suffocation",
        combatant: "Aria",
        damageTotal: 20,
      }),
    );
  });

  it("uses the combatant's conSaveMod for a non-player target's air reserves", async () => {
    const state = stateWithCombat();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conSaveMod: 3,
      currentHp: 50,
      maxHp: 50,
    };
    mock.states.set("c1", state);
    const result = await runTool("environment_hazard", {
      type: "suffocation",
      combatantId: "enemy-1",
      conSaves: 4,
    });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Goblin wstrzymuje oddech — zostało 0 rund powietrza.");
    const goblin = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.currentHp).toBe(50);
  });

  it("rejects a hazard without a combatantId", async () => {
    const result = await runTool("environment_hazard", { type: "falling", feet: 30 });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Hazardy środowiskowe wymagają aktywnej walki i celu.");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid hazard type", async () => {
    const result = await runTool("environment_hazard", {
      type: "fireball",
      combatantId: "char-ch1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Hazardy środowiskowe wymagają aktywnej walki i celu.");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("rejects hazards without active combat", async () => {
    mock.states.set("c1", mock.defaultState());
    const result = await runTool("environment_hazard", {
      type: "suffocation",
      combatantId: "char-ch1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Hazardy środowiskowe wymagają aktywnej walki i celu.");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("rejects falling without feet", async () => {
    const result = await runTool("environment_hazard", {
      type: "falling",
      combatantId: "char-ch1",
    });
    expect(result.ok).toBe(false);
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });
});

describe("runDmTool move_combatant movement budget (mocked store)", () => {
  it("rejects a move beyond the remaining movement budget", async () => {
    const state = stateWithCombat();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      movementLeft: 10,
    };
    mock.states.set("c1", state);
    const result = await runTool("move_combatant", {
      combatantId: "enemy-1",
      feet: 11,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Za mało ruchu w tej turze (zostało 10 stóp).");
    expect(mock.pushEvent).not.toHaveBeenCalled();
  });

  it("decrements movementLeft by the distance moved and reports speed", async () => {
    const result = await runTool("move_combatant", {
      combatantId: "enemy-1",
      feet: 10,
    });
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const goblin = saved.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.position).toBe(10);
    expect(goblin.movementLeft).toBe(20);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({
        type: "move",
        combatant: "Goblin",
        position: 10,
        speed: 30,
        movementLeft: 20,
      }),
    );
  });

  it("refuses a second move beyond the remaining budget", async () => {
    expect((await runTool("move_combatant", { combatantId: "enemy-1", feet: 20 })).ok).toBe(true);
    const result = await runTool("move_combatant", {
      combatantId: "enemy-1",
      feet: 11,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("zostało 10 stóp");
  });

  it("resets movementLeft to speed when the combatant's next turn starts", async () => {
    const state = stateWithCombat();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      movementLeft: 10,
    };
    mock.states.set("c1", state);
    const advance = await runTool("advance_turn");
    expect(advance.ok).toBe(true);
    const result = await runTool("move_combatant", {
      combatantId: "enemy-1",
      feet: 30,
    });
    expect(result.ok).toBe(true);
    const goblin = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(goblin.movementLeft).toBe(0);
  });

  it("the slowed marker halves the available movement", async () => {
    const state = stateWithCombat();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["slowed"],
    };
    mock.states.set("c1", state);
    const ok = await runTool("move_combatant", { combatantId: "enemy-1", feet: 15 });
    expect(ok.ok).toBe(true);
    // movementLeft is 15 after the move; slowed halves that to 7 effective.
    const tooFar = await runTool("move_combatant", { combatantId: "enemy-1", feet: 8 });
    expect(tooFar.ok).toBe(false);
    expect(tooFar.message).toContain("zostało 7 stóp");
  });

  it("the hamstring marker zeroes the available movement", async () => {
    const state = stateWithCombat();
    state.combat.combatants[1] = {
      ...state.combat.combatants[1]!,
      conditions: ["hamstring"],
    };
    mock.states.set("c1", state);
    const result = await runTool("move_combatant", { combatantId: "enemy-1", feet: 1 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("zostało 0 stóp");
  });
});

describe("runDmTool bonus_attack nick mastery (mocked store)", () => {
  it("does not consume the bonus action when the off-hand weapon has nick", async () => {
    mock.characters.set("ch1", {
      ...aria,
      inventory: [
        { id: "i1", name: "Shortsword", quantity: 1, slot: "weapon" },
        { id: "i2", name: "Dagger", quantity: 1, slot: "offhand" },
      ],
    });
    const original = Math.random;
    Math.random = () => 0.9; // d20 19 -> hit, 1d4 = 4
    const first = await runTool("bonus_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(first.ok).toBe(true);
    expect(first.message).toContain("Nick");
    const ariaCombatant = mock
      .states.get("c1")!
      .combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(ariaCombatant.bonusActionAvailable).toBe(true);
    const second = await runTool("bonus_attack", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(second.ok).toBe(true);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "bonus-attack", mastery: "nick" }),
    );
  });
});

describe("runDmTool attack_combatant mastery (mocked store)", () => {
  it("reports the equipped weapon's mastery in the event and narration", async () => {
    mock.characters.set("ch1", {
      ...aria,
      inventory: [{ id: "i1", name: "Longsword", quantity: 1, slot: "weapon" }],
    });
    const original = Math.random;
    Math.random = () => 0.9; // d20 19 -> hit
    const result = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Sap");
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "attack", mastery: "sap" }),
    );
  });

  it("emits mastery null for an unarmed attacker", async () => {
    const original = Math.random;
    Math.random = () => 0.9;
    const result = await runTool("attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    Math.random = original;
    expect(result.ok).toBe(true);
    expect(mock.pushEvent).toHaveBeenCalledWith(
      "c1",
      "action.resolved",
      expect.objectContaining({ type: "attack", mastery: null }),
    );
  });
});

describe("runDmTool speed and exhaustion at combat start (mocked store)", () => {
  beforeEach(() => {
    mock.members.mockReset();
    mock.members.mockReturnValue([{ characterId: "ch1" }]);
    mock.states.set("c1", mock.defaultState());
  });

  it("generate_encounter carries monster speeds onto the saved combatants", async () => {
    const result = await runTool("generate_encounter", {
      description: "a wolf pack",
    });
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const wolf = saved.combat.combatants.find((c) => c.id === "wolf-0");
    expect(wolf).toBeDefined();
    expect(wolf!.speed).toBe(40);
    expect(wolf!.movementLeft).toBe(40);
  });

  it("generate_encounter halves a PC's speed at exhaustion level 2", async () => {
    mock.characters.set("ch1", { ...aria, exhaustion: 2 });
    const result = await runTool("generate_encounter", {
      description: "goblins in a cave",
    });
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const ariaCombatant = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(ariaCombatant.speed).toBe(15);
    expect(ariaCombatant.movementLeft).toBe(15);
  });

  it("generate_encounter zeroes a PC's speed at exhaustion level 5", async () => {
    mock.characters.set("ch1", { ...aria, exhaustion: 5 });
    const result = await runTool("generate_encounter", {
      description: "goblins in a cave",
    });
    expect(result.ok).toBe(true);
    const saved = mock.states.get("c1")!;
    const ariaCombatant = saved.combat.combatants.find((c) => c.id === "char-ch1")!;
    expect(ariaCombatant.speed).toBe(0);
    expect(ariaCombatant.movementLeft).toBe(0);
  });

  it("summarizeState includes speed and movementLeft per combatant", async () => {
    mock.states.set("c1", {
      ...mock.defaultState(),
      phase: "combat",
      combat: {
        active: true,
        round: 1,
        turnIndex: 0,
        combatants: [
          {
            id: "troll-0",
            name: "Troll",
            isPlayer: false,
            initiative: 15,
            currentHp: 84,
            maxHp: 84,
            armorClass: 15,
            status: "active",
            speed: 30,
            movementLeft: 10,
          },
        ],
      },
    });
    const result = await runTool("get_campaign_state");
    expect(result.ok).toBe(true);
    const data = result.data as {
      combat: { combatants: { speed: number; movementLeft: number }[] };
    };
    expect(data.combat.combatants[0]!.speed).toBe(30);
    expect(data.combat.combatants[0]!.movementLeft).toBe(10);
  });
});
