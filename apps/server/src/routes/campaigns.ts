import { randomInt } from "node:crypto";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
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
import { requireAuth } from "../middleware/auth.js";
import { defaultCampaignState } from "../rules/state.js";
import { ADVENTURES, buildAdventureState, findAdventure } from "../rules/adventures.js";
import { buildDmSuggestion } from "../rules/actions.js";
import { combatantByCharacter, currentTurnCombatant } from "../rules/combat.js";
import { dmNarrate } from "../dm/index.js";
import { dmProvider, isDmConfigured } from "../dm/llm.js";
import {
  getCampaignCharacters,
  getCampaignMembers,
  getCharacterById,
  getMember,
  getRecentMessages,
  loadState,
  pushEvent,
  saveState,
} from "../campaign/store.js";
import { subscribe } from "../campaign/hub.js";
import { combatRoutes } from "./combat.js";
import type {
  Campaign,
  CampaignState,
  ChatMessage,
  DmSuggestion,
  GameEvent,
} from "@domino/shared";

const campaignSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(500).optional(),
  adventure: z.string().max(64).optional(),
  dmEnabled: z.boolean().optional(),
});

type StoredState = CampaignState & { started: boolean };

const joinSchema = z.object({
  characterId: z.string().min(1),
});

const joinByInviteSchema = z.object({
  code: z.string().min(1).max(64),
  characterId: z.string().min(1),
});

const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  }
  return code;
}

const chatSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const campaignRoutes = new Hono();

campaignRoutes.get("/", requireAuth, (c) => {
  const user = c.get("user");
  const owned = db.select().from(campaigns).where(eq(campaigns.ownerId, user.id)).all();
  const memberRows = db
    .select({ campaign: campaigns, member: campaignMembers })
    .from(campaignMembers)
    .innerJoin(campaigns, eq(campaignMembers.campaignId, campaigns.id))
    .where(eq(campaignMembers.userId, user.id))
    .all();
  const memberCampaigns = memberRows.map((r) => r.campaign);
  const seen = new Set<string>();
  const list = [...owned, ...memberCampaigns].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  const result = list.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    ownerId: c.ownerId,
    createdAt: c.createdAt,
    state: loadState(c.id),
  }));
  return c.json({ campaigns: result });
});

campaignRoutes.get("/:id", requireAuth, (c) => {
  const user = c.get("user");
  const campaign = getCampaignForUser(c.req.param("id"), user.id);
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  return c.json({
    campaign,
    state: loadState(campaign.id),
    members: getCampaignMembers(campaign.id),
  });
});

campaignRoutes.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const parsed = campaignSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Nieprawidłowa kampania.", details: parsed.error.flatten() }, 400);
  }
  let initial: StoredState = { ...defaultCampaignState(), started: false };
  if (parsed.data.adventure) {
    const adventure = findAdventure(parsed.data.adventure);
    if (!adventure) {
      const available = ADVENTURES.map((a) => a.title).join(", ");
      return c.json(
        { error: `Nieznana przygoda: ${parsed.data.adventure}. Dostępne: ${available}.` },
        400,
      );
    }
    initial = {
      ...defaultCampaignState(),
      ...buildAdventureState(adventure),
      started: false,
      phase: "exploration",
    };
  }
  const id = newId();
  db.transaction((tx) => {
    tx.insert(campaigns)
      .values({
        id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        ownerId: user.id,
        dmEnabled: parsed.data.dmEnabled ?? false,
      })
      .run();
    tx.insert(campaignStates).values({ campaignId: id, state: initial }).run();
  });
  pushEvent(id, "campaign.created", { by: user.id });
  const row = db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  return c.json({ campaign: { ...row, state: initial } }, 201);
});

campaignRoutes.post("/:id/start", requireAuth, (c) => {
  const user = c.get("user");
  const campaign = getCampaignForUser(c.req.param("id"), user.id);
  if (!campaign || campaign.ownerId !== user.id) {
    return c.json({ error: "Nie znaleziono kampanii." }, 404);
  }
  const state = loadState(campaign.id) as StoredState;
  if (state.started) return c.json({ error: "Kampania już trwa." }, 400);
  const updated: StoredState = { ...state, started: true };
  saveState(campaign.id, updated);
  pushEvent(campaign.id, "state.updated", { by: "owner", action: "start" });
  return c.json({ state: updated });
});

