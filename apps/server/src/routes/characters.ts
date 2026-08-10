import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { characters } from "../db/schema.js";
import { newId, isoNow } from "../lib/ids.js";
import { requireAuth } from "../middleware/auth.js";
import { abilityModifier, proficiencyBonus } from "../rules/abilities.js";
import {
  ARMOR_AC,
  POINT_BUY_TOTAL,
  RACE_SPEED,
  STARTING_EQUIPMENT,
  computeArmorClass,
  pointBuyCost,
} from "../rules/creation.js";
import { maxHpForLevel } from "../rules/advancement.js";
import { findFeat } from "../rules/features.js";
import { SRD_GEAR } from "../rules/equipment.js";
import { updateCharacterPortrait } from "../campaign/store.js";
import { buildCharacterSheet } from "../rules/sheet.js";
import type { Character, CharacterSummary } from "@domino/shared";

const abilityScoresSchema = z.object({
  strength: z.number().int().min(8).max(15),
  dexterity: z.number().int().min(8).max(15),
  constitution: z.number().int().min(8).max(15),
  intelligence: z.number().int().min(8).max(15),
  wisdom: z.number().int().min(8).max(15),
  charisma: z.number().int().min(8).max(15),
});

const characterSchema = z.object({
  name: z.string().min(1).max(64),
  race: z.string().min(1).max(32),
  className: z.string().min(1).max(32),
  subclass: z.string().max(64).optional(),
  level: z.number().int().min(1).max(20).default(1),
  abilityScores: abilityScoresSchema,
  maxHp: z.number().int().positive().optional(),
  currentHp: z.number().int().min(0).optional(),
  armorClass: z.number().int().positive().optional(),
  speed: z.number().int().positive().default(30),
  alignment: z.string().max(32).optional(),
  background: z.string().max(128).optional(),
  skills: z.record(z.boolean()).optional(),
  inventory: z.array(z.unknown()).optional(),
  spells: z.array(z.string()).optional(),
  gold: z.number().int().min(0).optional(),
  portraitUrl: z.string().min(1).max(500).optional(),
  startingFeat: z.string().min(1).max(64).optional(),
  featAbility: z.string().optional(),
});

const patchAbilityScoresSchema = z.object({
  strength: z.number().int().min(1).max(30),
  dexterity: z.number().int().min(1).max(30),
  constitution: z.number().int().min(1).max(30),
  intelligence: z.number().int().min(1).max(30),
  wisdom: z.number().int().min(1).max(30),
  charisma: z.number().int().min(1).max(30),
});

const characterPatchSchema = characterSchema
  .omit({ abilityScores: true })
  .partial()
  .extend({ abilityScores: patchAbilityScoresSchema.partial() });

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
    portraitUrl: (r.portraitUrl as string | undefined) ?? undefined,
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
  if (!row) return c.json({ error: "Nie znaleziono postaci." }, 404);
  return c.json({ character: rowToCharacter(row) });
});

characterRoutes.get("/:id/sheet", requireAuth, (c) => {
  const user = c.get("user");
  const row = db
    .select()
    .from(characters)
    .where(and(eq(characters.id, c.req.param("id")), eq(characters.userId, user.id)))
    .get();
  if (!row) return c.json({ error: "Nie znaleziono postaci." }, 404);
  return c.json({ sheet: buildCharacterSheet(rowToCharacter(row)) });
});

