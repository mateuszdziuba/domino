import type { AbilityScore, Combatant } from "@domino/shared";
import { GUIDING_BOLT_MARKER } from "./conditions.js";
import { applyHitToTarget } from "./combat.js";
import { d, rollDiceNotation } from "./dice.js";

export type SpellEffect =
  | {
      kind: "damage";
      dice: string;
      damageType: string;
      attack: boolean;
      save?: keyof AbilityScore;
      range: string;
      duration: string;
      castingTime: "action" | "bonus";
      rider?: "advantage_next_attack";
      concentration?: boolean;
    }
  | {
      kind: "heal";
      dice: string;
      mod: boolean;
      range: string;
      duration: string;
      castingTime: "action" | "bonus";
      flat?: number;
    }
  | {
      kind: "heal_all";
      dice: string;
      mod: boolean;
      range: string;
      duration: string;
      castingTime: "action";
      castingTimeMinutes?: number;
      flat?: number;
      concentration?: boolean;
    }
  | {
      kind: "condition_apply";
      condition: string;
      save: keyof AbilityScore;
      range: string;
      duration: string;
      castingTime: "action";
      concentration?: boolean;
    }
  | {
      kind: "condition_remove";
      range: string;
      duration: string;
      castingTime: "action";
    }
  | {
      kind: "revive";
      range: string;
      duration: string;
      castingTime: "action";
      fullHp?: boolean;
    }
  | {
      kind: "stabilize";
      range: string;
      duration: string;
      castingTime: "action";
    }
  | {
      kind: "restore";
      range: string;
      duration: string;
      castingTime: "action";
    }
  | {
      kind: "none";
      range: string;
      duration: string;
      castingTime: "action" | "bonus";
      concentration?: boolean;
    };

export type SpellDef = {
  name: string;
  namePl: string;
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  school: string;
  components: string;
  description: string;
  effect: SpellEffect;
};

import { SPELLS_L0 } from "./spells/spells-l0.js";
import { SPELLS_L1 } from "./spells/spells-l1.js";
import { SPELLS_L2 } from "./spells/spells-l2.js";

