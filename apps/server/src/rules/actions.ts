import type {
  AvailableAction,
  CampaignState,
  Character,
  DmSuggestion,
} from "@domino/shared";
import { currentTurnCombatant } from "./combat.js";

const COMBAT_ACTIONS: Omit<AvailableAction, "legal" | "reason">[] = [
  {
    key: "attack",
    label: "Attack",
    description: "Make an attack with a weapon or an unarmed strike.",
    category: "action",
  },
  {
    key: "dodge",
    label: "Dodge",
    description: "Until the start of your next turn, attack rolls against you have disadvantage.",
    category: "action",
  },
  {
    key: "dash",
    label: "Dash",
    description: "Gain extra movement equal to your speed.",
    category: "action",
  },
  {
    key: "disengage",
    label: "Disengage",
    description: "Your movement doesn't provoke opportunity attacks.",
    category: "action",
  },
  {
    key: "hide",
    label: "Hide",
    description: "Make a Dexterity (Stealth) check to hide.",
    category: "action",
  },
  {
    key: "ready",
    label: "Ready",
    description: "Prepare an action to take later with a trigger.",
    category: "action",
  },
  {
    key: "help",
    label: "Help",
    description: "Give an ally advantage on their next ability check or attack.",
    category: "action",
  },
  {
    key: "use-item",
    label: "Use an item",
    description: "Use an object or interact with the environment.",
    category: "action",
  },
  {
    key: "cast-spell",
    label: "Cast a spell",
    description: "Cast a spell you have prepared or known.",
    category: "action",
    // Only legal when the character has spells and a spell slot available.
  } as AvailableAction,
  {
    key: "dodge-bonus",
    label: "Take a bonus action",
    description: "Use a bonus action granted by a feature, spell, or item.",
    category: "bonus",
  },
  {
    key: "opportunity-attack",
    label: "Opportunity attack",
    description: "Make an opportunity attack when a foe leaves your reach.",
    category: "reaction",
  },
];

const EXPLORATION_ACTIONS: Omit<AvailableAction, "legal" | "reason">[] = [
  {
    key: "investigate",
    label: "Investigate",
    description: "Search the area for clues and hidden details (Intelligence).",
    category: "action",
  },
  {
    key: "perception",
    label: "Perceive",
    description: "Watch and listen for threats or movement (Wisdom).",
    category: "action",
  },
  {
    key: "negotiate",
    label: "Negotiate",
    description: "Talk, persuade, deceive, or intimidate an NPC (Charisma).",
    category: "action",
  },
  {
    key: "interact",
    label: "Interact with the world",
    description: "Open, push, pick up, read, or otherwise manipulate something.",
    category: "action",
  },
  {
    key: "rest",
    label: "Take a rest",
    description: "Begin a short or long rest.",
    category: "action",
  },
];

export function getAvailableActions(
  character: Character,
  state: CampaignState,
): AvailableAction[] {
  const legal = (action: Omit<AvailableAction, "legal" | "reason">): AvailableAction => {
    let reason: string | undefined;
    if (action.key === "cast-spell") {
      const hasSpells = (character.spells?.length ?? 0) > 0;
      reason = hasSpells
        ? undefined
        : `${character.className} has no spells prepared.`;
      return { ...action, legal: hasSpells, reason };
    }
    return { ...action, legal: true };
  };

  let incapacitatedReason: string | undefined;
  if (state.phase === "combat") {
    const combatant = state.combat.combatants.find(
      (c) => c.characterId === character.id,
    );
    if (combatant && combatant.currentHp === 0) {
      incapacitatedReason =
        combatant.status === "dead"
          ? "Dead — no actions possible."
          : "Unconscious at 0 HP — no actions possible.";
    }
  } else if (character.currentHp === 0) {
    incapacitatedReason = "Unconscious at 0 HP — no actions possible.";
  }

  if (incapacitatedReason) {
    const actions =
      state.phase === "combat" ? COMBAT_ACTIONS : EXPLORATION_ACTIONS;
    return actions.map((action) => ({
      ...action,
      legal: false,
      reason: incapacitatedReason,
    }));
  }

  if (state.phase === "combat") {
    return COMBAT_ACTIONS.map(legal);
  }
  return EXPLORATION_ACTIONS.map(legal);
}

export function buildDmSuggestion(
  character: Character,
  state: CampaignState,
): DmSuggestion {
  const combatant = currentTurnCombatant(state);
  const isCombatantTurn =
    combatant?.isPlayer === true && combatant.characterId === character.id;

  const turnOf =
    state.phase === "combat" && combatant
      ? { characterId: combatant.characterId ?? combatant.id, name: combatant.name }
      : null;

  let availableActions: AvailableAction[];
  if (state.phase === "combat") {
    availableActions = isCombatantTurn
      ? getAvailableActions(character, state)
      : [];
  } else {
    availableActions = getAvailableActions(character, state);
  }

  return { turnOf, phase: state.phase, availableActions };
}
