import type { SkillName } from "@domino/shared";

type AbilityScore = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

export type BackgroundDef = {
  name: string;
  label: string;
  description: string;
  feat: string;
  featSpellList?: string;
  abilityOptions: AbilityScore[];
  skills: SkillName[];
  tool: string;
  equipment: { name: string; quantity: number }[];
  gold: number;
};

export const BACKGROUNDS: BackgroundDef[] = [
  {
    name: "Acolyte",
    label: "Akolita",
    description:
      "Poświęciłeś życie służbie w świątyni. Jako swoją ścieżkę otrzymujesz inwokację magiczną z listy kapłana.",
    feat: "Magic Initiate",
    featSpellList: "Cleric",
    abilityOptions: ["intelligence", "wisdom", "charisma"],
    skills: ["insight", "religion"],
    tool: "Przybory kaligrafa",
    equipment: [
      { name: "Calligrapher's Supplies", quantity: 1 },
      { name: "Book", quantity: 1 },
      { name: "Holy Symbol", quantity: 1 },
      { name: "Parchment", quantity: 10 },
      { name: "Robe", quantity: 1 },
    ],
    gold: 8,
  },
  {
    name: "Criminal",
    label: "Przestępca",
    description:
      "Masz za sobą karierę w półświatku — kradzieże, szantaże i cienie zaułków. Czujność to twoja przewaga.",
    feat: "Alert",
    abilityOptions: ["dexterity", "constitution", "intelligence"],
    skills: ["sleightOfHand", "stealth"],
    tool: "Wytrychy złodziejskie",
    equipment: [
      { name: "Dagger", quantity: 2 },
      { name: "Thieves' Tools", quantity: 1 },
      { name: "Crowbar", quantity: 1 },
      { name: "Pouch", quantity: 2 },
      { name: "Traveler's Clothes", quantity: 1 },
    ],
    gold: 16,
  },
  {
    name: "Sage",
    label: "Uczony",
    description:
      "Lata spędzone w bibliotekach i archiwach. Otrzymujesz inwokację magiczną z listy czarodzieja.",
    feat: "Magic Initiate",
    featSpellList: "Wizard",
    abilityOptions: ["constitution", "intelligence", "wisdom"],
    skills: ["arcana", "history"],
    tool: "Przybory kaligrafa",
    equipment: [
      { name: "Quarterstaff", quantity: 1 },
      { name: "Calligrapher's Supplies", quantity: 1 },
      { name: "Book", quantity: 1 },
      { name: "Parchment", quantity: 8 },
      { name: "Robe", quantity: 1 },
    ],
    gold: 8,
  },
  {
    name: "Soldier",
    label: "Żołnierz",
    description:
      "Wyszkolony w wojsku, przywykły do dyscypliny i bitewnego zgiełku. Twoje ciosy są szczególnie miażdżące.",
    feat: "Savage Attacker",
    abilityOptions: ["strength", "dexterity", "constitution"],
    skills: ["athletics", "intimidation"],
    tool: "Zestaw do gry",
    equipment: [
      { name: "Spear", quantity: 1 },
      { name: "Shortbow", quantity: 1 },
      { name: "Arrow", quantity: 20 },
      { name: "Gaming Set", quantity: 1 },
      { name: "Healer's Kit", quantity: 1 },
      { name: "Quiver", quantity: 1 },
      { name: "Traveler's Clothes", quantity: 1 },
    ],
    gold: 14,
  },
];

export function findBackground(name: string): BackgroundDef | undefined {
  const query = name.trim().toLowerCase();
  return BACKGROUNDS.find(
    (b) => b.name.toLowerCase() === query || b.label.toLowerCase() === query,
  );
}
