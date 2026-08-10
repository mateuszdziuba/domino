import { abilityModifier } from "./abilities.js";

export const RACE_SPEED: Record<string, number> = {
  Human: 30,
  Elf: 30,
  Dwarf: 30,
  Halfling: 30,
  Gnome: 30,
  Dragonborn: 30,
  Orc: 30,
  Tiefling: 30,
};

export const ARMOR_AC: Record<string, { base: number; dexCap: number | null }> = {
  Leather: { base: 11, dexCap: null },
  "Studded Leather": { base: 12, dexCap: null },
  "Chain Shirt": { base: 13, dexCap: 2 },
  "Scale Mail": { base: 14, dexCap: 2 },
  Breastplate: { base: 14, dexCap: 2 },
  "Half Plate": { base: 15, dexCap: 2 },
  "Ring Mail": { base: 14, dexCap: 0 },
  "Chain Mail": { base: 16, dexCap: 0 },
  Splint: { base: 17, dexCap: 0 },
  Plate: { base: 18, dexCap: 0 },
};

export function computeArmorClass(input: {
  dexterityMod: number;
  equippedArmor?: string;
  shield: boolean;
  className: string;
  abilityScores: { constitution: number; wisdom: number };
}): number {
  const { dexterityMod, equippedArmor, shield, className, abilityScores } = input;
  let ac: number;
  if (!equippedArmor) {
    if (className === "Barbarian") {
      ac = 10 + dexterityMod + abilityModifier(abilityScores.constitution);
    } else if (className === "Monk") {
      ac = 10 + dexterityMod + abilityModifier(abilityScores.wisdom);
    } else {
      ac = 10 + dexterityMod;
    }
  } else {
    const armor = ARMOR_AC[equippedArmor];
    ac = armor ? armor.base + Math.min(dexterityMod, armor.dexCap ?? 99) : 10 + dexterityMod;
  }
  return ac + (shield ? 2 : 0);
}

export type StartingItem = {
  name: string;
  quantity?: number;
  slot?: string;
};

export type StartingEquipment = {
  gold: number;
  items: StartingItem[];
};

export const STARTING_EQUIPMENT: Record<string, StartingEquipment> = {
  Barbarian: {
    gold: 15,
    items: [
      { name: "Greataxe", slot: "weapon" },
      { name: "Handaxe", quantity: 2, slot: "offhand" },
      { name: "Leather", slot: "armor" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 5 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 3 },
    ],
  },
  Bard: {
    gold: 25,
    items: [
      { name: "Rapier", slot: "weapon" },
      { name: "Dagger", slot: "offhand" },
      { name: "Leather", slot: "armor" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 4 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 2 },
    ],
  },
  Cleric: {
    gold: 15,
    items: [
      { name: "Mace", slot: "weapon" },
      { name: "Scale Mail", slot: "armor" },
      { name: "Shield", slot: "shield" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 3 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 2 },
    ],
  },
  Druid: {
    gold: 15,
    items: [
      { name: "Quarterstaff", slot: "weapon" },
      { name: "Leather", slot: "armor" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 3 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 2 },
    ],
  },
  Fighter: {
    gold: 15,
    items: [
      { name: "Longsword", slot: "weapon" },
      { name: "Shield", slot: "shield" },
      { name: "Chain Mail", slot: "armor" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 4 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 3 },
    ],
  },
  Monk: {
    gold: 5,
    items: [
      { name: "Shortsword", slot: "weapon" },
      { name: "Dagger", slot: "offhand" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 3 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 2 },
    ],
  },
  Paladin: {
    gold: 15,
    items: [
      { name: "Longsword", slot: "weapon" },
      { name: "Shield", slot: "shield" },
      { name: "Chain Mail", slot: "armor" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 3 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 2 },
    ],
  },
  Ranger: {
    gold: 15,
    items: [
      { name: "Longbow", slot: "weapon" },
      { name: "Shortsword", slot: "offhand" },
      { name: "Leather", slot: "armor" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 4 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 2 },
    ],
  },
  Rogue: {
    gold: 25,
    items: [
      { name: "Shortsword", slot: "weapon" },
      { name: "Dagger", slot: "offhand" },
      { name: "Leather", slot: "armor" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 3 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 2 },
    ],
  },
  Sorcerer: {
    gold: 25,
    items: [
      { name: "Dagger", slot: "weapon" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 3 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 2 },
    ],
  },
  Warlock: {
    gold: 25,
    items: [
      { name: "Spear", slot: "weapon" },
      { name: "Leather", slot: "armor" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 3 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 2 },
    ],
  },
  Wizard: {
    gold: 25,
    items: [
      { name: "Quarterstaff", slot: "weapon" },
      { name: "Dagger", slot: "offhand" },
      { name: "Backpack" },
      { name: "Bedroll" },
      { name: "Rations", quantity: 3 },
      { name: "Waterskin" },
      { name: "Torch", quantity: 2 },
      { name: "Component Pouch" },
      { name: "Spellbook" },
    ],
  },
};

export const POINT_BUY_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export const POINT_BUY_TOTAL = 27;

export function pointBuyCost(scores: Record<string, number>): number {
  return Object.values(scores).reduce((sum, score) => sum + (POINT_BUY_COST[score] ?? 0), 0);
}
