import type { CampaignState, Character, ChatMessage } from "@domino/shared";

export type DmToolName =
  | "get_campaign_state"
  | "get_character"
  | "get_available_actions"
  | "request_dice_roll"
  | "resolve_action"
  | "attack_combatant"
  | "opportunity_attack"
  | "bonus_attack"
  | "move_combatant"
  | "set_battlefield"
  | "set_lighting"
  | "cast_spell"
  | "monster_cast"
  | "resolve_death_save"
  | "advance_turn"
  | "end_combat"
  | "take_short_rest"
  | "take_long_rest"
  | "apply_condition"
  | "remove_condition"
  | "environment_hazard"
  | "set_exhaustion"
  | "stop_concentration"
  | "set_inspiration"
  | "award_xp"
  | "grant_loot"
  | "create_custom_item"
  | "update_world_state"
  | "start_adventure"
  | "create_adventure"
  | "generate_encounter"
  | "random_encounter"
  | "skill_check"
  | "use_item"
  | "generate_image"
  | "generate_portrait";

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
      "Resolve an attack by a combatant against a target through the rules engine. The attacker must be the current combatant in the initiative order. Applies damage to the target, updates HP/status (downed/dead), applies the equipped weapon's Mastery rider (SRD 5.2.1; only when the wielder has the Weapon Mastery feature), and saves the authoritative state. Returns the attack roll result.",
    parameters: {
      attackerId: { type: "string" },
      targetId: { type: "string" },
      damageNotation: { type: "string" },
      attackBonus: { type: "number" },
      damageBonus: { type: "number" },
      advantage: { type: "boolean" },
      disadvantage: { type: "boolean" },
      useInspiration: { type: "boolean" },
    },
  },
  {
    name: "opportunity_attack",
    description:
      "Resolve an opportunity attack (reaction) when a hostile leaves a combatant's reach. Uses the attacker's reaction for the round.",
    parameters: {
      attackerId: { type: "string" },
      targetId: { type: "string" },
      damageNotation: { type: "string" },
      attackBonus: { type: "number" },
      damageBonus: { type: "number" },
    },
  },
  {
    name: "bonus_attack",
    description:
      "Two-weapon fighting: a bonus-action attack with the off-hand Light weapon (no damage bonus). Requires two equipped Light weapons and an available bonus action. With a Nick off-hand weapon the attack is part of the Attack action and does not consume the bonus action. Applies the off-hand weapon's Mastery rider.",
    parameters: {
      attackerId: { type: "string" },
      targetId: { type: "string" },
      damageNotation: { type: "string" },
      attackBonus: { type: "number" },
      damageBonus: { type: "number" },
    },
  },
  {
    name: "move_combatant",
    description:
      "Move a combatant on the abstract 1-D battle line: position is feet from the melee cluster (0 = in melee). The move costs the absolute distance travelled against the combatant's movement budget (movementLeft, refreshed each turn to its speed; the Slow mastery reduces it by 10 ft). On a battlefield grid (set_battlefield) pass x/y grid coordinates instead; the cost is the Manhattan distance in 5-ft squares. Updates the authoritative combat state.",
    parameters: {
      combatantId: { type: "string" },
      feet: { type: "number" },
      x: { type: "number" },
      y: { type: "number" },
    },
  },
  {
    name: "set_battlefield",
    description:
      "Set up the combat grid (battlefield) for the active combat: 5-ft squares. Combatants are placed automatically — player characters along the left edge, enemies along the right edge. Coordinates start at (1,1) in the top-left corner.",
    parameters: {
      cols: { type: "number" },
      rows: { type: "number" },
      theme: { type: "string" },
    },
  },
  {
    name: "set_lighting",
    description:
      "Set the combat's light level (bright, dim or dark). In darkness, attackers without darkvision attack with disadvantage and targets without darkvision are attacked with advantage (SRD heavily obscured).",
    parameters: { level: { type: "string" } },
  },
  {
    name: "cast_spell",
    description:
      "Cast a known spell through the rules engine. In combat the caster must be the current combatant; the target is a combatant id. Outside combat only healing/stabilizing cantrips and spells are allowed, and the target is a character id. Consumes a spell slot (cantrips are free). Concentration spells (Hold Person, Blindness/Deafness, Spirit Guardians, Banishment, Blade Barrier) start concentration and replace any spell the caster was already concentrating on. Spells are resolved by the engine — never invent damage or healing.",
    parameters: {
      characterId: { type: "string" },
      spellName: { type: "string" },
      targetId: { type: "string" },
    },
  },
  {
    name: "monster_cast",
    description:
      "Cast a spell known to a monster spellcaster (SRD 5.2.1 stat block) through the rules engine. The caster must be a monster combatant (no characterId) on its turn. The spell list, spell save DC and spell attack bonus come from the SRD stat block; damage, healing, conditions and concentration are resolved by the engine — never invent damage or healing.",
    parameters: {
      combatantId: { type: "string" },
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
      "Apply a SRD condition (blinded, frightened, poisoned, prone, restrained, paralyzed, petrified, stunned, unconscious, incapacitated, banished) to a combatant in the active combat.",
    parameters: { combatantId: { type: "string" }, condition: { type: "string" } },
  },
  {
    name: "remove_condition",
    description:
      "Remove a condition from a combatant in the active combat. Also works for the internal guiding_bolt, sapped, vexed and slowed mastery markers (pass the prefix, e.g. \"vexed\" or \"slowed\", to clear all instances).",
    parameters: { combatantId: { type: "string" }, condition: { type: "string" } },
  },
  {
    name: "environment_hazard",
    description:
      "Resolve an environmental hazard (SRD) against a combatant in active combat. falling: 1d6 bludgeoning damage per 10 feet (max 20d6), the target lands prone. suffocation: the target can survive 1 + CON modifier rounds without air; past that it takes 10 damage per round.",
    parameters: {
      type: { type: "string" },
      combatantId: { type: "string" },
      feet: { type: "number" },
      conSaves: { type: "number" },
    },
  },
  {
    name: "set_exhaustion",
    description:
      "Set a character's exhaustion level (0-6, SRD). Long rests reduce it by 1; hazards may increase it.",
    parameters: { characterId: { type: "string" }, level: { type: "number" } },
  },
  {
    name: "stop_concentration",
    description:
      "End a combatant's concentration on a spell (SRD): concentration also ends when the caster casts another concentration spell, takes damage and fails a CON save (DC 10 or half damage, whichever is higher), or is incapacitated or reduced to 0 HP.",
    parameters: { combatantId: { type: "string" } },
  },
  {
    name: "set_inspiration",
    description:
      "Grant or remove a character's inspiration (SRD): with inspiration, the player may spend it to gain advantage on one roll.",
    parameters: { characterId: { type: "string" }, has: { type: "boolean" } },
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
    name: "create_custom_item",
    description:
      "Create a unique custom item that does not exist in the SRD catalog (narrative treasure, plot artifact, crafted object). You set a sensible price in gold (0 for priceless quest items, up to 5000). The item is stored scoped to this campaign only — it will never appear in any other campaign's merchant and cannot be bought anywhere; it is added directly to the named character's inventory. Use for items that have narrative meaning; for standard gear use grant_loot instead.",
    parameters: {
      characterId: { type: "string" },
      name: { type: "string" },
      description: { type: "string" },
      priceGp: { type: "number" },
      weight: { type: "number" },
      slot: { type: "string" },
      attuned: { type: "boolean" },
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
  {
    name: "generate_image",
    description:
      "Generate an AI illustration for a key campaign moment (battles, discoveries, scenes). Returns an image URL shown in the chat.",
    parameters: { prompt: { type: "string" }, style: { type: "string" } },
  },
  {
    name: "generate_portrait",
    description:
      "Generate an AI portrait for a character (used for their portrait on the sheet).",
    parameters: { characterId: { type: "string" } },
  },
  {
    name: "random_encounter",
    description:
      "Generate a random SRD encounter weighted to the party's level (optional terrain filter) and start combat.",
    parameters: { terrain: { type: "string" }, description: { type: "string" } },
  },
  {
    name: "skill_check",
    description:
      "Resolve a skill check for a character against a DC through the rules engine (optional advantage/disadvantage; useInspiration spends inspiration for advantage).",
    parameters: {
      characterId: { type: "string" },
      skill: { type: "string" },
      dc: { type: "number" },
      advantage: { type: "boolean" },
      disadvantage: { type: "boolean" },
      useInspiration: { type: "boolean" },
      reason: { type: "string" },
    },
  },
  {
    name: "use_item",
    description:
      "Use an item from a character's inventory (v1: healing potions — consume and heal 2k4+2 / 4k4+4 / 8k4+8 / 10k4+20).",
    parameters: {
      characterId: { type: "string" },
      itemId: { type: "string" },
      targetId: { type: "string" },
    },
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
