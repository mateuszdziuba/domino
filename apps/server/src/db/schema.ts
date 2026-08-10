import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("users_username_unique").on(t.username)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const characters = sqliteTable(
  "characters",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    race: text("race").notNull(),
    className: text("class_name").notNull(),
    subclass: text("subclass"),
    level: integer("level").notNull().default(1),
    abilityScores: text("ability_scores", { mode: "json" }).notNull(),
    maxHp: integer("max_hp").notNull(),
    currentHp: integer("current_hp").notNull(),
    armorClass: integer("armor_class").notNull(),
    speed: integer("speed").notNull().default(30),
    alignment: text("alignment"),
    background: text("background"),
    notes: text("notes"),
    proficiencyBonus: integer("proficiency_bonus").notNull().default(2),
    skills: text("skills", { mode: "json" }).notNull().default({}),
    inventory: text("inventory", { mode: "json" }).notNull().default([]),
    spells: text("spells", { mode: "json" }),
    spellSlotsUsed: text("spell_slots_used", { mode: "json" }).notNull().default([]),
    xp: integer("xp").notNull().default(0),
    hitDiceUsed: integer("hit_dice_used").notNull().default(0),
    gold: integer("gold").notNull().default(0),
    exhaustion: integer("exhaustion").notNull().default(0),
    inspiration: integer("inspiration").notNull().default(0),
    feats: text("feats", { mode: "json" }).notNull().default([]),
    asiLevels: text("asi_levels", { mode: "json" }).notNull().default([]),
    portraitUrl: text("portrait_url"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("characters_user_idx").on(t.userId)],
);

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inviteCode: text("invite_code").unique(),
  dmEnabled: integer("dm_enabled", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const customItems = sqliteTable("custom_items", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  weight: real("weight"),
  priceGp: integer("price_gp").notNull(),
  category: text("category").notNull().default("magic"),
  slot: text("slot"),
  icon: text("icon").notNull().default("Package"),
  attuned: integer("attuned", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const campaignMembers = sqliteTable(
  "campaign_members",
  {
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    joinedAt: text("joined_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    uniqueIndex("campaign_members_campaign_character_unique").on(
      t.campaignId,
      t.characterId,
    ),
    uniqueIndex("campaign_members_campaign_user_unique").on(
      t.campaignId,
      t.userId,
    ),
  ],
);

export const campaignStates = sqliteTable(
  "campaign_states",
  {
    campaignId: text("campaign_id")
      .primaryKey()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    state: text("state", { mode: "json" }).notNull(),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
);

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    senderId: text("sender_id").references(() => users.id, {
      onDelete: "set null",
    }),
    senderName: text("sender_name").notNull(),
    role: text("role", { enum: ["player", "dm"] }).notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("chat_campaign_idx").on(t.campaignId)],
);

export const gameEvents = sqliteTable(
  "game_events",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payload: text("payload", { mode: "json" }).notNull().default({}),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("events_campaign_idx").on(t.campaignId)],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type CharacterRow = typeof characters.$inferSelect;
export type CampaignRow = typeof campaigns.$inferSelect;
export type CampaignMemberRow = typeof campaignMembers.$inferSelect;
export type CampaignStateRow = typeof campaignStates.$inferSelect;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type GameEventRow = typeof gameEvents.$inferSelect;