export const SPELLS: Record<string, SpellDef> = {
  ...SPELLS_L0,
  ...SPELLS_L1,
  ...SPELLS_L2,
  "Bless": {
    name: "Bless",
    namePl: "Błogosławieństwo",
    level: 1,
    school: "Enchantment",
    components: "V, S, M",
    description:
      "Wybierasz do trzech istot: każda dodaje 1k4 do rzutów ataku i rzutów obronnych na czas trwania. Efekt narracyjny — DM rozstrzyga modyfikatory.",
    effect: {
      kind: "none",
      range: "30 ft",
      duration: "1 min",
      castingTime: "action",
      concentration: true,
    },
  },
  "Light": {
    name: "Light",
    namePl: "Światło",
    level: 0,
    school: "Evocation",
    components: "V, M",
    description:
      "Dotknięty przedmiot emituje jasne światło w promieniu 20 stóp (i przyćmione o 20 więcej). Efekt narracyjny — wpływa na oświetlenie sceny.",
    effect: {
      kind: "none",
      range: "Touch",
      duration: "1 h",
      castingTime: "action",
    },
  },
  "Mage Hand": {
    name: "Mage Hand",
    namePl: "Czarodziejska dłoń",
    level: 0,
    school: "Conjuration",
    components: "V, S",
    description:
      "Przywołujesz widmową dłoń w zasięgu 30 stóp, która może przenosić drobne przedmioty. Efekt narracyjny — DM rozstrzyga interakcje.",
    effect: {
      kind: "none",
      range: "30 ft",
      duration: "1 min",
      castingTime: "action",
    },
  },
  "Sacred Flame": {
    name: "Sacred Flame",
    namePl: "Święty płomień",
    level: 0,
    school: "Evocation",
    components: "V, S",
    description:
      "Płomień zstępuje z nieba na cel w zasięgu 60 stóp. Cel wykonuje rzut obronny na Zręczność; nieudany rzut oznacza 1k8 obrażeń promienistych. Błysk obejmuje cel nawet za osłoną — nie ma on korzyści z osłony.",
    effect: {
      kind: "damage",
      dice: "1d8",
      damageType: "radiant",
      attack: false,
      save: "dexterity",
      range: "60 ft",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
  "Spare the Dying": {
    name: "Spare the Dying",
    namePl: "Ochrona przed śmiercią",
    level: 0,
    school: "Necromancy",
    components: "V, S",
    description:
      "Dotykasz umierającej istoty z 0 punktami życia. Staje się ona stabilna: nie musi już wykonywać rzutów obronnych przed śmiercią, choć pozostaje nieprzytomna, dopóki nie zostanie wyleczona.",
    effect: {
      kind: "stabilize",
      range: "Touch",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
  "Cure Wounds": {
    name: "Cure Wounds",
    namePl: "Leczenie ran",
    level: 1,
    school: "Evocation",
    components: "V, S",
    description:
      "Dotyk leczy rany istoty: odzyskuje ona 1k8 + modyfikator twojej zdolności rzucania zaklęć punktów życia. Leczenie nie może przekroczyć maksymalnego poziomu życia celu.",
    effect: {
      kind: "heal",
      dice: "1d8",
      mod: true,
      range: "Touch",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
  "Healing Word": {
    name: "Healing Word",
    namePl: "Uzdrawiające słowo",
    level: 1,
    school: "Evocation",
    components: "V",
    description:
      "Wypowiadasz uzdrawiające słowo w zasięgu 60 stóp (akcja dodatkowa): cel odzyskuje 1k4 + modyfikator zdolności rzucania zaklęć punktów życia. Idealne do przywrócenia sojusznika do walki.",
    effect: {
      kind: "heal",
      dice: "1d4",
      mod: true,
      range: "60 ft",
      duration: "Instantaneous",
      castingTime: "bonus",
    },
  },
  "Guiding Bolt": {
    name: "Guiding Bolt",
    namePl: "Prowadzący promień",
    level: 1,
    school: "Evocation",
    components: "V, S",
    description:
      "Smuga światła uderza w cel w zasięgu 120 stóp. Wykonaj rzut ataku; trafienie zadaje 4k6 obrażeń promienistych, a następny rzut ataku przeciwko celowi wykonuje z przewagą.",
    effect: {
      kind: "damage",
      dice: "4d6",
      damageType: "radiant",
      attack: true,
      range: "120 ft",
      duration: "1 round",
      castingTime: "action",
      rider: "advantage_next_attack",
    },
  },
  "Inflict Wounds": {
    name: "Inflict Wounds",
    namePl: "Zadawanie ran",
    level: 1,
    school: "Necromancy",
    components: "V, S",
    description:
      "Dotyk przepełnia cel nekrotyczną energią. Wykonaj rzut ataku w zwarciu; trafienie zadaje 3k10 obrażeń nekrotycznych — bolesny cios dla wrogów w bezpośredniej walce.",
    effect: {
      kind: "damage",
      dice: "3d10",
      damageType: "necrotic",
      attack: true,
      range: "Touch",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
  "Spiritual Weapon": {
    name: "Spiritual Weapon",
    namePl: "Duchowa broń",
    level: 2,
    school: "Evocation",
    components: "V, S",
    description:
      "W zasięgu 60 stóp materializuje się eteryczna broń, która atakuje wrogów jako twoja akcja dodatkowa. Wykonaj rzut ataku zaklęciem; trafienie zadaje 1k8 + modyfikator zdolności rzucania zaklęć obrażeń siłowych. Broń utrzymuje się przez minutę i może atakować ponownie w kolejnych turach.",
    effect: {
      kind: "damage",
      dice: "1d8",
      damageType: "force",
      attack: true,
      range: "60 ft",
      duration: "1 min",
      castingTime: "bonus",
    },
  },
  "Prayer of Healing": {
    name: "Prayer of Healing",
    namePl: "Modlitwa uzdrawiająca",
    level: 2,
    school: "Evocation",
    components: "V",
    description:
      "Pogrążasz się w modlitwie, która leczy wszystkich sojuszników w promieniu 30 stóp o 2k8 + modyfikator twojej zdolności rzucania zaklęć punktów życia. Rytuał trwa 10 minut, więc nie można go użyć w samym środku walki.",
    effect: {
      kind: "heal_all",
      dice: "2d8",
      mod: true,
      range: "30 ft",
      duration: "Instantaneous",
      castingTime: "action",
      castingTimeMinutes: 10,
    },
  },
  "Lesser Restoration": {
    name: "Lesser Restoration",
    namePl: "Mniejsze przywrócenie",
    level: 2,
    school: "Abjuration",
    components: "V, S",
    description:
      "Dotykasz istoty i usuwasz z niej jeden stan: ślepotę, głuchotę, paraliż lub zatrucie. Zaklęcie nie leczy ran, ale przywraca pełnię zmysłów i sprawność ciała.",
    effect: {
      kind: "condition_remove",
      range: "Touch",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
  "Hold Person": {
    name: "Hold Person",
    namePl: "Przytrzymanie osoby",
    level: 2,
    school: "Enchantment",
    components: "V, S, M",
    description:
      "Wybierasz humanoida w zasięgu 60 stóp; musi on wykonać rzut obronny na Mądrość. Nieudany rzut oznacza paraliż na czas trwania zaklęcia — cel jest obezwładniony, a trafienia w zwarciu są krytyczne. Cel może ponowić rzut obronny na końcu każdej swojej tury.",
    effect: {
      kind: "condition_apply",
      condition: "paralyzed",
      save: "wisdom",
      range: "60 ft",
      duration: "1 min",
      castingTime: "action",
      concentration: true,
    },
  },
  "Blindness/Deafness": {
    name: "Blindness/Deafness",
    namePl: "Ślepota/Głuchota",
    level: 2,
    school: "Necromancy",
    components: "V",
    description:
      "Przeszywasz wroga w zasięgu 30 stóp ciemną energią; cel wykonuje rzut obronny na Kondycję. Nieudany rzut oznacza oślepienie (lub ogłuszenie, do wyboru przez DM) na czas trwania. Na końcu każdej swojej tury cel może ponowić rzut obronny.",
    effect: {
      kind: "condition_apply",
      condition: "blinded",
      save: "constitution",
      range: "30 ft",
      duration: "1 min",
      castingTime: "action",
      concentration: true,
    },
  },
  "Revivify": {
    name: "Revivify",
    namePl: "Wskrzeszenie",
    level: 3,
    school: "Necromancy",
    components: "V, S, M",
    description:
      "Dotykasz istoty, która zmarła w ciągu ostatniej minuty, i przywracasz ją do życia z 1 punktem życia. Zaklęcie zużywa diamenty o wartości co najmniej 300 sztuk złota.",
    effect: {
      kind: "revive",
      range: "Touch",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
  "Spirit Guardians": {
    name: "Spirit Guardians",
    namePl: "Duchy opiekuńcze",
    level: 3,
    school: "Conjuration",
    components: "V, S, M",
    description:
      "Wokół ciebie wirują duchy śpiewające i zasłaniające widok. Wróg rozpoczynający turę w promieniu 15 stóp wykonuje rzut obronny na Mądrość; nieudany oznacza 3k8 obrażeń promienistych (lub nekrotycznych, do wyboru). Utrudnia to także ataki przeciw tobie.",
    effect: {
      kind: "damage",
      dice: "3d8",
      damageType: "radiant",
      attack: false,
      save: "wisdom",
      range: "Self (15 ft)",
      duration: "10 min",
      castingTime: "action",
      concentration: true,
    },
  },
  "Guardian of Faith": {
    name: "Guardian of Faith",
    namePl: "Strażnik wiary",
    level: 4,
    school: "Conjuration",
    components: "V",
    description:
      "Przywołujesz widmowego strażnika, który strzeże wskazanego miejsca. Każdy wróg w promieniu 10 stóp od strażnika wykonuje rzut obronny na Zręczność; nieudany oznacza 4k10 obrażeń promienistych (uproszczenie: pełne obrażenia przy pierwszym uderzeniu).",
    effect: {
      kind: "damage",
      dice: "4d10",
      damageType: "radiant",
      attack: false,
      save: "dexterity",
      range: "30 ft",
      duration: "8 h",
      castingTime: "action",
    },
  },
  "Banishment": {
    name: "Banishment",
    namePl: "Wygnanie",
    level: 4,
    school: "Abjuration",
    components: "V, S, M",
    description:
      "Cel musi wykonać rzut obronny na Charyzmę; nieudany — zostaje wygnany z aktualnej płaszczyzny na czas trwania zaklęcia i nie może działać. Po upływie czasu wraca w to samo miejsce.",
    effect: {
      kind: "condition_apply",
      condition: "banished",
      save: "charisma",
      range: "60 ft",
      duration: "1 min",
      castingTime: "action",
      concentration: true,
    },
  },
  "Greater Restoration": {
    name: "Greater Restoration",
    namePl: "Większe przywrócenie",
    level: 5,
    school: "Abjuration",
    components: "V, S, M",
    description:
      "Dotyk uzdrawia ciało i umysł: usuwa jeden stan albo obniża poziom wyczerpania o 1 (do wyboru przez rzucającego).",
    effect: {
      kind: "restore",
      range: "Touch",
      duration: "Instantaneous",
      castingTime: "action",
    },
  },
  "Heal": {
    name: "Heal",
    namePl: "Uzdrowienie",
    level: 6,
    school: "Evocation",
    components: "V, S",
    description:
      "Fala złocistej energii leczy cel o 70 punktów życia. Zaklęcie usuwa także ślepotę, głuchotę i wszelkie choroby (flavor: stany — mechanika: czyste leczenie).",
    effect: {
      kind: "heal",
      dice: "1d1",
      mod: false,
      range: "60 ft",
      duration: "Instantaneous",
      castingTime: "action",
      flat: 70,
    },
  },
  "Blade Barrier": {
    name: "Blade Barrier",
    namePl: "Bariera ostrzy",
    level: 6,
    school: "Evocation",
    components: "V, S",
    description:
      "Wirująca ściana ostrzy wyrasta w wybranym miejscu; każdy wróg przechodzący przez nią (uproszczenie: cel przy rzuceniu) wykonuje rzut obronny na Zręczność — nieudany oznacza 6k10 obrażeń tnących.",
    effect: {
      kind: "damage",
      dice: "6d10",
      damageType: "slashing",
      attack: false,
      save: "dexterity",
      range: "90 ft",
      duration: "10 min",
      castingTime: "action",
      concentration: true,
    },
  },
  "Resurrection": {
    name: "Resurrection",
    namePl: "Zmartwychwstanie",
    level: 7,
    school: "Necromancy",
    components: "V, S, M",
    description:
      "Dotykasz istoty zmarłej nie dłużej niż sto lat temu i przywracasz ją do życia z pełnym poziomem życia (koszt: diamenty o wartości 1000 sztuk złota — flavor).",
    effect: {
      kind: "revive",
      range: "Touch",
      duration: "Instantaneous",
      castingTime: "action",
      fullHp: true,
    },
  },
  "Mass Heal": {
    name: "Mass Heal",
    namePl: "Masowe uzdrowienie",
    level: 9,
    school: "Evocation",
    components: "V, S",
    description:
      "Potężna fala uzdrawiającej energii dociera do wszystkich sojuszników w promieniu 60 stóp: każdy odzyskuje 700 punktów życia.",
    effect: {
      kind: "heal_all",
      dice: "1d1",
      mod: false,
      range: "60 ft",
      duration: "Instantaneous",
      castingTime: "action",
      flat: 700,
    },
  },
};

export type SpellMeta = {
  name: string;
  namePl: string;
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  school: string;
  components: string;
  description: string;
  castingTime: string;
  range: string;
  duration: string;
  effect: {
    kind:
      | "damage"
      | "heal"
      | "heal_all"
      | "condition_apply"
      | "condition_remove"
      | "revive"
      | "stabilize"
      | "restore"
      | "none";
    dice?: string;
    damageType?: string;
    attack?: boolean;
    save?: keyof AbilityScore;
    mod?: boolean;
    condition?: string;
  };
};

export function summarizeSpells(): SpellMeta[] {
  return Object.values(SPELLS)
    .map((spell) => ({
      name: spell.name,
      namePl: spell.namePl,
      level: spell.level,
      school: spell.school,
      components: spell.components,
      description: spell.description,
      castingTime: spell.effect.castingTime,
      range: spell.effect.range,
      duration: spell.effect.duration,
      effect: spell.effect,
    }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function findSpellByName(name: string): SpellDef | undefined {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return undefined;
  return Object.values(SPELLS).find(
    (spell) =>
      spell.name.toLowerCase() === wanted || spell.namePl.toLowerCase() === wanted,
  );
}

export function findSpellInText(text: string): SpellDef | undefined {
  const lower = text.toLowerCase();
  const longestFirst = Object.values(SPELLS).sort(
    (a, b) => b.name.length - a.name.length,
  );
  return longestFirst.find(
    (spell) =>
      lower.includes(spell.name.toLowerCase()) ||
      lower.includes(spell.namePl.toLowerCase()),
  );
}

// Cleric spell slots per caster level (SRD 5.2.1 full-caster table), columns are 1st-9th level spell slots.
// v1 cap: caster levels above 17 use the level-17 row.
export function spellSlotsForLevel(casterLevel: number): number[] {
  const table: Record<number, number[]> = {
    1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  };
  return table[Math.min(Math.max(1, casterLevel), 17)] ?? table[17]!;
}

export type SpellCasterStats = {
  spellAttackBonus: number;
  spellSaveDc: number;
  spellAbilityMod: number;
};

export type SpellRollInput = {
  attack?: number;
  attackSecond?: number;
  save?: number;
  dice?: number[];
  advantage?: boolean;
  disadvantage?: boolean;
  restoreMode?: "condition" | "exhaustion";
};

export type SpellCastResult = {
  hit?: boolean;
  critical?: boolean;
  attackTotal?: number;
  attackRolls?: number[];
  saveDc?: number;
  saveTotal?: number;
  damageTotal: number;
  damageRolls: number[];
  healed: number;
  healRolls: number[];
  targetCurrentHp: number;
  targetStatus: Combatant["status"];
  riderApplied?: boolean;
  conditionApplied?: string;
  conditionRemoved?: string;
  revived?: boolean;
  restoredCondition?: string;
  restoredExhaustion?: boolean;
};

export function applySpellRider(target: Combatant, def: SpellDef): Combatant | undefined {
  if (def.effect.kind !== "damage" || def.effect.rider !== "advantage_next_attack") {
    return undefined;
  }
  const conditions = target.conditions ?? [];
  if (conditions.includes(GUIDING_BOLT_MARKER)) return undefined;
  return { ...target, conditions: [...conditions, GUIDING_BOLT_MARKER] };
}

export function resolveSpellCast(
  def: SpellDef,
  caster: SpellCasterStats,
  target: Combatant,
  rolls?: SpellRollInput,
): SpellCastResult {
  const effect = def.effect;

  if (effect.kind === "none") {
    return {
      damageTotal: 0,
      damageRolls: [],
      healed: 0,
      healRolls: [],
      targetCurrentHp: target.currentHp,
      targetStatus: target.status ?? "active",
    };
  }

  if (effect.kind === "heal" || effect.kind === "heal_all") {
    const healRolls =
      effect.flat !== undefined ? [] : (rolls?.dice ?? rollDiceNotation(effect.dice).rolls);
    const total = healRolls.reduce((sum, r) => sum + r, 0);
    const healed =
      effect.flat !== undefined
        ? Math.min(effect.flat, target.maxHp - target.currentHp)
        : Math.max(1, total + (effect.mod ? caster.spellAbilityMod : 0));
    const targetCurrentHp = Math.min(target.maxHp, target.currentHp + healed);
    const targetStatus: Combatant["status"] =
      targetCurrentHp > 0 ? "active" : target.status ?? "downed";
    return {
      damageTotal: 0,
      damageRolls: [],
      healed,
      healRolls,
      targetCurrentHp,
      targetStatus,
    };
  }

  if (effect.kind === "condition_apply") {
    const saveRoll = rolls?.save ?? d(20, 1)[0]!;
    const saveTotal = saveRoll;
    const hit = saveTotal < caster.spellSaveDc;
    return {
      hit,
      critical: false,
      saveDc: caster.spellSaveDc,
      saveTotal,
      damageTotal: 0,
      damageRolls: [],
      healed: 0,
      healRolls: [],
      targetCurrentHp: target.currentHp,
      targetStatus: target.status ?? "active",
      conditionApplied: hit ? effect.condition : undefined,
    };
  }

  if (effect.kind === "condition_remove") {
    const existing = target.conditions ?? [];
    return {
      damageTotal: 0,
      damageRolls: [],
      healed: 0,
      healRolls: [],
      targetCurrentHp: target.currentHp,
      targetStatus: target.status ?? "active",
      conditionRemoved: existing.length > 0 ? existing[0] : undefined,
    };
  }

  if (effect.kind === "revive") {
    const targetCurrentHp = effect.fullHp ? target.maxHp : Math.max(1, target.currentHp);
    return {
      damageTotal: 0,
      damageRolls: [],
      healed: 0,
      healRolls: [],
      targetCurrentHp,
      targetStatus: "active",
      revived: true,
    };
  }

  if (effect.kind === "restore") {
    if (rolls?.restoreMode === "exhaustion") {
      return {
        damageTotal: 0,
        damageRolls: [],
        healed: 0,
        healRolls: [],
        targetCurrentHp: target.currentHp,
        targetStatus: target.status ?? "active",
        restoredExhaustion: true,
      };
    }
    const existing = target.conditions ?? [];
    return {
      damageTotal: 0,
      damageRolls: [],
      healed: 0,
      healRolls: [],
      targetCurrentHp: target.currentHp,
      targetStatus: target.status ?? "active",
      restoredCondition: existing.length > 0 ? existing[0] : undefined,
    };
  }

  if (effect.kind === "stabilize") {
    const targetCurrentHp = target.currentHp;
    const targetStatus: Combatant["status"] =
      target.currentHp === 0 ? "stable" : target.status ?? "active";
    return {
      damageTotal: 0,
      damageRolls: [],
      healed: 0,
      healRolls: [],
      targetCurrentHp,
      targetStatus,
    };
  }

  if (effect.attack) {
    const attackRoll1 = rolls?.attack ?? d(20, 1)[0]!;
    const useAdvantage = rolls?.advantage === true && rolls?.disadvantage !== true;
    const useDisadvantage = rolls?.disadvantage === true && rolls?.advantage !== true;
    let attackRoll = attackRoll1;
    let attackRolls = [attackRoll1];
    if (useAdvantage || useDisadvantage) {
      const attackSecond = rolls?.attackSecond ?? d(20, 1)[0]!;
      attackRolls = [attackRoll1, attackSecond];
      attackRoll = useAdvantage
        ? Math.max(attackRoll1, attackSecond)
        : Math.min(attackRoll1, attackSecond);
    }
    const critical = attackRoll === 20;
    const attackTotal = attackRoll + caster.spellAttackBonus;
    const hit = critical || attackTotal >= target.armorClass;
    const riderApplied = hit && effect.rider === "advantage_next_attack";
    const allDice = rolls?.dice ?? rollDiceNotation(effect.dice).rolls;
    const first = critical ? allDice.slice(0, Math.floor(allDice.length / 2)) : allDice;
    const second = critical ? allDice.slice(Math.floor(allDice.length / 2)) : [];
    const damageTotal = hit
      ? first.reduce((sum, r) => sum + r, 0) +
        (critical ? second.reduce((sum, r) => sum + r, 0) : 0)
      : 0;
    const applied = applyHitToTarget(target, damageTotal, critical);
    return {
      hit,
      critical,
      attackTotal,
      attackRolls,
      riderApplied,
      damageTotal,
      damageRolls: [...first, ...second],
      healed: 0,
      healRolls: [],
      targetCurrentHp: applied.currentHp,
      targetStatus: applied.status,
    };
  }

  // Saving-throw spells: Combatant carries no saving-throw modifiers, so v1 uses +0 for the target's save.
  const saveRoll = rolls?.save ?? d(20, 1)[0]!;
  const saveTotal = saveRoll;
  const hit = saveTotal < caster.spellSaveDc;
  const allDice = rolls?.dice ?? rollDiceNotation(effect.dice).rolls;
  const damageTotal = hit ? allDice.reduce((sum, r) => sum + r, 0) : 0;
  const applied = applyHitToTarget(target, damageTotal, false);
  return {
    hit,
    critical: false,
    saveDc: caster.spellSaveDc,
    saveTotal,
    damageTotal,
    damageRolls: allDice,
    healed: 0,
    healRolls: [],
    targetCurrentHp: applied.currentHp,
    targetStatus: applied.status,
  };
}
