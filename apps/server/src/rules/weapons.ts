import type { Character } from "@domino/shared";
import { abilityModifier } from "./abilities.js";
import type { AttackInput } from "./combat.js";

export type WeaponProperty =
  | "ammunition"
  | "finesse"
  | "heavy"
  | "light"
  | "loading"
  | "reach"
  | "special"
  | "thrown"
  | "two-handed"
  | "versatile"
  | "mastery";

export type WeaponDef = {
  name: string;
  category: "simple" | "martial";
  range: "melee" | "ranged";
  damageDice: string;
  damageType: string;
  properties: WeaponProperty[];
  weight?: number;
  price?: string;
  versatileDice?: string;
  label: string;
};

export const WEAPONS: WeaponDef[] = [
  {
    name: "Club",
    category: "simple",
    range: "melee",
    damageDice: "1d4",
    damageType: "bludgeoning",
    properties: ["light"],
    weight: 2,
    price: "1 sp",
    label: "Pałka",
  },
  {
    name: "Dagger",
    category: "simple",
    range: "melee",
    damageDice: "1d4",
    damageType: "piercing",
    properties: ["finesse", "light", "thrown"],
    weight: 1,
    price: "2 gp",
    label: "Sztylet",
  },
  {
    name: "Greatclub",
    category: "simple",
    range: "melee",
    damageDice: "1d8",
    damageType: "bludgeoning",
    properties: ["two-handed"],
    weight: 10,
    price: "2 sp",
    label: "Wielka pałka",
  },
  {
    name: "Handaxe",
    category: "simple",
    range: "melee",
    damageDice: "1d6",
    damageType: "slashing",
    properties: ["light", "thrown"],
    weight: 2,
    price: "5 gp",
    label: "Toporek",
  },
  {
    name: "Javelin",
    category: "simple",
    range: "melee",
    damageDice: "1d6",
    damageType: "piercing",
    properties: ["thrown"],
    weight: 2,
    price: "5 sp",
    label: "Oszczep",
  },
  {
    name: "Light Hammer",
    category: "simple",
    range: "melee",
    damageDice: "1d4",
    damageType: "bludgeoning",
    properties: ["light", "thrown"],
    weight: 2,
    price: "2 gp",
    label: "Lekki młot",
  },
  {
    name: "Mace",
    category: "simple",
    range: "melee",
    damageDice: "1d6",
    damageType: "bludgeoning",
    properties: [],
    weight: 4,
    price: "5 gp",
    label: "Bulawa",
  },
  {
    name: "Quarterstaff",
    category: "simple",
    range: "melee",
    damageDice: "1d6",
    damageType: "bludgeoning",
    properties: ["versatile"],
    weight: 4,
    price: "2 sp",
    versatileDice: "1d8",
    label: "Kij bojowy",
  },
  {
    name: "Sickle",
    category: "simple",
    range: "melee",
    damageDice: "1d4",
    damageType: "slashing",
    properties: ["light"],
    weight: 2,
    price: "1 gp",
    label: "Sierp",
  },
  {
    name: "Spear",
    category: "simple",
    range: "melee",
    damageDice: "1d6",
    damageType: "piercing",
    properties: ["thrown", "versatile"],
    weight: 3,
    price: "1 gp",
    versatileDice: "1d8",
    label: "Włócznia",
  },
  {
    name: "Light Crossbow",
    category: "simple",
    range: "ranged",
    damageDice: "1d8",
    damageType: "piercing",
    properties: ["ammunition", "loading", "two-handed"],
    weight: 5,
    price: "25 gp",
    label: "Lekka kusza",
  },
  {
    name: "Dart",
    category: "simple",
    range: "ranged",
    damageDice: "1d4",
    damageType: "piercing",
    properties: ["finesse", "thrown"],
    weight: 0.25,
    price: "5 cp",
    label: "Strzałka",
  },
  {
    name: "Shortbow",
    category: "simple",
    range: "ranged",
    damageDice: "1d6",
    damageType: "piercing",
    properties: ["ammunition", "two-handed"],
    weight: 2,
    price: "25 gp",
    label: "Krótki łuk",
  },
  {
    name: "Sling",
    category: "simple",
    range: "ranged",
    damageDice: "1d4",
    damageType: "bludgeoning",
    properties: ["ammunition"],
    price: "1 sp",
    label: "Proca",
  },
  {
    name: "Battleaxe",
    category: "martial",
    range: "melee",
    damageDice: "1d8",
    damageType: "slashing",
    properties: ["versatile"],
    weight: 4,
    price: "10 gp",
    versatileDice: "1d10",
    label: "Topór bojowy",
  },
  {
    name: "Flail",
    category: "martial",
    range: "melee",
    damageDice: "1d8",
    damageType: "bludgeoning",
    properties: [],
    weight: 2,
    price: "10 gp",
    label: "Cep bojowy",
  },
  {
    name: "Glaive",
    category: "martial",
    range: "melee",
    damageDice: "1d10",
    damageType: "slashing",
    properties: ["heavy", "reach", "two-handed"],
    weight: 6,
    price: "20 gp",
    label: "Glewia",
  },
  {
    name: "Greataxe",
    category: "martial",
    range: "melee",
    damageDice: "1d12",
    damageType: "slashing",
    properties: ["heavy", "two-handed"],
    weight: 7,
    price: "30 gp",
    label: "Wielki topór",
  },
  {
    name: "Greatsword",
    category: "martial",
    range: "melee",
    damageDice: "2d6",
    damageType: "slashing",
    properties: ["heavy", "two-handed"],
    weight: 6,
    price: "50 gp",
    label: "Wielki miecz",
  },
  {
    name: "Halberd",
    category: "martial",
    range: "melee",
    damageDice: "1d10",
    damageType: "slashing",
    properties: ["heavy", "reach", "two-handed"],
    weight: 6,
    price: "20 gp",
    label: "Halabarda",
  },
  {
    name: "Lance",
    category: "martial",
    range: "melee",
    damageDice: "1d10",
    damageType: "piercing",
    properties: ["reach", "special"],
    weight: 6,
    price: "10 gp",
    label: "Lanca",
  },
  {
    name: "Longsword",
    category: "martial",
    range: "melee",
    damageDice: "1d8",
    damageType: "slashing",
    properties: ["versatile"],
    weight: 3,
    price: "15 gp",
    versatileDice: "1d10",
    label: "Miecz długi",
  },
  {
    name: "Maul",
    category: "martial",
    range: "melee",
    damageDice: "2d6",
    damageType: "bludgeoning",
    properties: ["heavy", "two-handed"],
    weight: 10,
    price: "10 gp",
    label: "Obuch",
  },
  {
    name: "Morningstar",
    category: "martial",
    range: "melee",
    damageDice: "1d8",
    damageType: "piercing",
    properties: [],
    weight: 4,
    price: "15 gp",
    label: "Gwiazda poranna",
  },
  {
    name: "Pike",
    category: "martial",
    range: "melee",
    damageDice: "1d10",
    damageType: "piercing",
    properties: ["heavy", "reach", "two-handed"],
    weight: 18,
    price: "5 gp",
    label: "Pika",
  },
  {
    name: "Rapier",
    category: "martial",
    range: "melee",
    damageDice: "1d8",
    damageType: "piercing",
    properties: ["finesse"],
    weight: 2,
    price: "25 gp",
    label: "Rapier",
  },
  {
    name: "Scimitar",
    category: "martial",
    range: "melee",
    damageDice: "1d6",
    damageType: "slashing",
    properties: ["finesse", "light"],
    weight: 3,
    price: "25 gp",
    label: "Szabla",
  },
  {
    name: "Shortsword",
    category: "martial",
    range: "melee",
    damageDice: "1d6",
    damageType: "piercing",
    properties: ["finesse", "light"],
    weight: 2,
    price: "10 gp",
    label: "Krótki miecz",
  },
  {
    name: "Trident",
    category: "martial",
    range: "melee",
    damageDice: "1d6",
    damageType: "piercing",
    properties: ["thrown", "versatile"],
    weight: 4,
    price: "5 gp",
    versatileDice: "1d8",
    label: "Trójząb",
  },
  {
    name: "War Pick",
    category: "martial",
    range: "melee",
    damageDice: "1d8",
    damageType: "piercing",
    properties: [],
    weight: 2,
    price: "5 gp",
    label: "Kilof bojowy",
  },
  {
    name: "Warhammer",
    category: "martial",
    range: "melee",
    damageDice: "1d8",
    damageType: "bludgeoning",
    properties: ["versatile"],
    weight: 5,
    price: "15 gp",
    versatileDice: "1d10",
    label: "Młot wojenny",
  },
  {
    name: "Whip",
    category: "martial",
    range: "melee",
    damageDice: "1d4",
    damageType: "slashing",
    properties: ["finesse", "reach"],
    weight: 3,
    price: "2 gp",
    label: "Bicz",
  },
  {
    name: "Blowgun",
    category: "martial",
    range: "ranged",
    damageDice: "1",
    damageType: "piercing",
    properties: ["ammunition", "loading"],
    weight: 1,
    price: "10 gp",
    label: "Dmuchawka",
  },
  {
    name: "Hand Crossbow",
    category: "martial",
    range: "ranged",
    damageDice: "1d6",
    damageType: "piercing",
    properties: ["ammunition", "light", "loading"],
    weight: 3,
    price: "75 gp",
    label: "Kusza ręczna",
  },
  {
    name: "Heavy Crossbow",
    category: "martial",
    range: "ranged",
    damageDice: "1d10",
    damageType: "piercing",
    properties: ["ammunition", "heavy", "loading", "two-handed"],
    weight: 18,
    price: "50 gp",
    label: "Ciężka kusza",
  },
  {
    name: "Longbow",
    category: "martial",
    range: "ranged",
    damageDice: "1d8",
    damageType: "piercing",
    properties: ["ammunition", "heavy", "two-handed"],
    weight: 2,
    price: "50 gp",
    label: "Długi łuk",
  },
];

