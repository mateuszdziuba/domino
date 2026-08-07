export type AbilityScore = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

export type SkillName =
  | "acrobatics"
  | "animalHandling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleightOfHand"
  | "stealth"
  | "survival";

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  weight?: number;
  description?: string;
};

export type Character = {
  id: string;
  userId: string;
  name: string;
  race: string;
  className: string;
  level: number;
  abilityScores: AbilityScore;
  maxHp: number;
  currentHp: number;
  armorClass: number;
  speed: number;
  alignment?: string;
  background?: string;
  proficiencyBonus: number;
  skills?: Partial<Record<SkillName, boolean>>;
  inventory?: InventoryItem[];
  spells?: string[];
  spellSlotsUsed?: number[];
  xp?: number;
  createdAt: string;
  updatedAt: string;
};

export type CharacterSummary = Pick<
  Character,
  "id" | "name" | "race" | "className" | "level" | "maxHp" | "currentHp"
> & { skills?: Partial<Record<SkillName, boolean>> };

export type CampaignPhase = "exploration" | "combat" | "rest" | "dialogue";

export type CombatantStatus = "active" | "downed" | "stable" | "dead";

export type Combatant = {
  id: string;
  name: string;
  characterId?: string;
  isPlayer: boolean;
  initiative: number;
  currentHp: number;
  maxHp: number;
  armorClass: number;
  cr?: number;
  status?: CombatantStatus;
  deathSaveSuccesses?: number;
  deathSaveFailures?: number;
};

export type CombatState = {
  active: boolean;
  combatants: Combatant[];
  turnIndex: number;
  round: number;
};

export type CampaignState = {
  phase: CampaignPhase;
  location: string;
  scene: string;
  worldProgress: string[];
  encounterId?: string;
  combat: CombatState;
  notes: string;
  updatedAt: string;
};

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  state: CampaignState;
};

export type CampaignMember = {
  campaignId: string;
  userId: string;
  characterId: string;
  characterName?: string;
  joinedAt: string;
};

export type ChatMessage = {
  id: string;
  campaignId: string;
  senderId?: string;
  senderName: string;
  role: "player" | "dm";
  content: string;
  createdAt: string;
};

export type GameEventType =
  | "campaign.created"
  | "character.joined"
  | "encounter.started"
  | "turn.advanced"
  | "action.resolved"
  | "combat.ended"
  | "state.updated"
  | "chat.message";

export type ServerStreamEvent = {
  type: "connected" | GameEventType;
  campaignId: string;
  payload?: unknown;
};

export type GameEvent = {
  id: string;
  campaignId: string;
  type: GameEventType;
  payload: unknown;
  createdAt: string;
};

export type AvailableAction = {
  key: string;
  label: string;
  description: string;
  category: "action" | "bonus" | "reaction" | "movement" | "free";
  legal: boolean;
  reason?: string;
};

export type DmSuggestion = {
  turnOf?: { characterId: string; name: string } | null;
  phase: CampaignPhase;
  availableActions: AvailableAction[];
  hint?: string;
};

export const CHARACTER_MAX_LEVEL = 20;
export const ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export type SkillInfo = {
  key: SkillName;
  label: string;
  ability: keyof AbilityScore;
};

export const SKILLS: SkillInfo[] = [
  { key: "acrobatics", label: "Acrobatics", ability: "dexterity" },
  { key: "animalHandling", label: "Animal Handling", ability: "wisdom" },
  { key: "arcana", label: "Arcana", ability: "intelligence" },
  { key: "athletics", label: "Athletics", ability: "strength" },
  { key: "deception", label: "Deception", ability: "charisma" },
  { key: "history", label: "History", ability: "intelligence" },
  { key: "insight", label: "Insight", ability: "wisdom" },
  { key: "intimidation", label: "Intimidation", ability: "charisma" },
  { key: "investigation", label: "Investigation", ability: "intelligence" },
  { key: "medicine", label: "Medicine", ability: "wisdom" },
  { key: "nature", label: "Nature", ability: "intelligence" },
  { key: "perception", label: "Perception", ability: "wisdom" },
  { key: "performance", label: "Performance", ability: "charisma" },
  { key: "persuasion", label: "Persuasion", ability: "charisma" },
  { key: "religion", label: "Religion", ability: "intelligence" },
  { key: "sleightOfHand", label: "Sleight of Hand", ability: "dexterity" },
  { key: "stealth", label: "Stealth", ability: "dexterity" },
  { key: "survival", label: "Survival", ability: "wisdom" },
];

export const CLASS_STARTING_SKILL_COUNT: Record<string, number> = {
  Barbarian: 2,
  Bard: 3,
  Cleric: 2,
  Druid: 2,
  Fighter: 2,
  Monk: 2,
  Paladin: 2,
  Ranger: 3,
  Rogue: 4,
  Sorcerer: 2,
  Warlock: 2,
  Wizard: 2,
};

export function startingSkillCount(className: string): number {
  return CLASS_STARTING_SKILL_COUNT[className] ?? 2;
}

export const CLASS_SAVING_THROWS: Record<string, (keyof AbilityScore)[]> = {
  Barbarian: ["strength", "constitution"],
  Bard: ["dexterity", "charisma"],
  Cleric: ["wisdom", "charisma"],
  Druid: ["intelligence", "wisdom"],
  Fighter: ["strength", "constitution"],
  Monk: ["strength", "dexterity"],
  Paladin: ["wisdom", "charisma"],
  Ranger: ["strength", "dexterity"],
  Rogue: ["dexterity", "intelligence"],
  Sorcerer: ["constitution", "charisma"],
  Warlock: ["wisdom", "charisma"],
  Wizard: ["intelligence", "wisdom"],
};

export function savingThrowProficiencies(className: string): (keyof AbilityScore)[] {
  return CLASS_SAVING_THROWS[className] ?? [];
}

export const CLASS_SPELLCASTING_ABILITY: Record<string, keyof AbilityScore> = {
  Bard: "charisma",
  Cleric: "wisdom",
  Druid: "wisdom",
  Paladin: "charisma",
  Ranger: "wisdom",
  Sorcerer: "charisma",
  Warlock: "charisma",
  Wizard: "intelligence",
};

export function spellcastingAbility(className: string): keyof AbilityScore | undefined {
  return CLASS_SPELLCASTING_ABILITY[className];
}

export type SheetSavingThrow = {
  ability: keyof AbilityScore;
  proficient: boolean;
  mod: number;
};

export type SheetSkill = {
  key: SkillName;
  label: string;
  ability: keyof AbilityScore;
  proficient: boolean;
  mod: number;
};

export type SheetAttack = {
  name: string;
  hitBonus: number;
  damageNotation: string;
  damageBonus: number;
  ability: keyof AbilityScore;
};

export type SheetSpellcasting = {
  ability: keyof AbilityScore;
  saveDc: number;
  attackBonus: number;
};

export type CharacterSheet = {
  character: Character;
  abilityModifiers: Record<keyof AbilityScore, number>;
  savingThrows: SheetSavingThrow[];
  skills: SheetSkill[];
  attacks: SheetAttack[];
  spellcasting: SheetSpellcasting | null;
  spellSlots: { level: number; used: number; max: number }[];
};
