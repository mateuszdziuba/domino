import type { Combatant } from "@domino/shared";

export type ConditionDef = {
  key: string;
  label: string;
  description: string;
  canAct: boolean;
};

export const GUIDING_BOLT_MARKER = "guiding_bolt";
export const SAPPED_MARKER = "sapped";
// Mastery markers encode the wielder (attacker) combatant id: "vexed:<id>".
export const VEXED_MARKER_PREFIX = "vexed:";
// "slowed:<wielderId>" — the Slow mastery lasts until the start of the
// wielder's next turn, so the marker carries the wielder's id.
export const SLOWED_MARKER_PREFIX = "slowed:";

export function vexedMarker(wielderId: string): string {
  return `${VEXED_MARKER_PREFIX}${wielderId}`;
}

export function slowedMarker(wielderId: string): string {
  return `${SLOWED_MARKER_PREFIX}${wielderId}`;
}

export const CONDITIONS: ConditionDef[] = [
  {
    key: "blinded",
    label: "Ślepota",
    description:
      "Twórca nie widzi: ataki wykonuje z utrudnieniem, a ataki przeciwko niemu mają przewagę.",
    canAct: true,
  },
  {
    key: "frightened",
    label: "Przerażony",
    description:
      "Twórca ma utrudnienie do ataków, gdy widzi źródło strachu, i nie może się do niego zbliżyć.",
    canAct: true,
  },
  {
    key: "poisoned",
    label: "Zatruty",
    description: "Twórca ma utrudnienie do ataków i testów zdolności.",
    canAct: true,
  },
  {
    key: "prone",
    label: "Powalony",
    description:
      "Twórca ma utrudnienie do ataków dystansowych, a ataki w zwarciu przeciwko niemu mają przewagę.",
    canAct: true,
  },
  {
    key: "restrained",
    label: "Skrępowany",
    description:
      "Szybkość twórcy wynosi 0; jego ataki mają utrudnienie, a ataki przeciwko niemu przewagę.",
    canAct: true,
  },
  {
    key: "paralyzed",
    label: "Sparaliżowany",
    description:
      "Twórca jest obezwładniony; ataki przeciwko niemu mają przewagę, a trafienie w zwarciu jest krytykiem.",
    canAct: false,
  },
  {
    key: "petrified",
    label: "Skamieniały",
    description:
      "Twórca jest obezwładniony i nie może się poruszać; ataki przeciwko niemu mają przewagę.",
    canAct: false,
  },
  {
    key: "stunned",
    label: "Ogłuszony",
    description: "Twórca jest obezwładniony i nie może się poruszać ani mówić.",
    canAct: false,
  },
  {
    key: "unconscious",
    label: "Nieprzytomny",
    description:
      "Twórca jest obezwładniony; ataki przeciwko niemu mają przewagę, a trafienie w zwarciu jest krytykiem.",
    canAct: false,
  },
  {
    key: "incapacitated",
    label: "Obezwładniony",
    description: "Twórca nie może wykonywać akcji, akcji dodatkowych ani reakcji.",
    canAct: false,
  },
  // Spell effect modeled as a condition (Banishment).
  {
    key: "banished",
    label: "Wygnańczony",
    description:
      "Istota została wygnana z aktualnej płaszczyzny (Banishment) — nie może działać, ataki przeciw niej nie mają przewagi.",
    canAct: false,
  },
];

export function isConditionKey(key: string): boolean {
  return CONDITIONS.some((c) => c.key === key);
}

export function canAct(combatant: {
  status?: string;
  conditions?: string[];
  exhaustionLevel?: number;
}): boolean {
  if ((combatant.exhaustionLevel ?? 0) >= 6) return false;
  if (combatant.status && combatant.status !== "active") return false;
  const conditions = combatant.conditions ?? [];
  return !conditions.some((key) => {
    const def = CONDITIONS.find((c) => c.key === key);
    return def ? !def.canAct : false;
  });
}

export function attackRollAdvantages(
  attacker: Combatant,
  target: Combatant,
): { advantage: boolean; disadvantage: boolean } {
  const attackerConditions = new Set(attacker.conditions ?? []);
  const targetConditions = new Set(target.conditions ?? []);
  const disadvantage =
    (attacker.exhaustionLevel ?? 0) >= 3 ||
    attackerConditions.has("blinded") ||
    attackerConditions.has("frightened") ||
    attackerConditions.has("poisoned") ||
    attackerConditions.has("prone") ||
    attackerConditions.has("restrained") ||
    attackerConditions.has(SAPPED_MARKER);
  // Vex: advantage only for the weapon's wielder (the marker carries the
  // wielder's combatant id).
  const vexedByAttacker = [...targetConditions].some(
    (c) =>
      c.startsWith(VEXED_MARKER_PREFIX) &&
      c.slice(VEXED_MARKER_PREFIX.length) === attacker.id,
  );
  const advantage =
    targetConditions.has("blinded") ||
    targetConditions.has("prone") ||
    targetConditions.has("restrained") ||
    targetConditions.has("paralyzed") ||
    targetConditions.has("petrified") ||
    targetConditions.has("stunned") ||
    targetConditions.has("unconscious") ||
    targetConditions.has(GUIDING_BOLT_MARKER) ||
    vexedByAttacker;
  if (advantage && disadvantage) return { advantage: false, disadvantage: false };
  return { advantage, disadvantage };
}
