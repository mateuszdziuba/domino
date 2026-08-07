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
    label: "Atak",
    description: "Wykonaj atak bronią lub gołą pięścią.",
    category: "action",
  },
  {
    key: "dodge",
    label: "Unik",
    description: "Do początku twojej następnej tury rzuty ataku przeciwko tobie mają utrudnienie.",
    category: "action",
  },
  {
    key: "dash",
    label: "Sprint",
    description: "Zyskaj dodatkowy ruch równy twojej szybkości.",
    category: "action",
  },
  {
    key: "disengage",
    label: "Wycofanie",
    description: "Twój ruch nie prowokuje ataków okazyjnych.",
    category: "action",
  },
  {
    key: "hide",
    label: "Ukrycie",
    description: "Wykonaj test Zręczności (Skradanie się), aby się ukryć.",
    category: "action",
  },
  {
    key: "ready",
    label: "Przygotowanie akcji",
    description: "Przygotuj akcję do wykonania później po spełnieniu wyzwalacza.",
    category: "action",
  },
  {
    key: "help",
    label: "Pomoc",
    description: "Daj sojusznikowi przewagę przy jego następnym teście cechy lub ataku.",
    category: "action",
  },
  {
    key: "use-item",
    label: "Użycie przedmiotu",
    description: "Użyj przedmiotu lub oddziałuj na otoczenie.",
    category: "action",
  },
  {
    key: "cast-spell",
    label: "Rzucenie zaklęcia",
    description: "Rzuć zaklęcie, które masz przygotowane lub znasz.",
    category: "action",
    // Only legal when the character has spells and a spell slot available.
  } as AvailableAction,
  {
    key: "dodge-bonus",
    label: "Akcja dodatkowa",
    description: "Użyj akcji dodatkowej uzyskanej dzięki cechom, zaklęciu lub przedmiotowi.",
    category: "bonus",
  },
  {
    key: "opportunity-attack",
    label: "Atak okazyjny",
    description: "Wykonaj atak okazyjny, gdy wróg opuści twój zasięg.",
    category: "reaction",
  },
];

const EXPLORATION_ACTIONS: Omit<AvailableAction, "legal" | "reason">[] = [
  {
    key: "investigate",
    label: "Badanie terenu",
    description: "Przeszukaj okolicę w poszukiwaniu tropów i ukrytych szczegółów (Inteligencja).",
    category: "action",
  },
  {
    key: "perception",
    label: "Obserwacja",
    description: "Patrz i nasłuchuj zagrożeń lub ruchu (Mądrość).",
    category: "action",
  },
  {
    key: "negotiate",
    label: "Negocjacje",
    description: "Rozmawiaj, przekonuj, zwódź lub zastraszaj bohatera niezależnego (Charyzma).",
    category: "action",
  },
  {
    key: "interact",
    label: "Interakcja ze światem",
    description: "Otwórz, pchnij, podnieś, przeczytaj lub w inny sposób oddziałaj na coś.",
    category: "action",
  },
  {
    key: "rest",
    label: "Odpoczynek",
    description: "Rozpocznij krótki lub długi odpoczynek.",
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
        : `${character.className} nie ma przygotowanych zaklęć.`;
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
          ? "Martwy — żadne akcje nie są możliwe."
          : "Nieprzytomny (0 HP) — żadne akcje nie są możliwe.";
    }
  } else if (character.currentHp === 0) {
    incapacitatedReason = "Nieprzytomny (0 HP) — żadne akcje nie są możliwe.";
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