campaignRoutes.post("/:id/invite", requireAuth, (c) => {
  const user = c.get("user");
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, c.req.param("id")))
    .get();
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  const isOwner = campaign.ownerId === user.id;
  const isMember = Boolean(getMember(campaign.id, user.id));
  if (!isOwner && !isMember) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  if (!isOwner) return c.json({ error: "Brak kodu zaproszenia — wygeneruj go jako właściciel." }, 404);
  let code = campaign.inviteCode;
  if (!code) {
    code = generateInviteCode();
    db.update(campaigns).set({ inviteCode: code }).where(eq(campaigns.id, campaign.id)).run();
  }
  const origin =
    process.env.WEB_ORIGIN ??
    (c.req.url.startsWith("http") ? new URL(c.req.url).origin : "http://localhost:5173");
  const url = `${origin}/join?code=${code}`;
  return c.json({ code, url });
});

campaignRoutes.get("/invite/:code", requireAuth, (c) => {
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.inviteCode, c.req.param("code")))
    .get();
  if (!campaign) return c.json({ error: "Nieprawidłowy kod zaproszenia." }, 404);
  return c.json({ campaign: { id: campaign.id, name: campaign.name } });
});

campaignRoutes.post("/join", requireAuth, async (c) => {
  const user = c.get("user");
  const parsed = joinByInviteSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Wymagany jest kod zaproszenia i ID postaci." }, 400);
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.inviteCode, parsed.data.code))
    .get();
  if (!campaign) return c.json({ error: "Nieprawidłowy kod zaproszenia." }, 404);
  const character = db
    .select()
    .from(characters)
    .where(and(eq(characters.id, parsed.data.characterId), eq(characters.userId, user.id)))
    .get();
  if (!character) return c.json({ error: "Nie znaleziono postaci." }, 404);
  const existing = getMember(campaign.id, user.id);
  if (existing) return c.json({ error: "Już jesteś członkiem tej kampanii." }, 409);

  db.transaction((tx) => {
    tx.insert(campaignMembers)
      .values({ campaignId: campaign.id, userId: user.id, characterId: character.id })
      .run();
  });
  pushEvent(campaign.id, "character.joined", {
    userId: user.id,
    characterId: character.id,
  });
  return c.json(
    {
      ok: true,
      campaignId: campaign.id,
      campaignName: campaign.name,
      members: getCampaignMembers(campaign.id),
    },
    201,
  );
});

campaignRoutes.post("/:id/join", requireAuth, async (c) => {
  const user = c.get("user");
  const campaign = db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, c.req.param("id")))
    .get();
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  const isOwner = campaign.ownerId === user.id;
  const existing = getMember(campaign.id, user.id);
  if (!isOwner && !existing) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  const parsed = joinSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Wymagane jest ID postaci." }, 400);
  const character = db
    .select()
    .from(characters)
    .where(and(eq(characters.id, parsed.data.characterId), eq(characters.userId, user.id)))
    .get();
  if (!character) return c.json({ error: "Nie znaleziono postaci." }, 404);
  if (existing) return c.json({ error: "Już jesteś członkiem tej kampanii." }, 409);

  db.transaction((tx) => {
    tx.insert(campaignMembers)
      .values({ campaignId: campaign.id, userId: user.id, characterId: character.id })
      .run();
  });
  pushEvent(campaign.id, "character.joined", {
    userId: user.id,
    characterId: character.id,
  });
  return c.json({ ok: true, members: getCampaignMembers(campaign.id) }, 201);
});

campaignRoutes.get("/:id/state", requireAuth, (c) => {
  const user = c.get("user");
  const campaign = getCampaignForUser(c.req.param("id"), user.id);
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  return c.json({ state: loadState(campaign.id) });
});

campaignRoutes.get("/:id/dm-suggestion", requireAuth, (c) => {
  const user = c.get("user");
  const campaign = getCampaignForUser(c.req.param("id"), user.id);
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  const member = getMember(campaign.id, user.id);
  const state = loadState(campaign.id);
  let suggestion: DmSuggestion | null = null;
  if (member) {
    const character = getCampaignCharacters(campaign.id).find(
      (ch) => ch.id === member.characterId,
    );
    if (character) {
      suggestion = buildDmSuggestion(character, state);
    }
  }
  return c.json({ suggestion });
});

campaignRoutes.get("/:id/messages", requireAuth, (c) => {
  const user = c.get("user");
  const campaign = getCampaignForUser(c.req.param("id"), user.id);
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  return c.json({ messages: getRecentMessages(campaign.id, 500) });
});

