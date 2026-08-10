import bcrypt from "bcryptjs";
import { db, sqlite } from "./index.js";
import { users, characters, campaigns, campaignStates, campaignMembers, chatMessages } from "./schema.js";
import { newId } from "../lib/ids.js";
import { defaultCampaignState } from "../rules/state.js";

const username = process.env.SEED_USER ?? "demo";
const password = process.env.SEED_PASSWORD ?? "demo1234";

export function seedIfEmpty(): boolean {
  const existing = db.select().from(users).all();
  if (existing.length > 0) {
    console.log("Database not empty — skipping seed.");
    return false;
  }

const userId = newId();
db.insert(users)
  .values({ id: userId, username, passwordHash: bcrypt.hashSync(password, 10) })
  .run();

const now = new Date().toISOString();
const characterId = newId();
db.insert(characters)
  .values({
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
    maxHp: 24,
    currentHp: 24,
    armorClass: 15,
    speed: 30,
    proficiencyBonus: 2,
    xp: 0,
    skills: { perception: true, medicine: true, insight: true, persuasion: false },
    inventory: [
      { id: "i1", name: "Mace", quantity: 1 },
      { id: "i2", name: "Priest's pack", quantity: 1 },
      { id: "i3", name: "Healing potion", quantity: 2 },
    ],
    spells: ["Cure Wounds", "Healing Word", "Guiding Bolt", "Inflict Wounds", "Sacred Flame", "Spare the Dying"],
    createdAt: now,
    updatedAt: now,
  })
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
