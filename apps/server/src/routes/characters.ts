import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { characters } from "../db/schema.js";
import { newId, isoNow } from "../lib/ids.js";
import { requireAuth } from "../middleware/auth.js";
import { proficiencyBonus } from "../rules/abilities.js";
import { buildCharacterSheet } from "../rules/sheet.js";
import type { Character, CharacterSummary } from "@domino/shared";

const abilityScoresSchema = z.object({
  strength: z.number().int().min(1).max(30),
  dexterity: z.number().int().min(1).max(30),
  constitution: z.number().int().min(1).max(30),
  intelligence: z.number().int().min(1).max(30),
  wisdom: z.number().int().min(1).max(30),
  charisma: z.number().int().min(1).max(30),
});

const characterSchema = z.object({
  name: z.string().min(1).max(64),
  race: z.string().min(1).max(32),
  className: z.string().min(1).max(32),
  subclass: z.string().max(64).optional(),
  level: z.number().int().min(1).max(20).default(1),
  abilityScores: abilityScoresSchema,
  maxHp: z.number().int().positive(),
  currentHp: z.number().int().min(0).optional(),
  armorClass: z.number().int().positive(),
  speed: z.number().int().positive().default(30),
  alignment: z.string().max(32).optional(),
  background: z.string().max(128).optional(),
  skills: z.record(z.boolean()).optional(),
  inventory: z.array(z.unknown()).optional(),
  spells: z.array(z.string()).optional(),
  gold: z.number().int().min(0).optional(),
});

export const characterRoutes = new Hono();

characterRoutes.get("/", requireAuth, (c) => {
  const user = c.get("user");
  const rows = db
    .select()
    .from(characters)
    .where(eq(characters.userId, user.id))
    .orderBy(desc(characters.createdAt))
    .all();
  const summaries: CharacterSummary[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    race: r.race,
    className: r.className,
    level: r.level,
    maxHp: r.maxHp,
    currentHp: r.currentHp,
    skills: (r.skills ?? {}) as CharacterSummary["skills"],
  }));
  return c.json({ characters: summaries });
});

characterRoutes.get("/:id", requireAuth, (c) => {
  const user = c.get("user");
  const row = db
    .select()
    .from(characters)
    .where(and(eq(characters.id, c.req.param("id")), eq(characters.userId, user.id)))
    .get();
  if (!row) return c.json({ error: "Character not found" }, 404);
  return c.json({ character: rowToCharacter(row) });
});

characterRoutes.get("/:id/sheet", requireAuth, (c) => {
  const user = c.get("user");
  const row = db
    .select()
    .from(characters)
    .where(and(eq(characters.id, c.req.param("id")), eq(characters.userId, user.id)))
    .get();
  if (!row) return c.json({ error: "Character not found" }, 404);
  return c.json({ sheet: buildCharacterSheet(rowToCharacter(row)) });
});

characterRoutes.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const parsed = characterSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid character", details: parsed.error.flatten() }, 400);
  }
  const data = parsed.data;
  const now = isoNow();
  const id = newId();
  db.insert(characters)
    .values({
      id,
      userId: user.id,
      name: data.name,
      race: data.race,
      className: data.className,
      subclass: data.subclass ?? null,
      level: data.level,
      abilityScores: data.abilityScores,
      maxHp: data.maxHp,
      currentHp: data.maxHp,
      armorClass: data.armorClass,
      speed: data.speed,
      alignment: data.alignment ?? null,
      background: data.background ?? null,
      proficiencyBonus: proficiencyBonus(data.level),
      skills: data.skills ?? {},
      inventory: data.inventory ?? [],
      spells: data.spells ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const row = db.select().from(characters).where(eq(characters.id, id)).get()!;
  return c.json({ character: rowToCharacter(row) }, 201);
});

characterRoutes.patch("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const existing = db
    .select()
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.userId, user.id)))
    .get();
  if (!existing) return c.json({ error: "Character not found" }, 404);

  const parsed = characterSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid character", details: parsed.error.flatten() }, 400);
  }
  const data = parsed.data;
  const abilityScores = data.abilityScores
    ? { ...(existing.abilityScores as Character["abilityScores"]), ...data.abilityScores }
    : existing.abilityScores;
  const level = data.level ?? existing.level;
  const maxHp = data.maxHp ?? existing.maxHp;
  const currentHp = Math.min(data.currentHp ?? existing.currentHp, maxHp);

  db.update(characters)
    .set({
      name: data.name ?? existing.name,
      race: data.race ?? existing.race,
      className: data.className ?? existing.className,
      subclass: data.subclass ?? existing.subclass,
      level,
      abilityScores,
      maxHp,
      currentHp,
      armorClass: data.armorClass ?? existing.armorClass,
      speed: data.speed ?? existing.speed,
      alignment: data.alignment ?? existing.alignment,
      background: data.background ?? existing.background,
      proficiencyBonus: proficiencyBonus(level),
      skills: data.skills ?? existing.skills,
      inventory: data.inventory ?? existing.inventory,
      spells: data.spells ?? existing.spells,
      gold: data.gold ?? existing.gold,
      updatedAt: isoNow(),
    })
    .where(eq(characters.id, id))
    .run();
  const row = db.select().from(characters).where(eq(characters.id, id)).get()!;
  return c.json({ character: rowToCharacter(row) });
});

characterRoutes.delete("/:id", requireAuth, (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const result = db
    .delete(characters)
    .where(and(eq(characters.id, id), eq(characters.userId, user.id)))
    .run();
  if (result.changes === 0) return c.json({ error: "Character not found" }, 404);
  return c.json({ ok: true });
});

function rowToCharacter(row: typeof characters.$inferSelect): Character {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    race: row.race,
    className: row.className,
    subclass: row.subclass ?? undefined,
    level: row.level,
    abilityScores: row.abilityScores as Character["abilityScores"],
    maxHp: row.maxHp,
    currentHp: row.currentHp,
    armorClass: row.armorClass,
    speed: row.speed,
    alignment: row.alignment ?? undefined,
    background: row.background ?? undefined,
    proficiencyBonus: row.proficiencyBonus,
    xp: row.xp ?? 0,
    skills: (row.skills ?? {}) as Character["skills"],
    inventory: (row.inventory ?? []) as Character["inventory"],
    spells: (row.spells as string[] | undefined) ?? undefined,
    spellSlotsUsed: (row.spellSlotsUsed as number[] | undefined) ?? undefined,
    hitDiceUsed: row.hitDiceUsed ?? 0,
    gold: row.gold ?? 0,
    exhaustion: row.exhaustion ?? 0,
    inspiration: Boolean(row.inspiration),
    feats: (row.feats as string[] | undefined) ?? [],
    asiLevels: (row.asiLevels as number[] | undefined) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
