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
  attacks: number;
  tags: string[];
  traits: string[];
  speed?: number;
  spells?: string[];
  spellSaveDc?: number;
  spellAttackBonus?: number;
};

export const MONSTERS: Monster[] = [
  { key: "giant-rat", name: "Giant Rat", maxHp: 7, armorClass: 12, attackBonus: 4, damageNotation: "1d4", damageBonus: 2, cr: 0.125, attacks: 1, tags: ["rat", "vermin", "sewer", "swarm", "szczur", "szczury"], traits: ["keen_smell"], speed: 30 },
  { key: "goblin", name: "Goblin", maxHp: 7, armorClass: 15, attackBonus: 4, damageNotation: "1d6", damageBonus: 2, cr: 0.25, attacks: 1, tags: ["goblin", "cave", "raider", "ambush", "tribe", "gobliny"], traits: ["nimble_escape"], speed: 30 },
  { key: "wolf", name: "Wolf", maxHp: 11, armorClass: 13, attackBonus: 4, damageNotation: "2d4", damageBonus: 2, cr: 0.25, attacks: 1, tags: ["wolf", "pack", "forest", "wild", "woods", "wilk", "wilki", "wilcze"], traits: ["keen_senses", "pack_tactics"], speed: 40 },
  { key: "skeleton", name: "Skeleton", maxHp: 13, armorClass: 13, attackBonus: 4, damageNotation: "1d6", damageBonus: 2, cr: 0.25, attacks: 1, tags: ["skeleton", "undead", "tomb", "crypt", "graveyard", "bones", "szkielet", "szkielety"], traits: [], speed: 30 },
  { key: "zombie", name: "Zombie", maxHp: 22, armorClass: 8, attackBonus: 3, damageNotation: "1d6", damageBonus: 1, cr: 0.25, attacks: 1, tags: ["zombie", "undead", "corpse", "tomb", "swamp"], traits: ["undead_fortitude"], speed: 20 },
  { key: "bandit", name: "Bandit", maxHp: 11, armorClass: 12, attackBonus: 3, damageNotation: "1d8", damageBonus: 1, cr: 0.125, attacks: 1, tags: ["bandit", "outlaw", "road", "thug", "ambush", "bandyt", "rabus", "złodziej"], traits: [], speed: 30 },
  { key: "cultist", name: "Cultist", maxHp: 9, armorClass: 12, attackBonus: 2, damageNotation: "1d6", damageBonus: 0, cr: 0.125, attacks: 1, tags: ["cultist", "cult", "ritual", "shrine", "fanatic", "kultysta", "kultysci", "kult"], traits: [], speed: 30 },
  { key: "acolyte", name: "Acolyte", maxHp: 9, armorClass: 10, attackBonus: 2, damageNotation: "1d4", damageBonus: 0, cr: 0.25, attacks: 1, tags: ["acolyte", "cult", "temple", "cleric"], traits: [], speed: 30, spells: ["Sacred Flame", "Cure Wounds", "Spare the Dying"], spellSaveDc: 11, spellAttackBonus: 3 },
  { key: "priest", name: "Priest", maxHp: 27, armorClass: 13, attackBonus: 4, damageNotation: "1d6", damageBonus: 1, cr: 2, attacks: 1, tags: ["priest", "temple", "cleric", "holy"], traits: [], speed: 30, spells: ["Sacred Flame", "Cure Wounds", "Guiding Bolt", "Lesser Restoration", "Spiritual Weapon", "Spirit Guardians"], spellSaveDc: 13, spellAttackBonus: 5 },
  { key: "giant-spider", name: "Giant Spider", maxHp: 26, armorClass: 14, attackBonus: 5, damageNotation: "1d8", damageBonus: 3, cr: 1, attacks: 1, tags: ["spider", "web", "forest", "cave", "pająk", "pajaki"], traits: ["web"], speed: 30 },
  { key: "hobgoblin", name: "Hobgoblin", maxHp: 11, armorClass: 18, attackBonus: 3, damageNotation: "1d8", damageBonus: 1, cr: 0.5, attacks: 1, tags: ["hobgoblin", "soldier", "war", "goblin", "hobgobliny"], traits: [], speed: 30 },
  { key: "orc", name: "Orc", maxHp: 15, armorClass: 13, attackBonus: 5, damageNotation: "1d12", damageBonus: 3, cr: 0.5, attacks: 1, tags: ["orc", "warband", "camp", "raider", "warrior", "ork", "orki"], traits: [], speed: 30 },
  { key: "worg", name: "Worg", maxHp: 26, armorClass: 13, attackBonus: 5, damageNotation: "2d6", damageBonus: 4, cr: 0.5, attacks: 1, tags: ["worg", "wolf", "mount", "dark"], traits: [], speed: 50 },
  { key: "bugbear", name: "Bugbear", maxHp: 27, armorClass: 16, attackBonus: 4, damageNotation: "2d8", damageBonus: 2, cr: 1, attacks: 1, tags: ["bugbear", "brute", "goblin", "ambush"], traits: [], speed: 30 },
  { key: "dire-wolf", name: "Dire Wolf", maxHp: 37, armorClass: 14, attackBonus: 5, damageNotation: "2d6", damageBonus: 3, cr: 1, attacks: 1, tags: ["wolf", "dire", "forest", "pack", "wilk"], traits: ["keen_senses", "pack_tactics"], speed: 50 },
  { key: "ghoul", name: "Ghoul", maxHp: 22, armorClass: 12, attackBonus: 4, damageNotation: "2d6", damageBonus: 2, cr: 1, attacks: 1, tags: ["ghoul", "undead", "tomb", "crypt", "graveyard", "ghul", "trup"], traits: ["paralyzing_touch"], speed: 30 },
  { key: "specter", name: "Specter", maxHp: 22, armorClass: 12, attackBonus: 4, damageNotation: "3d6", damageBonus: 0, cr: 1, attacks: 1, tags: ["specter", "ghost", "undead", "haunt", "widmo", "zjawa"], traits: [], speed: 0 },
  { key: "ogre", name: "Ogre", maxHp: 59, armorClass: 11, attackBonus: 6, damageNotation: "2d8", damageBonus: 4, cr: 2, attacks: 1, tags: ["ogre", "brute", "giant", "cave", "ogr", "ogry"], traits: [], speed: 40 },
  { key: "troll", name: "Troll", maxHp: 84, armorClass: 15, attackBonus: 7, damageNotation: "2d6", damageBonus: 4, cr: 5, attacks: 2, tags: ["troll", "bridge", "regeneration", "swamp"], traits: ["regeneration", "keen_senses"], speed: 30 },
  { key: "hill-giant", name: "Hill Giant", maxHp: 105, armorClass: 13, attackBonus: 8, damageNotation: "3d8", damageBonus: 5, cr: 5, attacks: 2, tags: ["giant", "brute", "hill", "gigant", "olbrzym"], traits: [], speed: 40 },
];

