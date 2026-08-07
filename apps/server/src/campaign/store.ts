import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  campaignMembers,
  campaignStates,
  campaigns,
  characters,
  chatMessages,
  gameEvents,
} from "../db/schema.js";
import { newId, isoNow } from "../lib/ids.js";
import { defaultCampaignState } from "../rules/state.js";
import { applyLevelUp } from "../rules/advancement.js";
import { broadcast } from "./hub.js";
import type {
  Campaign,
  CampaignMember,
  CampaignState,
  Character,
  ChatMessage,
  GameEvent,
  GameEventType,
} from "@domino/shared";

export function getCampaignForUser(id: string, userId: string): Campaign | undefined {
  const campaign = db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return undefined;
  const isOwner = campaign.ownerId === userId;
  const isMember = Boolean(getMember(id, userId));
  if (!isOwner && !isMember) return undefined;
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description ?? undefined,
    ownerId: campaign.ownerId,
    createdAt: campaign.createdAt,
    state: loadState(id),
  };
}

export function loadState(campaignId: string): CampaignState {
  const row = db
    .select()
    .from(campaignStates)
    .where(eq(campaignStates.campaignId, campaignId))
    .get();
  return (row?.state ?? defaultCampaignState()) as CampaignState;
}

export function saveState(campaignId: string, state: CampaignState): CampaignState {
  const now = isoNow();
  const saved: CampaignState = { ...state, updatedAt: now };
  db.insert(campaignStates)
    .values({ campaignId, state: saved, updatedAt: now })
    .onConflictDoUpdate({
      target: campaignStates.campaignId,
      set: { state: saved, updatedAt: now },
    })
    .run();
  broadcast(campaignId, { type: "state.updated", campaignId, payload: { state: saved } });
  return saved;
}

export function pushEvent(
  campaignId: string,
  type: GameEventType,
  payload: unknown,
): GameEvent {
  const event: GameEvent = {
    id: newId(),
    campaignId,
    type,
    payload,
    createdAt: isoNow(),
  };
  db.insert(gameEvents).values(event).run();
  broadcast(campaignId, {
    type: event.type,
    campaignId,
    payload: event.payload,
    id: event.id,
    createdAt: event.createdAt,
  });
  return event;
}

export function getCampaignMembers(campaignId: string): CampaignMember[] {
  const rows = db
    .select({ member: campaignMembers })
    .from(campaignMembers)
    .where(eq(campaignMembers.campaignId, campaignId))
    .all();
  return rows.map(({ member }) => ({
    campaignId: member.campaignId,
    userId: member.userId,
    characterId: member.characterId,
    characterName: getCharacterById(member.characterId)?.name,
    joinedAt: member.joinedAt,
  }));
}

export function getMember(campaignId: string, userId: string): CampaignMember | undefined {
  return db
    .select()
    .from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)))
    .get() as CampaignMember | undefined;
}

export function getCharacterById(id: string): Character | undefined {
  const row = db.select().from(characters).where(eq(characters.id, id)).get();
  return row ? rowToCharacter(row) : undefined;
}

export function getCampaignCharacters(campaignId: string): Character[] {
  return getCampaignMembers(campaignId)
    .map((m) => getCharacterById(m.characterId))
    .filter((c): c is Character => Boolean(c));
}

export function updateCharacterHp(characterId: string, currentHp: number): void {
  db.update(characters)
    .set({ currentHp: Math.max(0, currentHp), updatedAt: isoNow() })
    .where(eq(characters.id, characterId))
    .run();
}

export function updateCharacterSpellSlots(characterId: string, used: number[]): void {
  db.update(characters)
    .set({ spellSlotsUsed: used, updatedAt: isoNow() })
    .where(eq(characters.id, characterId))
    .run();
}

export function updateCharacterHitDice(characterId: string, used: number): void {
  db.update(characters)
    .set({ hitDiceUsed: Math.max(0, used), updatedAt: isoNow() })
    .where(eq(characters.id, characterId))
    .run();
}

export function grantXp(characterId: string, amount: number): { xp: number; level: number } {
  const row = db.select().from(characters).where(eq(characters.id, characterId)).get();
  if (!row) return { xp: 0, level: 1 };
  const newXp = (row.xp ?? 0) + amount;
  const result = applyLevelUp({
    xp: newXp,
    level: row.level,
    className: row.className,
    constitution: (row.abilityScores as Character["abilityScores"]).constitution,
  });
  db.update(characters)
    .set({
      xp: newXp,
      level: result.newLevel,
      maxHp: row.maxHp + result.maxHpDelta,
      proficiencyBonus: result.newProficiency,
      updatedAt: isoNow(),
    })
    .where(eq(characters.id, characterId))
    .run();
  return { xp: newXp, level: result.newLevel };
}

export function getRecentMessages(campaignId: string, limit = 50): ChatMessage[] {
  const rows = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.campaignId, campaignId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit)
    .all();
  return rows.map(rowToMessage);
}

function rowToMessage(row: typeof chatMessages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    campaignId: row.campaignId,
    senderId: row.senderId ?? undefined,
    senderName: row.senderName,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt,
  };
}

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
    skills: (row.skills ?? {}) as Character["skills"],
    inventory: (row.inventory ?? []) as Character["inventory"],
    spells: (row.spells as string[] | undefined) ?? undefined,
    spellSlotsUsed: (row.spellSlotsUsed as number[] | undefined) ?? undefined,
    hitDiceUsed: row.hitDiceUsed ?? 0,
    xp: row.xp ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