export function findWeapon(name: string): WeaponDef | undefined {
  const lookup = name.trim().toLowerCase();
  return WEAPONS.find(
    (w) => w.name.toLowerCase() === lookup || w.label.toLowerCase() === lookup,
  );
}

export type WeaponAttackStats = {
  hitBonus: number;
  damageNotation: string;
  damageBonus: number;
  ability: "strength" | "dexterity";
};

export function weaponAttackStats(
  weapon: WeaponDef,
  character: {
    abilityScores: { strength: number; dexterity: number };
    proficiencyBonus: number;
  },
): WeaponAttackStats {
  const strengthMod = abilityModifier(character.abilityScores.strength);
  const dexterityMod = abilityModifier(character.abilityScores.dexterity);
  // SRD: finesse uses the higher of STR/DEX; other ranged attacks use DEX;
  // other melee attacks (including non-finesse thrown weapons) use STR.
  const useDexterity = weapon.properties.includes("finesse")
    ? dexterityMod > strengthMod
    : weapon.range === "ranged";
  const mod = useDexterity ? dexterityMod : strengthMod;
  // Versatile weapons default to two-handed grip: the larger die.
  const damageNotation = weapon.versatileDice ?? weapon.damageDice;
  return {
    hitBonus: character.proficiencyBonus + mod,
    damageNotation,
    damageBonus: mod,
    ability: useDexterity ? "dexterity" : "strength",
  };
}

export function findEquippedWeapon(character: Character): WeaponDef | undefined {
  const item = character.inventory?.find((i) => i.slot === "weapon");
  return item ? findWeapon(item.name) : undefined;
}

export function equippedWeaponAttackStats(
  character: Character,
): WeaponAttackStats | undefined {
  const weapon = findEquippedWeapon(character);
  return weapon ? weaponAttackStats(weapon, character) : undefined;
}

export function equippedWeaponAttackInput(
  character: Character,
): AttackInput | undefined {
  const stats = equippedWeaponAttackStats(character);
  return stats
    ? {
        attackBonus: stats.hitBonus,
        damageNotation: stats.damageNotation,
        damageBonus: stats.damageBonus,
      }
    : undefined;
}