campaignRoutes.post("/:id/messages", requireAuth, async (c) => {
  const user = c.get("user");
  const campaign = getCampaignForUser(c.req.param("id"), user.id);
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  const parsed = chatSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Wiadomość jest pusta lub za długa." }, 400);

  const member = getMember(campaign.id, user.id);
  const chatState = loadState(campaign.id);
  const isOwner = campaign.ownerId === user.id;
  if (!isOwner && chatState.combat.active) {
    const combatant = member ? combatantByCharacter(chatState, member.characterId) : undefined;
    const current = currentTurnCombatant(chatState);
    if (!combatant || !current || current.id !== combatant.id) {
      return c.json(
        { error: "To nie Twoja tura — poczekaj, aż DM odda Ci głos." },
        403,
      );
    }
  }

  const playerMessage: ChatMessage = {
    id: newId(),
    campaignId: campaign.id,
    senderId: user.id,
    senderName: member ? getCharacterById(member.characterId)?.name ?? user.username : user.username,
    role: "player",
    content: parsed.data.content,
    createdAt: isoNow(),
  };
  db.insert(chatMessages).values(playerMessage).run();
  pushEvent(campaign.id, "chat.message", { message: playerMessage });

  const state = loadState(campaign.id);
  const charactersInCampaign = getCampaignCharacters(campaign.id);
  const recent = getRecentMessages(campaign.id);

  const dmReply = await dmNarrate(
    { campaignId: campaign.id, characters: charactersInCampaign, state, recentMessages: recent },
    parsed.data.content,
  );
  const dmMessage: ChatMessage = {
    id: newId(),
    campaignId: campaign.id,
    senderName: "DM",
    role: "dm",
    content: dmReply.narration,
    createdAt: isoNow(),
  };
  db.insert(chatMessages).values(dmMessage).run();
  pushEvent(campaign.id, "chat.message", { message: dmMessage });

  return c.json(
    {
      message: playerMessage,
      dmMessage,
      dmMode: isDmConfigured() ? dmProvider() : "preview",
    },
    201,
  );
});

campaignRoutes.get("/:id/events", requireAuth, (c) => {
  const user = c.get("user");
  const campaign = getCampaignForUser(c.req.param("id"), user.id);
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  const rows = db
    .select()
    .from(gameEvents)
    .where(eq(gameEvents.campaignId, campaign.id))
    .orderBy(asc(gameEvents.createdAt))
    .all();
  const events: GameEvent[] = rows.map((r) => ({
    id: r.id,
    campaignId: r.campaignId,
    type: r.type as GameEvent["type"],
    payload: r.payload,
    createdAt: r.createdAt,
  }));
  return c.json({ events });
});

campaignRoutes.get("/:id/stream", requireAuth, (c) => {
  const user = c.get("user");
  const campaign = getCampaignForUser(c.req.param("id"), user.id);
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  return streamSSE(c, async (stream) => {
    const unsub = subscribe(campaign.id, (event) => {
      try {
        void stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
      } catch (err) {
        if (!stream.closed) throw err;
      }
    });
    await stream.writeSSE({ event: "connected", data: JSON.stringify({ ok: true }) });
    const heartbeat = setInterval(() => {
      void stream.write(": ping\n\n");
    }, 15_000);
    stream.onAbort(() => {
      clearInterval(heartbeat);
      unsub();
    });
    while (!stream.closed) {
      await stream.sleep(1000);
    }
  });
});

campaignRoutes.patch("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const campaign = db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  if (campaign.ownerId !== user.id) {
    return c.json({ error: "Tylko twórca kampanii może zmieniać ustawienia." }, 403);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ dmEnabled: z.boolean() }).safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Nieprawidłowe ustawienia." }, 400);
  }
  db.update(campaigns)
    .set({ dmEnabled: parsed.data.dmEnabled })
    .where(eq(campaigns.id, id))
    .run();
  return c.json({ ok: true, dmEnabled: parsed.data.dmEnabled });
});

campaignRoutes.delete("/:id", requireAuth, (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const campaign = db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return c.json({ error: "Nie znaleziono kampanii." }, 404);
  if (campaign.ownerId !== user.id) {
    return c.json({ error: "Tylko twórca kampanii może ją usunąć." }, 403);
  }
  db.delete(gameEvents).where(eq(gameEvents.campaignId, id)).run();
  db.delete(chatMessages).where(eq(chatMessages.campaignId, id)).run();
  db.delete(campaignStates).where(eq(campaignStates.campaignId, id)).run();
  db.delete(campaignMembers).where(eq(campaignMembers.campaignId, id)).run();
  db.delete(campaigns).where(eq(campaigns.id, id)).run();
  return c.json({ ok: true });
});

campaignRoutes.route("/:id/combat", combatRoutes);

function getCampaignForUser(id: string, userId: string): Campaign | undefined {
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
    dmEnabled: campaign.dmEnabled,
    createdAt: campaign.createdAt,
    state: loadState(id),
  };
}
