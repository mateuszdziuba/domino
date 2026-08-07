import type { CampaignState, Character, ChatMessage } from "@domino/shared";

export type DmToolName =
  | "get_campaign_state"
  | "get_character"
  | "get_available_actions"
  | "request_dice_roll"
  | "resolve_action"
  | "advance_turn"
  | "update_world_state"
  | "generate_encounter";

export type DmTool = {
  name: DmToolName;
  description: string;
  parameters: Record<string, unknown>;
};

export const DM_TOOLS: DmTool[] = [
  {
    name: "get_campaign_state",
    description: "Read the authoritative campaign state (phase, location, combat, world progress).",
    parameters: {},
  },
  {
    name: "get_character",
    description: "Read a character sheet by id (ability scores, hp, ac, inventory, spells).",
    parameters: { characterId: { type: "string" } },
  },
  {
    name: "get_available_actions",
    description: "List actions currently legal for the character on its turn, per the rules engine.",
    parameters: { characterId: { type: "string" } },
  },
  {
    name: "request_dice_roll",
    description: "Roll dice through the rules engine (e.g. d20, 2d6+3) and return the result.",
    parameters: { notation: { type: "string" }, reason: { type: "string" } },
  },
  {
    name: "resolve_action",
    description: "Resolve a game action against the rules engine and update the authoritative state.",
    parameters: { action: { type: "string" }, characterId: { type: "string" } },
  },
  {
    name: "advance_turn",
    description: "Advance to the next combatant's turn according to the initiative order.",
    parameters: {},
  },
  {
    name: "update_world_state",
    description: "Persist a validated world change (location, scene, world progress, notes).",
    parameters: { patch: { type: "object" } },
  },
  {
    name: "generate_encounter",
    description:
      "Generate and start a combat encounter from a short description. The rules engine picks SRD monsters matching the description, scaled to the party; the AI never invents stat blocks or HP.",
    parameters: { description: { type: "string" } },
  },
];

export type DmContext = {
  campaignId: string;
  characters: Character[];
  state: CampaignState;
  recentMessages: ChatMessage[];
};

export type DmReply = {
  narration: string;
  toolCalls?: { name: DmToolName; arguments: Record<string, unknown> }[];
};

export const DM_MODEL = process.env.DM_MODEL ?? "deepseek-v4-flash";
