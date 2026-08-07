import { resolve } from "node:path";
import { rmSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Database as DatabaseType } from "better-sqlite3";
import type { CampaignState, Character } from "@domino/shared";
import { users, characters, campaigns, gameEvents } from "../db/schema.js";

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
  db.insert(campaigns).values({ id: "c1", name: "T", ownerId: "u1" }).run();
});

beforeEach(() => {
  store.saveState("c1", stateWithCombat());
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
