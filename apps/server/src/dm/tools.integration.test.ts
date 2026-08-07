import { resolve } from "node:path";
import { rmSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Database as DatabaseType } from "better-sqlite3";
import type { CampaignState, Character } from "@domino/shared";
import { users, characters, campaigns, campaignMembers, gameEvents } from "../db/schema.js";

process.env.DATABASE_URL = resolve(process.cwd(), "data/test-dm-tools.db");

const DB_FILES = [
  "data/test-dm-tools.db",
  "data/test-dm-tools.db-wal",
  "data/test-dm-tools.db-shm",
];

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

const cleric: Character = {
  id: "ch2",
  userId: "u1",
  name: "Elara",
  race: "Human",
  className: "Cleric",
  level: 1,
  abilityScores: {
    strength: 10,
    dexterity: 10,
    constitution: 13,
    intelligence: 10,
    wisdom: 16,
    charisma: 12,
  },
  maxHp: 10,
  currentHp: 10,
  armorClass: 15,
  speed: 30,
  proficiencyBonus: 2,
  skills: {},
  inventory: [],
  spells: ["Cure Wounds", "Guiding Bolt"],
  spellSlotsUsed: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function stateWithCombat(): CampaignState {
  return {
    phase: "combat",
    location: "The campaign's starting location",
    scene: "The adventure begins",
    worldProgress: [],
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
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

let db: import("../db/index.js").Db;
let sqlite: DatabaseType;
let store: Awaited<typeof import("../campaign/store.js")>;
let runDmTool: Awaited<typeof import("./tools.js")>["runDmTool"];

beforeAll(async () => {
  const dbModule = await import("../db/index.js");
  db = dbModule.db;
  sqlite = dbModule.sqlite;
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  await migrate(db, { migrationsFolder: "./drizzle" });
  store = await import("../campaign/store.js");
  ({ runDmTool } = await import("./tools.js"));

  db.insert(users).values({ id: "u1", username: "tester", passwordHash: "x" }).run();
  db.insert(characters).values({ ...aria, userId: "u1" }).run();
  db.insert(characters).values({ ...cleric, userId: "u1" }).run();
  db.insert(campaigns).values({ id: "c1", name: "T", ownerId: "u1" }).run();
  db.insert(campaignMembers)
    .values({ campaignId: "c1", userId: "u1", characterId: "ch1" })
    .run();
});

beforeEach(() => {
  store.saveState("c1", stateWithCombat());
  store.updateCharacterSpellSlots("ch2", []);
  store.updateCharacterHp("ch2", 10);
});

afterAll(() => {
  sqlite?.close();
  for (const file of DB_FILES) {
    rmSync(resolve(process.cwd(), file), { force: true });
  }
});

describe("runDmTool combat tools (real store)", () => {
  it("attack_combatant reduces enemy HP and records an action.resolved event", async () => {
    const before = store.loadState("c1");
    const enemyBefore = before.combat.combatants.find((c) => c.id === "enemy-1")!;

    const result = await runDmTool("c1", "dm", "attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(true);

    const after = store.loadState("c1");
    const enemyAfter = after.combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(enemyAfter.currentHp).toBeLessThanOrEqual(enemyBefore.currentHp);

    const events = db
      .select()
      .from(gameEvents)
      .where(eq(gameEvents.campaignId, "c1"))
      .all();
    expect(events.some((e) => e.type === "action.resolved")).toBe(true);
  });

  it("attack_combatant refuses an off-turn attack", async () => {
    const state = store.loadState("c1");
    state.combat.turnIndex = 1;
    store.saveState("c1", state);

    const result = await runDmTool("c1", "dm", "attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("turn");
  });

  it("end_combat deactivates combat and writes HP back to the character sheet", async () => {
    const before = store.loadState("c1");
    const ariaCombatant = before.combat.combatants.find((c) => c.id === "char-ch1")!;

    const result = await runDmTool("c1", "dm", "end_combat", {});
    expect(result.ok).toBe(true);

    const after = store.loadState("c1");
    expect(after.combat.active).toBe(false);

    const row = db
      .select()
      .from(characters)
      .where(eq(characters.id, "ch1"))
      .get()!;
    expect(row.currentHp).toBe(ariaCombatant.currentHp);
  });
});

describe("runDmTool cast_spell (real store)", () => {
  // AC 0 makes every d20+5 spell attack roll hit; 999 HP keeps the target alive
  // so repeated casts stay deterministic (no instant death, no dead-target errors).
  function spellCombatState(): CampaignState {
    return {
      ...stateWithCombat(),
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
            currentHp: 999,
            maxHp: 999,
            armorClass: 0,
            status: "active",
            deathSaveSuccesses: 0,
            deathSaveFailures: 0,
          },
        ],
      },
    };
  }

  it("hits an enemy in combat, records an action.resolved event, and reduces its HP", async () => {
    store.saveState("c1", spellCombatState());
    const before = store.loadState("c1").combat.combatants.find((c) => c.id === "enemy-1")!;

    const result = await runDmTool("c1", "dm", "cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    expect(result.ok).toBe(true);

    const enemyAfter = store
      .loadState("c1")
      .combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(enemyAfter.currentHp).toBeLessThan(before.currentHp);

    const events = db
      .select()
      .from(gameEvents)
      .where(eq(gameEvents.campaignId, "c1"))
      .all();
    expect(
      events.some(
        (e) =>
          e.type === "action.resolved" &&
          (e.payload as { spell?: string })?.spell === "Guiding Bolt",
      ),
    ).toBe(true);
  });

  it("consumes spell slots and refuses further casts once exhausted", async () => {
    store.saveState("c1", spellCombatState());
    const first = await runDmTool("c1", "dm", "cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    expect(first.ok).toBe(true);
    const second = await runDmTool("c1", "dm", "cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    expect(second.ok).toBe(true);

    const third = await runDmTool("c1", "dm", "cast_spell", {
      characterId: "ch2",
      spellName: "Guiding Bolt",
      targetId: "enemy-1",
    });
    expect(third.ok).toBe(false);
    expect(third.message).toContain("slotów");
  });

  it("heals a character outside combat", async () => {
    store.saveState("c1", {
      ...store.loadState("c1"),
      phase: "exploration",
      combat: { active: false, combatants: [], turnIndex: 0, round: 1 },
    });
    store.updateCharacterHp("ch2", 3);

    const result = await runDmTool("c1", "dm", "cast_spell", {
      characterId: "ch2",
      spellName: "Cure Wounds",
      targetId: "ch2",
    });
    expect(result.ok).toBe(true);

    const row = db
      .select()
      .from(characters)
      .where(eq(characters.id, "ch2"))
      .get()!;
    expect(row.currentHp).toBeGreaterThan(3);
  });
});

describe("runDmTool XP award (real store)", () => {
  function combatWithDyingEnemy(): CampaignState {
    return {
      ...stateWithCombat(),
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
            currentHp: 0,
            maxHp: 1,
            armorClass: 2,
            cr: 0.25,
            status: "downed",
            deathSaveSuccesses: 0,
            deathSaveFailures: 0,
          },
        ],
      },
    };
  }

  function killGoblin() {
    return runDmTool("c1", "dm", "attack_combatant", {
      attackerId: "char-ch1",
      targetId: "enemy-1",
      damageNotation: "1d100",
      attackBonus: 5,
      damageBonus: 0,
    });
  }

  it("end_combat awards XP for dead enemies to the party", async () => {
    db.update(characters).set({ xp: 0 }).where(eq(characters.id, "ch1")).run();
    store.saveState("c1", combatWithDyingEnemy());

    const kill = await killGoblin();
    expect(kill.ok).toBe(true);
    const dead = store.loadState("c1").combat.combatants.find((c) => c.id === "enemy-1")!;
    expect(dead.status).toBe("dead");

    const result = await runDmTool("c1", "dm", "end_combat", {});
    expect(result.ok).toBe(true);

    const row = db
      .select()
      .from(characters)
      .where(eq(characters.id, "ch1"))
      .get()!;
    expect(row.xp).toBe(50);

    const events = db
      .select()
      .from(gameEvents)
      .where(eq(gameEvents.campaignId, "c1"))
      .all();
    expect(
      events.some(
        (e) =>
          e.type === "action.resolved" &&
          (e.payload as { type?: string }).type === "xp-award",
      ),
    ).toBe(true);
  });

  it("combat XP levels up a near-threshold character", async () => {
    db.update(characters).set({ xp: 290 }).where(eq(characters.id, "ch1")).run();
    store.saveState("c1", combatWithDyingEnemy());

    await killGoblin();
    const result = await runDmTool("c1", "dm", "end_combat", {});
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Aria osiąga poziom 2!");

    const row = db
      .select()
      .from(characters)
      .where(eq(characters.id, "ch1"))
      .get()!;
    expect(row.xp).toBe(340);
    expect(row.level).toBe(2);
    expect(row.maxHp).toBe(18);
  });
});
