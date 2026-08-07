import type { CampaignState, Character, ChatMessage } from "@domino/shared";

export type DmToolName =
  | "get_campaign_state"
  | "get_character"
  | "get_available_actions"
  | "request_dice_roll"
  | "resolve_action"
  | "attack_combatant"
  | "cast_spell"
  | "resolve_death_save"
  | "advance_turn"
  | "end_combat"
  | "take_short_rest"
  | "take_long_rest"
  | "apply_condition"
  | "remove_condition"
  | "award_xp"
  | "grant_loot"
  | "update_world_state"
  | "start_adventure"
  | "create_adventure"
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
    name: "attack_combatant",
    description:
      "Resolve an attack by a combatant against a target through the rules engine. The attacker must be the current combatant in the initiative order. Applies damage to the target, updates HP/status (downed/dead), and saves the authoritative state. Returns the attack roll result.",
    parameters: {
      attackerId: { type: "string" },
      targetId: { type: "string" },
      damageNotation: { type: "string" },
      attackBonus: { type: "number" },
      damageBonus: { type: "number" },
    },
  },
  {
    name: "cast_spell",
    description:
      "Cast a known spell through the rules engine. In combat the caster must be the current combatant; the target is a combatant id. Outside combat only healing/stabilizing cantrips and spells are allowed, and the target is a character id. Consumes a spell slot (cantrips are free). Spells are resolved by the engine — never invent damage or healing.",
    parameters: {
      characterId: { type: "string" },
      spellName: { type: "string" },
      targetId: { type: "string" },
    },
  },
  {
    name: "resolve_death_save",
    description:
      "Roll and apply a death save for a downed combatant (0 HP) through the rules engine. A natural 20 restores 1 HP and stabilizes; 3 successes stabilizes, 3 failures is death.",
    parameters: { combatantId: { type: "string" } },
  },
  {
    name: "advance_turn",
    description: "Advance to the next combatant's turn according to the initiative order.",
    parameters: {},
  },
  {
    name: "end_combat",
    description:
      "End the active combat: each combatant's HP is written back to the character sheets and the campaign returns to exploration.",
    parameters: {},
  },
  {
    name: "take_short_rest",
    description:
      "The party takes a short rest (at least 1 hour): each character may spend Hit Dice to heal (class die + CON mod per die). Only outside combat.",
    parameters: { hitDice: { type: "number" } },
  },
  {
    name: "take_long_rest",
    description:
      "The party takes a long rest (at least 8 hours, per SRD): every character in the campaign recovers to full HP, regains spell slots, and restores half of its Hit Dice (minimum 1). Only allowed outside combat.",
    parameters: {},
  },
  {
    name: "apply_condition",
    description:
      "Apply a SRD condition (blinded, frightened, poisoned, prone, restrained, paralyzed, petrified, stunned, unconscious, incapacitated) to a combatant in the active combat.",
    parameters: { combatantId: { type: "string" }, condition: { type: "string" } },
  },
  {
    name: "remove_condition",
    description:
      "Remove a condition from a combatant in the active combat. Also works for the internal guiding_bolt marker.",
    parameters: { combatantId: { type: "string" }, condition: { type: "string" } },
  },
  {
    name: "award_xp",
    description:
      "Award experience points to the whole party (split equally among the member characters), e.g. for quest rewards. Combat XP is granted automatically when combat ends.",
    parameters: { amount: { type: "number" }, reason: { type: "string" } },
  },
  {
    name: "grant_loot",
    description:
      "Grant treasure to a character (gold and/or items). If characterId is omitted, gold is split equally among the party members (items go to the first member).",
    parameters: {
      characterId: { type: "string" },
      gold: { type: "number" },
      items: { type: "array" },
    },
  },
  {
    name: "update_world_state",
    description: "Persist a validated world change (location, scene, world progress, notes).",
    parameters: { patch: { type: "object" } },
  },
  {
    name: "start_adventure",
    description:
      "Start a built-in free D&D 5e adventure from the library (preferred when the party begins a new adventure). Updates the campaign's location, scene, and world progress.",
    parameters: { title: { type: "string" } },
  },
  {
    name: "create_adventure",
    description:
      "Create a brand-new custom adventure from the players' description when no library adventure fits. Updates the campaign's location, scene, and notes.",
    parameters: { description: { type: "string" } },
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
