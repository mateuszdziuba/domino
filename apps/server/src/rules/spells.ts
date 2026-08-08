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
    }
  | {
      kind: "heal";
      dice: string;
      mod: boolean;
      range: string;
      duration: string;
      castingTime: "action" | "bonus";
    }
  | {
      kind: "heal_all";
      dice: string;
      mod: boolean;
      range: string;
      duration: string;
      castingTime: "action";
      castingTimeMinutes?: number;
    }
  | {
      kind: "condition_apply";
      condition: string;
      save: keyof AbilityScore;
      range: string;
      duration: string;
      castingTime: "action";
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
    };

export type SpellDef = {
  name: string;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  school: string;
  components: string;
  description: string;
  effect: SpellEffect;
};

export const SPELLS: Record<string, SpellDef> = {
  "Sacred Flame": {
    name: "Sacred Flame",
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
    },
  },
  "Blindness/Deafness": {
    name: "Blindness/Deafness",
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
    },
  },
  "Revivify": {
    name: "Revivify",
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
    },
  },
  "Guardian of Faith": {
    name: "Guardian of Faith",
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
    },
  },
  "Greater Restoration": {
    name: "Greater Restoration",
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
};

export type SpellMeta = {
  name: string;
  level: 0 | 1 | 2 | 3 | 4 | 5;
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
      | "restore";
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

// Cleric spell slots per caster level (SRD 5.2.1 full-caster table), columns are 1st-5th level spell slots.
// v1 cap: caster levels above 9 use the level-9 row.
export function spellSlotsForLevel(casterLevel: number): number[] {
  const table: Record<number, number[]> = {
    1: [2, 0, 0, 0, 0],
    2: [3, 0, 0, 0, 0],
    3: [4, 2, 0, 0, 0],
    4: [4, 3, 0, 0, 0],
    5: [4, 3, 2, 0, 0],
    6: [4, 3, 3, 0, 0],
    7: [4, 3, 3, 1, 0],
    8: [4, 3, 3, 2, 0],
    9: [4, 3, 3, 3, 1],
  };
  return table[Math.min(Math.max(1, casterLevel), 9)] ?? table[9]!;
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

  if (effect.kind === "heal" || effect.kind === "heal_all") {
    const healRolls = rolls?.dice ?? rollDiceNotation(effect.dice).rolls;
    const total = healRolls.reduce((sum, r) => sum + r, 0);
    const healed = Math.max(1, total + (effect.mod ? caster.spellAbilityMod : 0));
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
    return {
      damageTotal: 0,
      damageRolls: [],
      healed: 0,
      healRolls: [],
      targetCurrentHp: Math.max(1, target.currentHp),
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