function normalizeWord(word: string): string {
  const ascii = word.toLowerCase().replace(/[^a-z]/g, "").replace(/s$/, "");
  if (ascii.length >= 3 && /[yi]$/.test(ascii)) {
    return ascii.slice(0, -1);
  }
  return ascii;
}

export function matchMonsters(description: string, limit = 2): Monster[] {
  const words = description
    .toLowerCase()
    .split(/[^a-zą-ż]+/)
    .map(normalizeWord)
    .filter((w) => w.length > 2);
  const scored = MONSTERS.map((monster) => {
    let score = 0;
    for (const word of words) {
      for (const tag of monster.tags) {
        if (word === normalizeWord(tag)) score += 1;
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
        cr: kind.cr,
        traits: kind.traits,
        attacksPerTurn: kind.attacks,
        speed: kind.speed ?? 30,
      });
    }
  }
  return encounter;
}

/**
 * Roll a random SRD encounter weighted to the party. Kinds are picked greedily
 * by CR closest to `partyLevel / 3` (the target CR for a medium-difficulty
 * single monster); the total CR budget is roughly partyLevel × partySize / 4.
 * An optional terrain tag filters the catalog (falling back to all monsters
 * when nothing carries the tag). Every kind appears at least once and at most
 * 4 times; the encounter holds 1–6 combatants.
 */
export function randomEncounter(
  partyLevel: number,
  partySize: number,
  terrain?: string,
): NewCombatant[] {
  const pool = terrain
    ? MONSTERS.filter((m) => m.tags.includes(terrain))
    : MONSTERS;
  const kinds = pool.length > 0 ? pool : MONSTERS;
  const budget = Math.max(1, Math.ceil((partyLevel * partySize) / 4));
  const target = partyLevel / 3;
  const sorted = [...kinds].sort(
    (a, b) => Math.abs(a.cr - target) - Math.abs(b.cr - target),
  );
  const encounter: NewCombatant[] = [];
  let spent = 0;
  for (const kind of sorted) {
    if (encounter.length >= 6) break;
    const count = Math.min(
      Math.max(1, Math.round((budget - spent) / Math.max(kind.cr, 0.125))),
      4,
    );
    for (let i = 0; i < count; i++) {
      encounter.push({
        id: `${kind.key}-${i}`,
        name: kind.name,
        isPlayer: false,
        maxHp: kind.maxHp,
        armorClass: kind.armorClass,
        cr: kind.cr,
        traits: kind.traits,
        attacksPerTurn: kind.attacks,
        speed: kind.speed ?? 30,
      });
    }
    spent += count * kind.cr;
    if (spent >= budget) break;
  }
  return encounter;
}
