// SRD 5.2.1 monster catalog. Stat blocks follow the System Reference Document
// 5.2.1 (https://www.dndbeyond.com/srd). If a monster's stats are ever in
// doubt, the PDF `SRD_CC_v5.2.1.pdf` at the repo root is the source of truth.
import type { NewCombatant } from "./combat.js";

export type Monster = {
  key: string;
  name: string;
  maxHp: number;
  armorClass: number;
  attackBonus: number;
  damageNotation: string;
  damageBonus: number;
  cr: number;
  tags: string[];
};

export const MONSTERS: Monster[] = [
  { key: "giant-rat", name: "Giant Rat", maxHp: 7, armorClass: 12, attackBonus: 4, damageNotation: "1d4", damageBonus: 2, cr: 0.125, tags: ["rat", "vermin", "sewer", "swarm"] },
  { key: "goblin", name: "Goblin", maxHp: 7, armorClass: 15, attackBonus: 4, damageNotation: "1d6", damageBonus: 2, cr: 0.25, tags: ["goblin", "cave", "raider", "ambush", "tribe"] },
  { key: "wolf", name: "Wolf", maxHp: 11, armorClass: 13, attackBonus: 4, damageNotation: "2d4", damageBonus: 2, cr: 0.25, tags: ["wolf", "pack", "forest", "wild", "woods"] },
  { key: "skeleton", name: "Skeleton", maxHp: 13, armorClass: 13, attackBonus: 4, damageNotation: "1d6", damageBonus: 2, cr: 0.25, tags: ["skeleton", "undead", "tomb", "crypt", "graveyard", "bones"] },
  { key: "zombie", name: "Zombie", maxHp: 22, armorClass: 8, attackBonus: 3, damageNotation: "1d6", damageBonus: 1, cr: 0.25, tags: ["zombie", "undead", "corpse", "tomb", "swamp"] },
  { key: "bandit", name: "Bandit", maxHp: 11, armorClass: 12, attackBonus: 3, damageNotation: "1d8", damageBonus: 1, cr: 0.125, tags: ["bandit", "outlaw", "road", "thug", "ambush"] },
  { key: "cultist", name: "Cultist", maxHp: 9, armorClass: 12, attackBonus: 2, damageNotation: "1d6", damageBonus: 0, cr: 0.125, tags: ["cultist", "cult", "ritual", "shrine", "fanatic"] },
  { key: "giant-spider", name: "Giant Spider", maxHp: 26, armorClass: 14, attackBonus: 5, damageNotation: "1d8", damageBonus: 3, cr: 1, tags: ["spider", "web", "forest", "cave"] },
  { key: "hobgoblin", name: "Hobgoblin", maxHp: 11, armorClass: 18, attackBonus: 3, damageNotation: "1d8", damageBonus: 1, cr: 0.5, tags: ["hobgoblin", "soldier", "war", "goblin"] },
  { key: "orc", name: "Orc", maxHp: 15, armorClass: 13, attackBonus: 5, damageNotation: "1d12", damageBonus: 3, cr: 0.5, tags: ["orc", "warband", "camp", "raider", "warrior"] },
  { key: "worg", name: "Worg", maxHp: 26, armorClass: 13, attackBonus: 5, damageNotation: "2d6", damageBonus: 4, cr: 0.5, tags: ["worg", "wolf", "mount", "dark"] },
  { key: "bugbear", name: "Bugbear", maxHp: 27, armorClass: 16, attackBonus: 4, damageNotation: "2d8", damageBonus: 2, cr: 1, tags: ["bugbear", "brute", "goblin", "ambush"] },
  { key: "dire-wolf", name: "Dire Wolf", maxHp: 37, armorClass: 14, attackBonus: 5, damageNotation: "2d6", damageBonus: 3, cr: 1, tags: ["wolf", "dire", "forest", "pack"] },
  { key: "ghoul", name: "Ghoul", maxHp: 22, armorClass: 12, attackBonus: 4, damageNotation: "2d6", damageBonus: 2, cr: 1, tags: ["ghoul", "undead", "tomb", "crypt", "graveyard"] },
  { key: "specter", name: "Specter", maxHp: 22, armorClass: 12, attackBonus: 4, damageNotation: "3d6", damageBonus: 0, cr: 1, tags: ["specter", "ghost", "undead", "haunt"] },
  { key: "ogre", name: "Ogre", maxHp: 59, armorClass: 11, attackBonus: 6, damageNotation: "2d8", damageBonus: 4, cr: 2, tags: ["ogre", "brute", "giant", "cave"] },
  { key: "troll", name: "Troll", maxHp: 84, armorClass: 15, attackBonus: 7, damageNotation: "2d6", damageBonus: 4, cr: 5, tags: ["troll", "bridge", "regeneration", "swamp"] },
  { key: "hill-giant", name: "Hill Giant", maxHp: 105, armorClass: 13, attackBonus: 8, damageNotation: "3d8", damageBonus: 5, cr: 5, tags: ["giant", "brute", "hill"] },
];

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "").replace(/s$/, "");
}

export function matchMonsters(description: string, limit = 2): Monster[] {
  const words = description
    .toLowerCase()
    .split(/[^a-z]+/)
    .map(normalizeWord)
    .filter((w) => w.length > 2);
  const scored = MONSTERS.map((monster) => {
    let score = 0;
    for (const word of words) {
      for (const tag of monster.tags) {
        if (word === tag) score += 1;
      }
    }
    return { monster, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const chosen = scored.slice(0, limit).map((s) => s.monster);
  if (chosen.length === 0) {
    // Fallback: a random low-CR monster so an empty description still works.
    const pick = MONSTERS[Math.floor(Math.random() * Math.min(MONSTERS.length, 6))]!;
    chosen.push(pick);
  }
  return chosen;
}

/**
 * Build a monster encounter scaled to the party. Budget is half the party
 * size (a medium-difficulty encounter for the level range this app targets);
 * each monster kind gets at least 1 and at most 8 copies.
 */
export function buildEncounter(
  description: string,
  partySize: number,
): NewCombatant[] {
  const kinds = matchMonsters(description);
  const budget = Math.max(1, Math.ceil(partySize / 2));
  const encounter: NewCombatant[] = [];
  for (const kind of kinds) {
    const count = Math.min(Math.max(1, Math.round(budget / Math.max(kind.cr, 0.125))), 8);
    for (let i = 0; i < count; i++) {
      encounter.push({
        id: `${kind.key}-${i}`,
        name: kind.name,
        isPlayer: false,
        maxHp: kind.maxHp,
        armorClass: kind.armorClass,
      });
    }
  }
  return encounter;
}
