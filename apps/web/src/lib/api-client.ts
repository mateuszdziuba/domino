import type {
  Campaign,
  CampaignMember,
  CampaignState,
  Character,
  CharacterSheet,
  CharacterSummary,
  ChatMessage,
  DmSuggestion,
  EquipmentSlotInfo,
  GameEvent,
  SrdGearItem,
} from "@domino/shared";
import { api } from "./api";
export type AuthUser = { id: string; username: string };

export const authApi = {
  register: (username: string, password: string) =>
    api<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    api<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => api<{ user: AuthUser }>("/auth/me"),
  logout: () => api<{ ok: boolean }>("/auth/logout", { method: "POST" }),
};

export const characterApi = {
  list: () => api<{ characters: CharacterSummary[] }>("/characters"),
  get: (id: string) => api<{ character: Character }>(`/characters/${id}`),
  sheet: (id: string) => api<{ sheet: CharacterSheet }>(`/characters/${id}/sheet`),
  create: (input: Omit<Character, "id" | "userId" | "currentHp" | "proficiencyBonus" | "createdAt" | "updatedAt">) =>
    api<{ character: Character }>("/characters", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: Partial<Character>) =>
    api<{ character: Character }>(`/characters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => api<{ ok: boolean }>(`/characters/${id}`, { method: "DELETE" }),
};

export type SpellMeta = {
  name: string;
  level: number;
  school: string;
  components: string;
  castingTime: string;
  range: string;
  duration: string;
  description?: string;
  effect: {
    kind: "damage" | "heal" | "stabilize";
    dice?: string;
    damageType?: string;
    attack?: boolean;
    save?: string;
    mod?: boolean;
    flat?: number;
    fullHp?: boolean;
  };
};

export type CampaignDetail = {
  campaign: Campaign;
  state: CampaignState;
  members: CampaignMember[];
};

export const spellbookApi = {
  list: () => api<{ spells: SpellMeta[] }>("/spells"),
};

export type SubclassInfo = {
  name: string;
  features: { name: string; description: string }[];
};

export type FeaturesCatalog = {
  subclasses: Record<string, string[]>;
  subclassDetails?: Record<string, SubclassInfo[]>;
  races: string[];
  classes: string[];
};

export const featuresApi = {
  get: () => api<FeaturesCatalog>("/features"),
};

export type EquipmentCatalog = {
  slots: EquipmentSlotInfo[];
  gear: SrdGearItem[];
  attunementLimit: number;
};

export const equipmentApi = {
  get: () => api<EquipmentCatalog>("/equipment"),
};

export type AttackResultPayload = {
  hit: boolean;
  critical: boolean;
  fumble: boolean;
  attackRoll: number;
  attackTotal: number;
  damageTotal: number;
  damageRolls: number[];
  targetCurrentHp: number;
  targetStatus: string | undefined;
  attackerName: string;
  targetName: string;
};

export type NewEnemy = {
  name: string;
  maxHp: number;
  armorClass: number;
  initiative?: number;
};

export const combatApi = {
  generate: (campaignId: string, description?: string) =>
    api<{ state: CampaignState; monsters: { id: string; name: string }[] }>(
      `/campaigns/${campaignId}/combat/generate`,
      { method: "POST", body: JSON.stringify({ description }) },
    ),
  start: (campaignId: string, enemies: NewEnemy[]) =>
    api<{ state: CampaignState }>(`/campaigns/${campaignId}/combat/start`, {
      method: "POST",
      body: JSON.stringify({ enemies }),
    }),
  advance: (campaignId: string) =>
    api<{ state: CampaignState }>(`/campaigns/${campaignId}/combat/advance`, {
      method: "POST",
    }),
  end: (campaignId: string) =>
    api<{ state: CampaignState }>(`/campaigns/${campaignId}/combat/end`, {
      method: "POST",
    }),
  attack: (
    campaignId: string,
    attackerId: string,
    targetId: string,
    options?: { damageNotation?: string; attackBonus?: number; damageBonus?: number },
  ) =>
    api<{ result: AttackResultPayload; state: CampaignState }>(
      `/campaigns/${campaignId}/combat/attack`,
      { method: "POST", body: JSON.stringify({ attackerId, targetId, ...options }) },
    ),
  deathSave: (campaignId: string, combatantId: string) =>
    api<{ result: { roll: number; successes: number; failures: number; stable: boolean; dead: boolean }; state: CampaignState }>(
      `/campaigns/${campaignId}/combat/death-save`,
      { method: "POST", body: JSON.stringify({ combatantId }) },
    ),
};

export const campaignApi = {
  list: () => api<{ campaigns: Campaign[] }>("/campaigns"),
  get: (id: string) => api<CampaignDetail>(`/campaigns/${id}`),
  create: (name: string, description?: string) =>
    api<{ campaign: Campaign }>("/campaigns", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),
  join: (id: string, characterId: string) =>
    api<{ ok: boolean; members: CampaignMember[] }>(`/campaigns/${id}/join`, {
      method: "POST",
      body: JSON.stringify({ characterId }),
    }),
  dmSuggestion: (id: string) =>
    api<{ suggestion: DmSuggestion | null }>(`/campaigns/${id}/dm-suggestion`),
  messages: (id: string) => api<{ messages: ChatMessage[] }>(`/campaigns/${id}/messages`),
  sendMessage: (id: string, content: string) =>
    api<{ message: ChatMessage; dmMessage: ChatMessage; dmMode: string }>(
      `/campaigns/${id}/messages`,
      { method: "POST", body: JSON.stringify({ content }) },
    ),
  events: (id: string) => api<{ events: GameEvent[] }>(`/campaigns/${id}/events`),
};

export const inviteApi = {
  get: (id: string) => api<{ code: string; url: string }>(`/campaigns/${id}/invite`, { method: "POST" }),
  resolve: (code: string) => api<{ campaign: { id: string; name: string } }>(`/campaigns/invite/${code}`),
  joinByCode: (code: string, characterId: string) =>
    api<{ ok: boolean; campaignId: string; campaignName: string; members: CampaignMember[] }>(
      "/campaigns/join",
      { method: "POST", body: JSON.stringify({ code, characterId }) },
    ),
};
