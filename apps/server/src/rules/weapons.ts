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
  // SRD near/far range in feet for ranged weapons (ammunition and thrown).
  weaponRange?: [number, number];
  // Weapon Mastery (SRD 5.2.1 weapon table): every weapon carries exactly one
  // mastery. Masteries: cleave, graze, nick, push, sap, slow, topple, vex.
  mastery?: string;
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
    mastery: "slow",
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
    mastery: "nick",
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
    mastery: "push",
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
    mastery: "vex",
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
    mastery: "slow",
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
    mastery: "nick",
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
    mastery: "sap",
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
    mastery: "topple",
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
    mastery: "nick",
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
    mastery: "sap",
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
    mastery: "slow",
    weaponRange: [80, 320],
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
    mastery: "vex",
    weaponRange: [20, 60],
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
    mastery: "vex",
    weaponRange: [80, 320],
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
    mastery: "slow",
    weaponRange: [30, 120],
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
    mastery: "topple",
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
    mastery: "sap",
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
    mastery: "graze",
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
    mastery: "cleave",
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
    mastery: "graze",
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
    mastery: "cleave",
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
    mastery: "topple",
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
    mastery: "sap",
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
    mastery: "topple",
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
    mastery: "sap",
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
    mastery: "push",
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
    mastery: "vex",
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
    mastery: "nick",
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
    mastery: "vex",
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
    mastery: "topple",
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
    mastery: "sap",
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
    mastery: "push",
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
    mastery: "slow",
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
    mastery: "vex",
    weaponRange: [30, 120],
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
    mastery: "vex",
    weaponRange: [30, 120],
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
    mastery: "push",
    weaponRange: [100, 400],
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
    mastery: "slow",
    weaponRange: [150, 600],
  },
];

export function findWeapon(name: string): WeaponDef | undefined {
  const lookup = name.trim().toLowerCase();
  return WEAPONS.find(
    (w) => w.name.toLowerCase() === lookup || w.label.toLowerCase() === lookup,
  );
}

export function weaponReach(weapon: WeaponDef): number {
  if (
    weapon.range === "ranged" ||
    weapon.properties.includes("ammunition") ||
    weapon.properties.includes("thrown")
  ) {
    return 999;
  }
  return weapon.properties.includes("reach") ? 10 : 5;
}

/**
 * Effective attack range in feet (SRD 5.2.1): ammunition weapons use their
 * near range, thrown weapons the 60-ft far range, melee weapons null (melee
 * attacks are governed by reach instead).
 */
export function weaponRangeInFeet(weapon?: WeaponDef): number | null {
  if (!weapon) return null;
  if (weapon.properties.includes("ammunition")) {
    return weapon.weaponRange?.[0] ?? null;
  }
  if (weapon.properties.includes("thrown")) {
    return 60;
  }
  return null;
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

export function findOffhandWeapon(character: Character): WeaponDef | undefined {
  const item = character.inventory?.find((i) => i.slot === "offhand");
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