characterRoutes.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const parsed = characterSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Nieprawidłowa postać.", details: parsed.error.flatten() }, 400);
  }
  const data = parsed.data;
  if (pointBuyCost(data.abilityScores) > POINT_BUY_TOTAL) {
    return c.json(
      { error: "Wartości cech muszą spełniać zasady Point Buy (27 punktów, 8–15)." },
      400,
    );
  }
  const now = isoNow();
  const id = newId();
  const level = data.level;
  let abilityScores = data.abilityScores;
  let feats: string[] = [];
  if (data.startingFeat) {
    const feat = findFeat(data.startingFeat);
    if (!feat) {
      return c.json({ error: "Nieznany feat: " + data.startingFeat }, 400);
    }
    const bonusAbilities = feat.abilityBonus ?? [];
    const chosen =
      data.featAbility && bonusAbilities.includes(data.featAbility as never)
        ? data.featAbility
        : bonusAbilities[0];
    if (chosen) {
      abilityScores = {
        ...abilityScores,
        [chosen]: Math.min(20, abilityScores[chosen as keyof typeof abilityScores] + 1),
      };
    }
    feats = [feat.name];
  }
  const maxHp = maxHpForLevel(data.className, level, abilityModifier(abilityScores.constitution));
  const starting = STARTING_EQUIPMENT[data.className] ?? STARTING_EQUIPMENT.Fighter!;
  const equippedArmor = starting.items.find((item) => ARMOR_AC[item.name])?.name;
  const shield = starting.items.some((item) => item.name === "Shield");
  const armorClass = computeArmorClass({
    dexterityMod: abilityModifier(abilityScores.dexterity),
    equippedArmor,
    shield,
    className: data.className,
    abilityScores: {
      constitution: abilityScores.constitution,
      wisdom: abilityScores.wisdom,
    },
  });
  const speed = RACE_SPEED[data.race] ?? 30;
  const inventory = starting.items
    .map((item) => {
      const gear = SRD_GEAR.find((g) => g.name === item.name);
      if (!gear) return null;
      return {
        id: newId(),
        name: item.name,
        quantity: item.quantity ?? 1,
        weight: gear.weight,
        description: gear.description,
        slot: item.slot ?? gear.slot,
        icon: gear.icon,
      };
    })
    .filter((item) => item !== null);
  db.insert(characters)
    .values({
      id,
      userId: user.id,
      name: data.name,
      race: data.race,
      className: data.className,
      subclass: data.subclass ?? null,
      level,
      abilityScores,
      feats,
      maxHp,
      currentHp: maxHp,
      armorClass,
      speed,
      alignment: data.alignment ?? null,
      background: data.background ?? null,
      proficiencyBonus: proficiencyBonus(level),
      skills: data.skills ?? {},
      inventory: data.inventory ?? inventory,
      spells: data.spells ?? null,
      gold: data.gold ?? starting.gold,
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
  if (!existing) return c.json({ error: "Nie znaleziono postaci." }, 404);

  const parsed = characterPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Nieprawidłowa postać.", details: parsed.error.flatten() }, 400);
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
      portraitUrl: data.portraitUrl ?? existing.portraitUrl,
      updatedAt: isoNow(),
    })
    .where(eq(characters.id, id))
    .run();
  const row = db.select().from(characters).where(eq(characters.id, id)).get()!;
  return c.json({ character: rowToCharacter(row) });
});

characterRoutes.post("/:id/portrait", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const existing = db
    .select()
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.userId, user.id)))
    .get();
  if (!existing) return c.json({ error: "Nie znaleziono postaci." }, 404);
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) {
    return c.json({ error: "Brak pliku." }, 400);
  }
  if (!file.type.startsWith("image/")) {
    return c.json({ error: "Plik musi być obrazem (JPEG/PNG/WebP)." }, 400);
  }
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: "Obraz jest za duży (maks. 5 MB)." }, 400);
  }
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const dir = fileURLToPath(new URL("../../data/images/portraits", import.meta.url));
  mkdirSync(dir, { recursive: true });
  const filename = `${newId()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(resolve(dir, filename), buffer);
  const url = `/static/images/portraits/${filename}`;
  updateCharacterPortrait(id, url);
  return c.json({ ok: true, portraitUrl: url });
});

characterRoutes.delete("/:id", requireAuth, (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const result = db
    .delete(characters)
    .where(and(eq(characters.id, id), eq(characters.userId, user.id)))
    .run();
  if (result.changes === 0) return c.json({ error: "Nie znaleziono postaci." }, 404);
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
    portraitUrl: (row.portraitUrl as string | undefined) ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
