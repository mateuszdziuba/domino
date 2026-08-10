import bcrypt from "bcryptjs";
import { db, sqlite } from "./index.js";
import { users, characters, campaigns, campaignStates, campaignMembers, chatMessages } from "./schema.js";
import { sql } from "drizzle-orm";
import { newId } from "../lib/ids.js";
import { defaultCampaignState } from "../rules/state.js";
import { maxHpForLevel } from "../rules/advancement.js";
import { abilityModifier } from "../rules/abilities.js";
import { computeArmorClass, STARTING_EQUIPMENT, RACE_SPEED } from "../rules/creation.js";
import { SRD_GEAR } from "../rules/equipment.js";

const username = process.env.SEED_USER ?? "demo";
const password = process.env.SEED_PASSWORD ?? "demo1234";

function buildElaraPayload(userId: string, characterId: string, now: string) {
  const conMod = abilityModifier(13);
  const maxHp = maxHpForLevel("Cleric", 3, conMod);
  const inventory = (STARTING_EQUIPMENT.Cleric ?? STARTING_EQUIPMENT.Fighter!).items
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
    .filter((i) => i !== null);
  return {
    id: characterId,
    userId,
    name: "Elara",
    race: "Human",
    className: "Cleric",
    subclass: "Domena Życia (Life Domain)",
    level: 3,
    abilityScores: {
      strength: 14,
      dexterity: 10,
      constitution: 13,
      intelligence: 10,
      wisdom: 16,
      charisma: 12,
    },
    maxHp,
    currentHp: maxHp,
    armorClass: computeArmorClass({
      dexterityMod: abilityModifier(10),
      equippedArmor: "Scale Mail",
      shield: true,
      className: "Cleric",
      abilityScores: { constitution: 13, wisdom: 16 },
    }),
    speed: RACE_SPEED.Human ?? 30,
    proficiencyBonus: 2,
    xp: 0,
    skills: { perception: true, medicine: true, insight: true, persuasion: false },
    inventory,
    spells: ["Cure Wounds", "Healing Word", "Guiding Bolt", "Inflict Wounds", "Sacred Flame", "Spare the Dying"],
    createdAt: now,
    updatedAt: now,
  };
}

function repairDemoCharacter(now: string): void {
  const existing = db.select().from(characters).where(sql`name = 'Elara'`).get();
  if (!existing) return;
  const payload = buildElaraPayload(existing.userId, existing.id, now);
  db.update(characters)
    .set({
      maxHp: payload.maxHp,
      currentHp: payload.maxHp,
      armorClass: payload.armorClass,
      speed: payload.speed,
      inventory: payload.inventory,
    })
    .where(sql`id = ${existing.id}`)
    .run();
  console.log(`Repaired demo character "Elara": maxHp=${payload.maxHp}, AC=${payload.armorClass}.`);
}

function repairAllCharacters(): void {
  const rows = db.select().from(characters).all();
  for (const row of rows) {
    const scores = (row.abilityScores ?? {}) as {
      strength?: number;
      dexterity?: number;
      constitution?: number;
      wisdom?: number;
    };
    const con = scores.constitution ?? 10;
    const dexMod = abilityModifier(scores.dexterity ?? 10);
    const inventory = (row.inventory ?? []) as {
      name?: string;
      slot?: string;
      quantity?: number;
      weight?: number;
      description?: string;
      icon?: string;
    }[];
    const armorItem = inventory.find((i) => i.slot === "armor");
    const equippedArmor = armorItem?.name;
    const shield = inventory.some((i) => i.name === "Shield" || i.slot === "shield");
    const maxHp = maxHpForLevel(row.className, row.level, abilityModifier(con));
    const armorClass = computeArmorClass({
      dexterityMod: dexMod,
      equippedArmor,
      shield,
      className: row.className,
      abilityScores: { constitution: con, wisdom: scores.wisdom ?? 10 },
    });
    const speed = RACE_SPEED[row.race] ?? 30;
    db.update(characters)
      .set({
        maxHp,
        currentHp: Math.min(row.currentHp ?? maxHp, maxHp),
        armorClass,
        speed,
      })
      .where(sql`id = ${row.id}`)
      .run();
    console.log(
      `Repaired character "${row.name}": maxHp=${maxHp}, AC=${armorClass}, speed=${speed}.`,
    );
  }
}

export function seedIfEmpty(): boolean {
  const now = new Date().toISOString();
  const existing = db.select().from(users).all();
  if (existing.length > 0) {
    repairAllCharacters();
    repairDemoCharacter(now);
    console.log("Database not empty — skipping seed.");
    return false;
  }

const userId = newId();
db.insert(users)
  .values({ id: userId, username, passwordHash: bcrypt.hashSync(password, 10) })
  .run();

const characterId = newId();
db.insert(characters)
  .values(buildElaraPayload(userId, characterId, now))
  .run();

const campaignId = newId();
db.insert(campaigns)
  .values({ id: campaignId, name: "The Sunken Vault", description: "A heist in a flooded dwarven city.", ownerId: userId })
  .run();
db.insert(campaignStates).values({ campaignId, state: defaultCampaignState() }).run();
db.insert(campaignMembers)
  .values({ campaignId, userId, characterId })
  .run();
db.insert(chatMessages)
  .values({
    id: newId(),
    campaignId,
    senderName: "DM",
    role: "dm",
    content: "Welcome to the Sunken Vault. The waterlogged stairs lead down into the dark — describe what Elara does.",
  })
  .run();

console.log(`Seeded demo user "${username}" / "${password}" with character "Elara" (Cleric 3) and campaign "The Sunken Vault".`);
  return true;
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url ===
    new URL(`file://${process.argv[1].startsWith("/") ? "" : process.cwd() + "/"}${process.argv[1]}`).href;

if (isMain) {
  seedIfEmpty();
  sqlite.close();
}
