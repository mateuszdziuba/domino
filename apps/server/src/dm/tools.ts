import { z } from "zod";
import {
  getCampaignForUser,
  getCampaignCharacters,
  getCampaignMembers,
  getCharacterById,
  loadState,
  saveState,
  pushEvent,
  updateCharacterHp,
  updateCharacterSpellSlots,
  updateCharacterHitDice,
  updateCharacterExhaustion,
  updateCharacterInspiration,
  updateCharacterInventory,
  grantXp,
  grantLoot,
} from "../campaign/store.js";
import { buildDmSuggestion, getAvailableActions } from "../rules/actions.js";
import { d, rollD20, rollDiceNotation } from "../rules/dice.js";
import { xpAwardForDeadEnemies, hitDieForClass } from "../rules/advancement.js";
import {
  CONDITIONS,
  GUIDING_BOLT_MARKER,
  attackRollAdvantages,
  canAct,
  isConditionKey,
} from "../rules/conditions.js";
import {
  nextTurn,
  currentTurnCombatant,
  startCombat,
  endCombat,
  findCombatant,
  combatantByCharacter,
  performAttack,
  performDeathSave,
  characterAttackInput,
} from "../rules/combat.js";
import { abilityModifier, proficiencyBonus } from "../rules/abilities.js";
import { buildCharacterFeatures } from "../rules/features.js";
import {
  SPELLS,
  spellSlotsForLevel,
  resolveSpellCast,
  applySpellRider,
  type SpellCasterStats,
  type SpellDef,
  type SpellCastResult,
} from "../rules/spells.js";
import { buildEncounter, MONSTERS, randomEncounter } from "../rules/monsters.js";
import { EQUIPMENT_SLOTS, isSlotKey } from "../rules/equipment.js";
import { equippedWeaponAttackInput } from "../rules/weapons.js";
import {
  ADVENTURES,
  buildAdventureState,
  findAdventure,
} from "../rules/adventures.js";
import type { DmToolName } from "./types.js";
import {
  SKILLS,
  spellcastingAbility,
  type CampaignState,
  type Character,
  type Combatant,
  type SkillName,
} from "@domino/shared";

const rollSchema = z.object({
  notation: z.string().min(1),
  reason: z.string().optional(),
});

const actionSchema = z.object({
  characterId: z.string().min(1),
  action: z.string().min(1),
});

const worldPatchSchema = z.object({
  location: z.string().max(128).optional(),
  scene: z.string().max(256).optional(),
  worldProgress: z.array(z.string().max(256)).max(64).optional(),
  notes: z.string().max(2000).optional(),
});

const skillCheckSchema = z.object({
  characterId: z.string().min(1),
  skill: z.string().min(1),
  dc: z.number().int().min(1).max(40).optional(),
  advantage: z.boolean().optional(),
  disadvantage: z.boolean().optional(),
  useInspiration: z.boolean().optional(),
  reason: z.string().max(100).optional(),
});

const useItemSchema = z.object({
  characterId: z.string().min(1),
  itemId: z.string().min(1),
  targetId: z.string().optional(),
});

const SKILL_LABELS: Record<SkillName, string> = {
  acrobatics: "Akrobatyka",
  animalHandling: "Obsługa zwierząt",
  arcana: "Tajemnice",
  athletics: "Atletyka",
  deception: "Oszustwo",
  history: "Historia",
  insight: "Intuicja",
  intimidation: "Zastraszanie",
  investigation: "Śledztwo",
  medicine: "Medycyna",
  nature: "Natura",
  perception: "Percepcja",
  performance: "Występy",
  persuasion: "Perswazja",
  religion: "Religia",
  sleightOfHand: "Zwinne dłonie",
  stealth: "Skradanie",
  survival: "Przetrwanie",
};

const HEALING_POTION_DICE: Record<string, string> = {
  "Potion of Healing": "2d4+2",
  "Greater Potion of Healing": "4d4+4",
  "Superior Potion of Healing": "8d4+8",
  "Supreme Potion of Healing": "10d4+20",
};

export type ToolResult = {
  ok: boolean;
  message: string;
  data?: unknown;
};

export async function runDmTool(
  campaignId: string,
  userId: string,
  name: DmToolName,
  rawArgs: unknown,
): Promise<ToolResult> {
  const isSystemActor = userId === "dm";
  const campaign = isSystemActor ? { id: campaignId } : getCampaignForUser(campaignId, userId);
  if (!campaign) return { ok: false, message: "Kampania nie została znaleziona lub brak dostępu." };

  switch (name) {
    case "get_campaign_state": {
      const state = loadState(campaignId);
      return { ok: true, message: "Bieżący stan kampanii.", data: summarizeState(state) };
    }
    case "get_character": {
      const args = z.object({ characterId: z.string().min(1) }).safeParse(rawArgs);
      if (!args.success) return { ok: false, message: "Wymagany jest identyfikator postaci (characterId)." };
      const character = getCharacterById(args.data.characterId);
      if (!character) return { ok: false, message: "Nie znaleziono postaci." };
      return {
        ok: true,
        message: "Karta postaci.",
        data: { ...character, features: buildCharacterFeatures(character) },
      };
    }
    case "get_available_actions": {
      const args = z.object({ characterId: z.string().min(1) }).safeParse(rawArgs);
      if (!args.success) return { ok: false, message: "Wymagany jest identyfikator postaci (characterId)." };
      const character = getCharacterById(args.data.characterId);
      if (!character) return { ok: false, message: "Nie znaleziono postaci." };
      const state = loadState(campaignId);
      const suggestion = buildDmSuggestion(character, state);
      return {
        ok: true,
        message: "Akcje legalne dla tej postaci według silnika zasad.",
        data: suggestion,
      };
    }
    case "request_dice_roll": {
      const parsed = rollSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "Nieprawidłowy zapis kości." };
      try {
        const result = rollDiceNotation(parsed.data.notation);
        return {
          ok: true,
          message: `Wyrzucono ${parsed.data.notation}${parsed.data.reason ? ` (${parsed.data.reason})` : ""}: suma ${result.total} (rzuty: ${result.rolls.join(", ")}).`,
          data: result,
        };
      } catch {
        return { ok: false, message: "Nieprawidłowy zapis kości." };
      }
    }
    case "resolve_action": {
      const parsed = actionSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "Wymagane są characterId i action." };
      const character = getCharacterById(parsed.data.characterId);
      if (!character) return { ok: false, message: "Nie znaleziono postaci." };
      const state = loadState(campaignId);
      const actions = getAvailableActions(character, state);
      const legal = actions.find((a) => a.key === parsed.data.action || a.label === parsed.data.action);
      if (!legal) {
        return { ok: false, message: `Akcja "${parsed.data.action}" nie jest znana silnikowi zasad.` };
      }
      if (!legal.legal) {
        return { ok: false, message: `Akcja jest niedozwolona: ${legal.reason ?? "nieznany powód"}.` };
      }
      const roll = rollDiceNotation("1d20");
      return {
        ok: true,
        message: `Akcja "${legal.label}" jest dozwolona. Sugerowany rzut k20: ${roll.total} dla narracji; autorytatywne rozstrzygnięcie następuje przez endpointy walki i gry.`,
        data: { action: legal, suggestion: roll.total },
      };
    }
    case "advance_turn": {
      let state = loadState(campaignId);
      if (!state.combat.active) {
        return { ok: false, message: "Brak walki w toku; nie ma czego przesunąć." };
      }
      const before = new Map(
        state.combat.combatants.map((c) => [c.id, c.currentHp]),
      );
      state = nextTurn(state);
      saveState(campaignId, state);
      const current = currentTurnCombatant(state);
      const regenerated =
        current && before.has(current.id)
          ? Math.max(0, current.currentHp - before.get(current.id)!)
          : 0;
      pushEvent(campaignId, "turn.advanced", {
        turnIndex: state.combat.turnIndex,
        round: state.combat.round,
        turnOf: current ? { id: current.id, name: current.name } : null,
        ...(regenerated > 0 ? { regenerated } : {}),
      });
      return {
        ok: true,
        message: `Przesunięto do rundy ${state.combat.round}, tury ${state.combat.turnIndex + 1}. Teraz tura: ${current?.name}.`,
        data: current ? { name: current.name, id: current.id } : null,
      };
    }
    case "update_world_state": {
      const parsed = worldPatchSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "Aktualizacja może zawierać tylko location, scene, worldProgress lub notes." };
      }
      let state = loadState(campaignId);
      state = {
        ...state,
        ...(parsed.data.location !== undefined ? { location: parsed.data.location } : {}),
        ...(parsed.data.scene !== undefined ? { scene: parsed.data.scene } : {}),
        ...(parsed.data.worldProgress !== undefined ? { worldProgress: parsed.data.worldProgress } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      };
      state = saveState(campaignId, state);
      pushEvent(campaignId, "state.updated", { by: "dm", patch: parsed.data });
      return { ok: true, message: "Stan kampanii zaktualizowany.", data: summarizeState(state) };
    }
    case "start_adventure": {
      const parsed = z.object({ title: z.string().min(1).max(64) }).safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "Wymagany jest tytuł przygody (title)." };
      }
      const adventure = findAdventure(parsed.data.title);
      if (!adventure) {
        return {
          ok: false,
          message: `Nie znam tej przygody z biblioteki. Dostępne: ${ADVENTURES.map((a) => a.title).join(", ")}.`,
        };
      }
      const patch = buildAdventureState(adventure);
      let state = loadState(campaignId);
      state = {
        ...state,
        location: patch.location,
        scene: patch.scene,
        worldProgress: patch.worldProgress,
        notes: patch.notes,
      };
      state = saveState(campaignId, state);
      pushEvent(campaignId, "state.updated", { by: "dm", patch });
      return {
        ok: true,
        message: `Rozpoczynacie przygodę: ${adventure.title}. ${adventure.hook}`,
        data: summarizeState(state),
      };
    }
    case "create_adventure": {
      const parsed = z.object({ description: z.string().min(3).max(300) }).safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "Opisz przygodę w 3–300 znakach (description)." };
      }
      const description = parsed.data.description.trim();
      const progressLine =
        description.length <= 64
          ? `Nowa przygoda: ${description}`
          : `Nowa przygoda: ${description.slice(0, 40)}...`;
      const patch = {
        location: "Nieznane miejsce",
        scene: description,
        worldProgress: [progressLine],
        notes: description,
      };
      let state = loadState(campaignId);
      state = {
        ...state,
        location: patch.location,
        scene: patch.scene,
        worldProgress: patch.worldProgress,
        notes: patch.notes,
      };
      state = saveState(campaignId, state);
      pushEvent(campaignId, "state.updated", { by: "dm", patch });
      return {
        ok: true,
        message: `Tworzę nową przygodę na podstawie twojego opisu. ${description}`,
        data: summarizeState(state),
      };
    }
    case "generate_encounter": {
      const parsed = z.object({ description: z.string().max(300).optional() }).safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "description musi być krótkim tekstem." };
      const state0 = loadState(campaignId);
      if (state0.combat.active) {
        return { ok: false, message: "Walka już trwa." };
      }
      const party = getCampaignMembers(campaignId)
        .map((m) => getCharacterById(m.characterId))
        .filter((ch): ch is Character => Boolean(ch));
      if (party.length === 0) {
        return { ok: false, message: "Kampania nie ma jeszcze postaci." };
      }
      const description = parsed.data.description?.trim() || "a random encounter";
      const monsters = buildEncounter(description, party.length);
      const combatants = party.map((ch) => ({
        id: `char-${ch.id}`,
        name: ch.name,
        characterId: ch.id,
        isPlayer: true,
        maxHp: ch.maxHp,
        currentHp: ch.currentHp,
        armorClass: ch.armorClass,
        dexterity: ch.abilityScores.dexterity,
        exhaustionLevel: ch.exhaustion ?? 0,
      }));
      let state = startCombat(state0, [...combatants, ...monsters]);
      state = saveState(campaignId, state);
      pushEvent(campaignId, "encounter.started", {
        generated: true,
        description,
        combatants: state.combat.combatants.map((m) => ({ id: m.id, name: m.name, initiative: m.initiative })),
      });
      return {
        ok: true,
        message: `Walka rozpoczęta: ${monsters.map((m) => m.name).join(", ")}. Inicjatywa ustalona; opisz scenę i oddaj turę pierwszemu kombatantowi.`,
        data: summarizeState(state),
      };
    }
    case "random_encounter": {
      const parsed = z
        .object({
          terrain: z.string().max(32).optional(),
          description: z.string().max(100).optional(),
        })
        .safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "terrain i description muszą być krótkimi tekstami." };
      }
      const state0 = loadState(campaignId);
      if (state0.combat.active) {
        return { ok: false, message: "Walka już trwa." };
      }
      const party = getCampaignMembers(campaignId)
        .map((m) => getCharacterById(m.characterId))
        .filter((ch): ch is Character => Boolean(ch));
      if (party.length === 0) {
        return { ok: false, message: "Kampania nie ma jeszcze postaci." };
      }
      const level = Math.max(...party.map((ch) => ch.level));
      const monsters = randomEncounter(level, party.length, parsed.data.terrain);
      const combatants = party.map((ch) => ({
        id: `char-${ch.id}`,
        name: ch.name,
        characterId: ch.id,
        isPlayer: true,
        maxHp: ch.maxHp,
        currentHp: ch.currentHp,
        armorClass: ch.armorClass,
        dexterity: ch.abilityScores.dexterity,
        exhaustionLevel: ch.exhaustion ?? 0,
      }));
      let state = startCombat(state0, [...combatants, ...monsters]);
      state = saveState(campaignId, state);
      const description =
        parsed.data.description?.trim() || monsters.map((m) => m.name).join(", ");
      pushEvent(campaignId, "encounter.started", {
        generated: true,
        random: true,
        description,
        combatants: state.combat.combatants.map((m) => ({ id: m.id, name: m.name, initiative: m.initiative })),
      });
      return {
        ok: true,
        message: `Losowe spotkanie: ${monsters.map((m) => m.name).join(", ")} — walka się zaczyna.`,
        data: summarizeState(state),
      };
    }
    case "attack_combatant": {
      const parsed = z
        .object({
          attackerId: z.string().min(1),
          targetId: z.string().min(1),
          damageNotation: z.string().optional(),
          attackBonus: z.number().optional(),
          damageBonus: z.number().optional(),
          advantage: z.boolean().optional(),
          disadvantage: z.boolean().optional(),
          useInspiration: z.boolean().optional(),
        })
        .safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "Wymagane są attackerId i targetId." };
      const state = loadState(campaignId);
      const attacker = findCombatant(state, parsed.data.attackerId);
      if (!attacker) return { ok: false, message: "Nie znaleziono kombatanta." };
      const attackerCharacter = attacker.characterId
        ? getCharacterById(attacker.characterId)
        : undefined;
      const inspirationUsed =
        parsed.data.useInspiration === true && attackerCharacter?.inspiration === true;
      let { attackBonus, damageNotation, damageBonus } = parsed.data;
      if (attacker.characterId) {
        const character = getCharacterById(attacker.characterId);
        if (character) {
          const defaults =
            equippedWeaponAttackInput(character) ??
            characterAttackInput(attacker, character);
          attackBonus ??= defaults.attackBonus;
          damageNotation ??= defaults.damageNotation;
          damageBonus ??= defaults.damageBonus;
        }
      }
      const outcome = performAttack(state, parsed.data.attackerId, parsed.data.targetId, {
        attackBonus: attackBonus ?? 0,
        damageNotation: damageNotation ?? "1d6",
        damageBonus: damageBonus ?? 0,
        advantage: parsed.data.advantage || inspirationUsed,
        disadvantage: parsed.data.disadvantage,
      });
      if (!outcome.ok) return { ok: false, message: `${outcome.error}.` };
      if (outcome.target.characterId) {
        updateCharacterHp(outcome.target.characterId, outcome.target.currentHp);
      }
      if (inspirationUsed && attacker.characterId) {
        updateCharacterInspiration(attacker.characterId, false);
      }
      saveState(campaignId, outcome.state);
      pushEvent(campaignId, "action.resolved", {
        type: "attack",
        attacker: outcome.attacker.name,
        target: outcome.target.name,
        ...outcome.result,
        ...(inspirationUsed ? { inspirationUsed: true } : {}),
      });
      const hitMessage = outcome.result.hit
        ? `${outcome.attacker.name} trafia ${outcome.target.name} za ${outcome.result.damageTotal} obrażeń (atak ${outcome.result.attackTotal} vs AC ${outcome.target.armorClass}).${outcome.result.critical ? " Krytyk!" : ""}`
        : `${outcome.attacker.name} chybia ${outcome.target.name} (atak ${outcome.result.attackTotal} vs AC ${outcome.target.armorClass}).`;
      return {
        ok: true,
        message: `${hitMessage}${outcome.result.fumble ? " — pudło!" : ""}`,
        data: outcome.result,
      };
    }
    case "cast_spell": {
      const parsed = z
        .object({
          characterId: z.string().min(1),
          spellName: z.string().min(1),
          targetId: z.string().min(1),
          advantage: z.boolean().optional(),
          disadvantage: z.boolean().optional(),
          restoreMode: z.enum(["condition", "exhaustion"]).optional(),
        })
        .safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "Wymagane są characterId, spellName i targetId." };
      }
      const character = getCharacterById(parsed.data.characterId);
      if (!character) return { ok: false, message: "Nie znaleziono postaci." };
      const def = SPELLS[parsed.data.spellName];
      if (!def) {
        return {
          ok: false,
          message: `Zaklęcie "${parsed.data.spellName}" nie jest znane silnikowi zasad.`,
        };
      }
      if (def.effect.kind === "condition_apply" && !isConditionKey(def.effect.condition)) {
        return {
          ok: false,
          message: `Definicja zaklęcia używa nieznanego stanu "${def.effect.condition}".`,
        };
      }
      if (!character.spells?.includes(parsed.data.spellName)) {
        return { ok: false, message: "Postać nie zna tego zaklęcia." };
      }
      if (character.currentHp === 0) {
        return { ok: false, message: "Rzucający jest nieprzytomny i nie może rzucać." };
      }
      const state = loadState(campaignId);
      let casterCombatant: Combatant | undefined;
      let targetCombatant: Combatant | undefined;
      let targetCharacter: Character | undefined;
      if (state.combat.active) {
        casterCombatant = combatantByCharacter(state, character.id);
        const current = currentTurnCombatant(state);
        if (!casterCombatant || !current || current.id !== casterCombatant.id) {
          return { ok: false, message: "To nie tura tego kombatanta." };
        }
        if (!canAct(casterCombatant)) {
          return { ok: false, message: "Rzucający jest obezwładniony i nie może działać." };
        }
        if (def.effect.kind === "heal_all" && def.effect.castingTimeMinutes) {
          return {
            ok: false,
            message: `Ten rytuał trwa ${def.effect.castingTimeMinutes} minut — nie można go użyć w samym środku walki.`,
          };
        }
        targetCombatant = findCombatant(state, parsed.data.targetId);
        if (!targetCombatant) return { ok: false, message: "Nie znaleziono celu w walce." };
        if (def.effect.kind === "revive") {
          if (targetCombatant.status !== "dead") {
            return { ok: false, message: "Cel nie jest martwy." };
          }
        } else if (targetCombatant.status === "dead") {
          return { ok: false, message: "Cel jest martwy." };
        }
      } else {
        if (def.effect.kind === "damage") {
          return { ok: false, message: "Zaklęcia obrażeń wymagają aktywnej walki." };
        }
        if (def.effect.kind === "condition_apply") {
          return { ok: false, message: "Zaklęcia nakładające stany wymagają aktywnej walki." };
        }
        if (def.effect.kind === "stabilize") {
          return {
            ok: false,
            message: "Spare the Dying wymaga kombatanta z 0 HP w walce.",
          };
        }
        targetCharacter = getCharacterById(parsed.data.targetId);
        if (!targetCharacter) {
          return { ok: false, message: "Nie znaleziono postaci-celu." };
        }
      }
      const castingAbility = spellcastingAbility(character.className) ?? "wisdom";
      const mod = abilityModifier(character.abilityScores[castingAbility]);
      const prof = character.proficiencyBonus;
      const stats: SpellCasterStats = {
        spellAttackBonus: prof + mod,
        spellSaveDc: 8 + prof + mod,
        spellAbilityMod: mod,
      };
      let nextUsed: number[] | null = null;
      if (def.level > 0) {
        const max = spellSlotsForLevel(character.level)[def.level - 1] ?? 0;
        const used = character.spellSlotsUsed ?? [];
        if ((used[def.level - 1] ?? 0) >= max) {
          return { ok: false, message: `Brak slotów zaklęć na poziomie ${def.level}.` };
        }
        nextUsed = [...used];
        nextUsed[def.level - 1] = (nextUsed[def.level - 1] ?? 0) + 1;
      }
      if (def.effect.kind === "heal_all" && !state.combat.active) {
        const members = getCampaignMembers(campaignId)
          .map((m) => getCharacterById(m.characterId))
          .filter((ch): ch is Character => Boolean(ch));
        if (members.length === 0) {
          return { ok: false, message: "Nie znaleziono postaci-celu." };
        }
      }
      if (
        def.effect.kind === "restore" &&
        !state.combat.active &&
        parsed.data.restoreMode !== "exhaustion"
      ) {
        return { ok: false, message: "Stany dotyczą tylko walki." };
      }
      if (nextUsed) updateCharacterSpellSlots(character.id, nextUsed);
      if (def.effect.kind === "heal_all") {
        if (state.combat.active && casterCombatant) {
          const healed: { name: string; healed: number }[] = [];
          const combatants = state.combat.combatants.map((combatant) => {
            if (!combatant.isPlayer) return combatant;
            const perTarget = resolveSpellCast(def, stats, combatant);
            healed.push({ name: combatant.name, healed: perTarget.healed });
            if (combatant.characterId) {
              updateCharacterHp(combatant.characterId, perTarget.targetCurrentHp);
            }
            return {
              ...combatant,
              currentHp: perTarget.targetCurrentHp,
              status: perTarget.targetStatus,
            };
          });
          saveState(campaignId, {
            ...state,
            combat: { ...state.combat, combatants },
            updatedAt: new Date().toISOString(),
          });
          pushEvent(campaignId, "action.resolved", {
            type: "spell",
            spell: def.name,
            caster: casterCombatant.name,
            target: "party",
            healed,
          });
          return {
            ok: true,
            message: `${casterCombatant.name} rzuca ${def.name} — ${healed
              .map((h) => `${h.name} odzyskuje ${h.healed} punktów życia`)
              .join("; ")}.`,
            data: { healed },
          };
        }
        const members = getCampaignMembers(campaignId)
          .map((m) => getCharacterById(m.characterId))
          .filter((ch): ch is Character => Boolean(ch));
        const healed: { name: string; healed: number }[] = [];
        for (const member of members) {
          const synthetic: Combatant = {
            id: member.id,
            name: member.name,
            isPlayer: true,
            initiative: 0,
            currentHp: member.currentHp,
            maxHp: member.maxHp,
            armorClass: member.armorClass,
            status: member.currentHp > 0 ? "active" : "downed",
          };
          const perTarget = resolveSpellCast(def, stats, synthetic);
          updateCharacterHp(member.id, perTarget.targetCurrentHp);
          healed.push({ name: member.name, healed: perTarget.healed });
        }
        pushEvent(campaignId, "action.resolved", {
          type: "spell",
          spell: def.name,
          caster: character.name,
          target: "party",
          healed,
        });
        return {
          ok: true,
          message: `${character.name} rzuca ${def.name} — ${healed
            .map((h) => `${h.name} odzyskuje ${h.healed} punktów życia`)
            .join("; ")}.`,
          data: { healed },
        };
      }
      if (state.combat.active && casterCombatant && targetCombatant) {
        const mods = attackRollAdvantages(casterCombatant, targetCombatant);
        const result = resolveSpellCast(def, stats, targetCombatant, {
          advantage: mods.advantage || parsed.data.advantage,
          disadvantage: mods.disadvantage || parsed.data.disadvantage,
          restoreMode: parsed.data.restoreMode,
        });
        const concentrationApplied =
          "concentration" in def.effect && def.effect.concentration === true;
        const previousSpell = concentrationApplied
          ? casterCombatant.concentratingOn
          : undefined;
        const casterUpdated: Combatant | undefined = concentrationApplied
          ? {
              ...casterCombatant,
              concentratingOn: def.name,
              conSaveMod: abilityModifier(character.abilityScores.constitution),
            }
          : undefined;
        let updated: Combatant = {
          ...targetCombatant,
          currentHp: result.targetCurrentHp,
          status: result.targetStatus,
        };
        if (result.riderApplied) {
          updated = applySpellRider(updated, def) ?? updated;
        } else if (
          result.hit &&
          (targetCombatant.conditions ?? []).includes(GUIDING_BOLT_MARKER)
        ) {
          updated = {
            ...updated,
            conditions: (targetCombatant.conditions ?? []).filter(
              (c) => c !== GUIDING_BOLT_MARKER,
            ),
          };
        }
        if (result.conditionApplied) {
          const existing = updated.conditions ?? [];
          if (!existing.includes(result.conditionApplied)) {
            updated = { ...updated, conditions: [...existing, result.conditionApplied] };
          }
        } else if (result.conditionRemoved) {
          updated = {
            ...updated,
            conditions: (updated.conditions ?? []).filter(
              (c) => c !== result.conditionRemoved,
            ),
          };
        }
        if (result.revived) {
          updated = { ...updated, deathSaveSuccesses: 0, deathSaveFailures: 0 };
        }
        if (def.effect.kind === "restore") {
          if (result.restoredExhaustion) {
            updated = {
              ...updated,
              exhaustionLevel: Math.max(0, (updated.exhaustionLevel ?? 0) - 1),
            };
          } else if (result.restoredCondition) {
            updated = {
              ...updated,
              conditions: (updated.conditions ?? []).filter(
                (c) => c !== result.restoredCondition,
              ),
            };
          }
        }
        const combatants = state.combat.combatants.map((c) =>
          c.id === targetCombatant.id
            ? updated
            : c.id === casterCombatant.id && casterUpdated
              ? casterUpdated
              : c,
        );
        saveState(campaignId, {
          ...state,
          combat: { ...state.combat, combatants },
          updatedAt: new Date().toISOString(),
        });
        if (targetCombatant.characterId) {
          updateCharacterHp(targetCombatant.characterId, result.targetCurrentHp);
          if (def.effect.kind === "restore" && result.restoredExhaustion) {
            const targetCharacter = getCharacterById(targetCombatant.characterId);
            if (targetCharacter) {
              updateCharacterExhaustion(
                targetCharacter.id,
                Math.max(0, (targetCharacter.exhaustion ?? 0) - 1),
              );
            }
          }
        }
        pushEvent(campaignId, "action.resolved", {
          type: "spell",
          spell: def.name,
          caster: casterCombatant.name,
          target: targetCombatant.name,
          ...result,
          ...(concentrationApplied ? { concentration: true } : {}),
        });
        const message = spellNarration(
          def,
          casterCombatant.name,
          targetCombatant,
          result,
        );
        const concentrationNote = concentrationApplied
          ? previousSpell
            ? ` ${casterCombatant.name} kończy koncentrację na ${previousSpell} i zaczyna koncentrować się na ${def.name}.`
            : ` ${casterCombatant.name} zaczyna koncentrować się na zaklęciu ${def.name}.`
          : "";
        return { ok: true, message: `${message}${concentrationNote}`, data: result };
      }
      if (targetCharacter) {
        const synthetic: Combatant = {
          id: targetCharacter.id,
          name: targetCharacter.name,
          isPlayer: true,
          initiative: 0,
          currentHp: targetCharacter.currentHp,
          maxHp: targetCharacter.maxHp,
          armorClass: targetCharacter.armorClass,
          status: targetCharacter.currentHp > 0 ? "active" : "downed",
        };
        const result = resolveSpellCast(def, stats, synthetic, {
          restoreMode: parsed.data.restoreMode,
        });
        if (def.effect.kind === "revive") {
          if (targetCharacter.currentHp > 0) {
            return { ok: false, message: "Cel nie jest martwy." };
          }
          updateCharacterHp(
            targetCharacter.id,
            def.effect.fullHp ? targetCharacter.maxHp : 1,
          );
        } else if (def.effect.kind === "heal") {
          updateCharacterHp(targetCharacter.id, result.targetCurrentHp);
        } else if (def.effect.kind === "restore") {
          updateCharacterExhaustion(
            targetCharacter.id,
            Math.max(0, (targetCharacter.exhaustion ?? 0) - 1),
          );
        }
        pushEvent(campaignId, "action.resolved", {
          type: "spell",
          spell: def.name,
          caster: character.name,
          target: targetCharacter.name,
          ...result,
        });
        const message =
          def.effect.kind === "revive"
            ? `${character.name} rzuca ${def.name} na ${targetCharacter.name} — ${targetCharacter.name} wraca do życia z ${def.effect.fullHp ? "pełnym" : "1"} punktem życia.`
            : def.effect.kind === "condition_remove"
              ? `${character.name} rzuca ${def.name} na ${targetCharacter.name} — usuwa jeden stan (ślepota, głuchota, paraliż, trucizna itp.).`
              : def.effect.kind === "restore"
                ? `${character.name} rzuca ${def.name} na ${targetCharacter.name} — obniża wyczerpanie o 1.`
                : `${character.name} rzuca ${def.name} na ${targetCharacter.name} — leczy o ${result.healed} punktów życia.`;
        return {
          ok: true,
          message,
          data: result,
        };
      }
      return { ok: false, message: "Nie znaleziono celu." };
    }
    case "resolve_death_save": {
      const parsed = z.object({ combatantId: z.string().min(1) }).safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "Wymagany jest combatantId." };
      const state = loadState(campaignId);
      const outcome = performDeathSave(state, parsed.data.combatantId);
      if (!outcome.ok) return { ok: false, message: `${outcome.error}.` };
      if (outcome.combatant.characterId) {
        updateCharacterHp(outcome.combatant.characterId, outcome.combatant.currentHp);
      }
      saveState(campaignId, outcome.state);
      pushEvent(campaignId, "action.resolved", {
        type: "death-save",
        combatant: outcome.combatant.name,
        ...outcome.result,
      });
      const verdict = outcome.result.dead
        ? "umiera"
        : outcome.result.stable
          ? "stabilizuje się"
          : `rzut obronny: ${outcome.result.roll} (${outcome.result.successes} sukces, ${outcome.result.failures} porażek)`;
      return {
        ok: true,
        message: `${outcome.combatant.name} ${verdict}.`,
        data: outcome.result,
      };
    }
    case "take_long_rest": {
      z.object({ hours: z.number().optional() }).safeParse(rawArgs);
      const state0 = loadState(campaignId);
      if (state0.combat.active) {
        return { ok: false, message: "Nie można odpoczywać podczas walki." };
      }
      const healed: string[] = [];
      for (const member of getCampaignMembers(campaignId)) {
        const character = getCharacterById(member.characterId);
        if (!character) continue;
        updateCharacterHp(character.id, character.maxHp);
        updateCharacterSpellSlots(character.id, []);
        updateCharacterHitDice(
          character.id,
          Math.max(0, character.level - Math.max(1, Math.floor(character.level / 2))),
        );
        updateCharacterExhaustion(
          character.id,
          Math.max(0, (character.exhaustion ?? 0) - 1),
        );
        healed.push(character.name);
      }
      const state = {
        ...state0,
        phase: "exploration" as const,
        updatedAt: new Date().toISOString(),
      };
      saveState(campaignId, state);
      pushEvent(campaignId, "state.updated", { by: "dm", action: "long_rest", healed });
      return {
        ok: true,
        message:
          "Drużyna odpoczywa (długi odpoczynek): wszyscy odzyskują pełne HP, sloty zaklęć i połowę kości życia (minimum 1), a wyczerpanie każdego spada o 1 poziom (minimum 0).",
        data: summarizeState(state),
      };
    }
    case "take_short_rest": {
      const parsed = z
        .object({ hitDice: z.number().int().min(1).max(20).optional() })
        .safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "hitDice musi być liczbą całkowitą od 1 do 20." };
      }
      const state = loadState(campaignId);
      if (state.combat.active) {
        return { ok: false, message: "Nie można odpoczywać podczas walki." };
      }
      const healed: { name: string; healed: number; diceSpent: number }[] = [];
      for (const member of getCampaignMembers(campaignId)) {
        const character = getCharacterById(member.characterId);
        if (!character) continue;
        if (character.currentHp >= character.maxHp) continue;
        const available = character.level - (character.hitDiceUsed ?? 0);
        const spend = Math.min(parsed.data.hitDice ?? available, available);
        if (spend <= 0) continue;
        const conMod = abilityModifier(character.abilityScores.constitution);
        let total = 0;
        for (let i = 0; i < spend; i++) {
          const die = rollDiceNotation(`1d${hitDieForClass(character.className)}`).total;
          total += Math.max(1, die + conMod);
        }
        const newHp = Math.min(character.maxHp, character.currentHp + total);
        updateCharacterHp(character.id, newHp);
        updateCharacterHitDice(character.id, (character.hitDiceUsed ?? 0) + spend);
        healed.push({
          name: character.name,
          healed: newHp - character.currentHp,
          diceSpent: spend,
        });
      }
      pushEvent(campaignId, "action.resolved", { type: "short-rest", healed });
      if (healed.length === 0) {
        return {
          ok: true,
          message:
            "Krótki odpoczynek: nikt nie ma kości życia do wykorzystania (lub wszyscy są w pełni zdrowi).",
          data: summarizeState(state),
        };
      }
      return {
        ok: true,
        message: `Krótki odpoczynek: ${healed
          .map((h) => `${h.name} odzyskuje ${h.healed} punktów życia (spędzone kości: ${h.diceSpent})`)
          .join("; ")}.`,
        data: summarizeState(state),
      };
    }
    case "apply_condition": {
      const parsed = z
        .object({ combatantId: z.string().min(1), condition: z.string().min(1) })
        .safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "Wymagane są combatantId i condition." };
      }
      const state = loadState(campaignId);
      if (!state.combat.active) return { ok: false, message: "Brak walki w toku." };
      const combatant = findCombatant(state, parsed.data.combatantId);
      if (!combatant) return { ok: false, message: "Nie znaleziono kombatanta." };
      const { condition } = parsed.data;
      if (!isConditionKey(condition)) {
        return {
          ok: false,
          message: `Nieznany stan "${condition}". Dostępne stany: ${CONDITIONS.map(
            (c) => `${c.label} (${c.key})`,
          ).join(", ")}.`,
        };
      }
      const existing = combatant.conditions ?? [];
      const updated: Combatant = existing.includes(condition)
        ? combatant
        : { ...combatant, conditions: [...existing, condition] };
      const preventsActing =
        CONDITIONS.find((c) => c.key === condition)?.canAct === false;
      let finalUpdated = updated;
      let concentrationNote = "";
      if (preventsActing && updated.concentratingOn) {
        finalUpdated = { ...updated, concentratingOn: undefined };
        concentrationNote = " Koncentracja zostaje przerwana.";
      }
      const nextState: CampaignState = {
        ...state,
        combat: {
          ...state.combat,
          combatants: state.combat.combatants.map((c) =>
            c.id === combatant.id ? finalUpdated : c,
          ),
        },
        updatedAt: new Date().toISOString(),
      };
      saveState(campaignId, nextState);
      pushEvent(campaignId, "action.resolved", {
        type: "condition",
        action: "apply",
        combatant: combatant.name,
        condition,
      });
      const label = CONDITIONS.find((c) => c.key === condition)!.label;
      return {
        ok: true,
        message: `${combatant.name} otrzymuje stan: ${label}.${concentrationNote}`,
        data: summarizeState(nextState),
      };
    }
    case "remove_condition": {
      const parsed = z
        .object({ combatantId: z.string().min(1), condition: z.string().min(1) })
        .safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "Wymagane są combatantId i condition." };
      }
      const state = loadState(campaignId);
      if (!state.combat.active) return { ok: false, message: "Brak walki w toku." };
      const combatant = findCombatant(state, parsed.data.combatantId);
      if (!combatant) return { ok: false, message: "Nie znaleziono kombatanta." };
      const { condition } = parsed.data;
      if (!isConditionKey(condition) && condition !== GUIDING_BOLT_MARKER) {
        return { ok: false, message: `Nieznany stan "${condition}".` };
      }
      const existing = combatant.conditions ?? [];
      const updated: Combatant = existing.includes(condition)
        ? { ...combatant, conditions: existing.filter((c) => c !== condition) }
        : combatant;
      const nextState: CampaignState = {
        ...state,
        combat: {
          ...state.combat,
          combatants: state.combat.combatants.map((c) =>
            c.id === combatant.id ? updated : c,
          ),
        },
        updatedAt: new Date().toISOString(),
      };
      saveState(campaignId, nextState);
      pushEvent(campaignId, "action.resolved", {
        type: "condition",
        action: "remove",
        combatant: combatant.name,
        condition,
      });
      const label = CONDITIONS.find((c) => c.key === condition)?.label ?? condition;
      return {
        ok: true,
        message: `${combatant.name} traci stan: ${label}.`,
        data: summarizeState(nextState),
      };
    }
    case "set_exhaustion": {
      const parsed = z
        .object({
          characterId: z.string().min(1),
          level: z.number().int().min(0).max(6),
        })
        .safeParse(rawArgs);
      if (!parsed.success) {
        return {
          ok: false,
          message: "level musi być liczbą całkowitą od 0 do 6, a characterId jest wymagany.",
        };
      }
      const character = getCharacterById(parsed.data.characterId);
      if (!character) return { ok: false, message: "Nie znaleziono postaci." };
      updateCharacterExhaustion(character.id, parsed.data.level);
      pushEvent(campaignId, "action.resolved", {
        type: "exhaustion",
        characterId: character.id,
        level: parsed.data.level,
      });
      const message =
        parsed.data.level === 0
          ? `${character.name} odzyskuje pełnię sił (brak wyczerpania).`
          : `${character.name} ma teraz ${parsed.data.level} poziom(y) wyczerpania.`;
      return { ok: true, message };
    }
    case "stop_concentration": {
      const parsed = z.object({ combatantId: z.string().min(1) }).safeParse(rawArgs);
      if (!parsed.success) return { ok: false, message: "Wymagany jest combatantId." };
      const state = loadState(campaignId);
      if (!state.combat.active) return { ok: false, message: "Brak walki w toku." };
      const combatant = findCombatant(state, parsed.data.combatantId);
      if (!combatant) return { ok: false, message: "Nie znaleziono kombatanta." };
      if (!combatant.concentratingOn) {
        return {
          ok: false,
          message: `${combatant.name} nie koncentruje się na żadnym zaklęciu.`,
        };
      }
      const spell = combatant.concentratingOn;
      const updated: Combatant = { ...combatant, concentratingOn: undefined };
      const nextState: CampaignState = {
        ...state,
        combat: {
          ...state.combat,
          combatants: state.combat.combatants.map((c) =>
            c.id === combatant.id ? updated : c,
          ),
        },
        updatedAt: new Date().toISOString(),
      };
      saveState(campaignId, nextState);
      pushEvent(campaignId, "action.resolved", {
        type: "concentration",
        action: "stop",
        combatant: combatant.name,
        spell,
      });
      return {
        ok: true,
        message: `${combatant.name} przerywa koncentrację na zaklęciu ${spell}.`,
      };
    }
    case "set_inspiration": {
      const parsed = z
        .object({ characterId: z.string().min(1), has: z.boolean() })
        .safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "Wymagane są characterId i has (boolean)." };
      }
      const character = getCharacterById(parsed.data.characterId);
      if (!character) return { ok: false, message: "Nie znaleziono postaci." };
      updateCharacterInspiration(character.id, parsed.data.has);
      pushEvent(campaignId, "action.resolved", {
        type: "inspiration",
        characterId: character.id,
        has: parsed.data.has,
      });
      const message = parsed.data.has
        ? `${character.name} otrzymuje inspirację! (może uzyskać przewagę na jeden rzut)`
        : `Inspiracja ${character.name} wygasa.`;
      return { ok: true, message };
    }
    case "skill_check": {
      const parsed = skillCheckSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "Wymagane są characterId i skill." };
      }
      const character = getCharacterById(parsed.data.characterId);
      if (!character) return { ok: false, message: "Nie znaleziono postaci." };
      const skill = parsed.data.skill as SkillName;
      if (!SKILLS.some((s) => s.key === skill)) {
        return {
          ok: false,
          message: `Nieznana umiejętność: ${parsed.data.skill}. Dostępne: ${SKILLS.map(
            (s) => s.key,
          ).join(", ")}.`,
        };
      }
      const skillInfo = SKILLS.find((s) => s.key === skill)!;
      const mod =
        abilityModifier(character.abilityScores[skillInfo.ability]) +
        (character.skills?.[skill] ? proficiencyBonus(character.level) : 0);
      const inspirationUsed =
        parsed.data.useInspiration === true && character.inspiration === true;
      const advantage = parsed.data.advantage === true || inspirationUsed;
      const disadvantage = parsed.data.disadvantage === true;
      let roll: number;
      let rolls: number[];
      if (advantage && !disadvantage) {
        rolls = d(20, 2);
        roll = Math.max(rolls[0]!, rolls[1]!);
      } else if (disadvantage && !advantage) {
        rolls = d(20, 2);
        roll = Math.min(rolls[0]!, rolls[1]!);
      } else {
        roll = rollD20();
        rolls = [roll];
      }
      const dc = parsed.data.dc ?? 10;
      const total = roll + mod;
      const success = total >= dc;
      if (inspirationUsed) {
        updateCharacterInspiration(character.id, false);
      }
      const result = {
        type: "skill-check" as const,
        characterId: character.id,
        character: character.name,
        skill,
        roll,
        rolls,
        mod,
        dc,
        total,
        success,
        advantage,
        disadvantage,
        ...(inspirationUsed ? { inspirationUsed: true } : {}),
        ...(parsed.data.reason ? { reason: parsed.data.reason } : {}),
      };
      pushEvent(campaignId, "action.resolved", result);
      return {
        ok: true,
        message: `${character.name} testuje ${SKILL_LABELS[skill]}: rzut ${roll} + ${mod} = ${total} vs DC ${dc} — ${success ? "sukces!" : "porażka."}${
          parsed.data.reason ? ` (${parsed.data.reason})` : ""
        }`,
        data: result,
      };
    }
    case "use_item": {
      const parsed = useItemSchema.safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "Wymagane są characterId i itemId." };
      }
      const character = getCharacterById(parsed.data.characterId);
      if (!character) return { ok: false, message: "Nie znaleziono postaci." };
      const item = (character.inventory ?? []).find((i) => i.id === parsed.data.itemId);
      if (!item) return { ok: false, message: "Postać nie posiada tego przedmiotu." };
      if (!item.name.includes("Potion of Healing")) {
        return { ok: false, message: "Ten przedmiot nie ma jeszcze mechaniki użycia." };
      }
      const roll = rollDiceNotation(HEALING_POTION_DICE[item.name] ?? "2d4+2");
      const state = loadState(campaignId);
      let targetName: string;
      if (state.combat.active) {
        const targetCombatant = parsed.data.targetId
          ? findCombatant(state, parsed.data.targetId)
          : combatantByCharacter(state, character.id);
        if (!targetCombatant) {
          return { ok: false, message: "Nie znaleziono celu w walce." };
        }
        const targetHp = Math.min(
          targetCombatant.maxHp,
          targetCombatant.currentHp + roll.total,
        );
        const combatants = state.combat.combatants.map((c) =>
          c.id === targetCombatant.id
            ? {
                ...c,
                currentHp: targetHp,
                status: targetHp > 0 ? "active" : c.status ?? "downed",
              }
            : c,
        );
        saveState(campaignId, {
          ...state,
          combat: { ...state.combat, combatants },
          updatedAt: new Date().toISOString(),
        });
        if (targetCombatant.characterId) {
          updateCharacterHp(targetCombatant.characterId, targetHp);
        }
        targetName = targetCombatant.name;
      } else {
        const targetCharacter = parsed.data.targetId
          ? getCharacterById(parsed.data.targetId)
          : character;
        if (!targetCharacter) return { ok: false, message: "Nie znaleziono postaci-celu." };
        const targetHp = Math.min(
          targetCharacter.maxHp,
          targetCharacter.currentHp + roll.total,
        );
        updateCharacterHp(targetCharacter.id, targetHp);
        targetName = targetCharacter.name;
      }
      const updatedInventory = (character.inventory ?? [])
        .map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);
      updateCharacterInventory(character.id, updatedInventory);
      pushEvent(campaignId, "action.resolved", {
        type: "item-use",
        item: item.name,
        character: character.name,
        target: targetName,
        healed: roll.total,
        rolls: roll.rolls,
      });
      return {
        ok: true,
        message: `${character.name} pije ${item.name} — odzyskuje ${roll.total} punktów życia.`,
        data: {
          type: "item-use",
          item: item.name,
          character: character.name,
          target: targetName,
          healed: roll.total,
          rolls: roll.rolls,
        },
      };
    }
    case "end_combat": {
      let state = loadState(campaignId);
      if (!state.combat.active) return { ok: false, message: "Brak walki w toku." };
      const xpTotal = xpAwardForDeadEnemies(state.combat.combatants);
      for (const combatant of state.combat.combatants) {
        if (combatant.characterId) {
          updateCharacterHp(combatant.characterId, combatant.currentHp);
        }
      }
      state = endCombat(state);
      saveState(campaignId, state);
      pushEvent(campaignId, "combat.ended", {});
      const members = getCampaignMembers(campaignId)
        .map((m) => getCharacterById(m.characterId))
        .filter((ch): ch is Character => Boolean(ch));
      const levelUps: { characterId: string; name: string; level: number; className: string }[] = [];
      const levelUpLines: string[] = [];
      let xpLine = "";
      if (xpTotal > 0 && members.length > 0) {
        const share = Math.floor(xpTotal / members.length);
        for (const member of members) {
          const prevLevel = member.level;
          const { level } = grantXp(member.id, share);
          if (level > prevLevel) {
            levelUps.push({
              characterId: member.id,
              name: member.name,
              level,
              className: member.className,
            });
            levelUpLines.push(`${member.name} osiąga poziom ${level}!`);
          }
        }
        pushEvent(campaignId, "action.resolved", {
          type: "xp-award",
          source: "combat",
          total: xpTotal,
          perCharacter: share,
          levelUps,
        });
        xpLine = ` Drużyna zdobywa ${xpTotal} XP (${share} na osobę).${
          levelUpLines.length > 0 ? ` ${levelUpLines.join(" ")}` : ""
        }`;
      }
      return {
        ok: true,
        message: `Walka zakończona. Punkty życia zapisane na kartach postaci; drużyna wraca do eksploracji.${xpLine}`,
        data: summarizeState(state),
      };
    }
    case "award_xp": {
      const parsed = z
        .object({
          amount: z.number().int().positive().max(1_000_000),
          reason: z.string().max(200).optional(),
        })
        .safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "amount musi być dodatnią liczbą całkowitą." };
      }
      const members = getCampaignMembers(campaignId)
        .map((m) => getCharacterById(m.characterId))
        .filter((ch): ch is Character => Boolean(ch));
      if (members.length === 0) {
        return { ok: false, message: "Brak postaci w kampanii, którym można przyznać XP." };
      }
      const { amount, reason } = parsed.data;
      const share = Math.max(1, Math.floor(amount / members.length));
      const levelUps: { characterId: string; name: string; level: number; className: string }[] = [];
      const levelUpLines: string[] = [];
      for (const member of members) {
        const prevLevel = member.level;
        const { level } = grantXp(member.id, share);
        if (level > prevLevel) {
          levelUps.push({
            characterId: member.id,
            name: member.name,
            level,
            className: member.className,
          });
          levelUpLines.push(`${member.name} osiąga poziom ${level}!`);
        }
      }
      pushEvent(campaignId, "action.resolved", {
        type: "xp-award",
        source: "award_xp",
        amount,
        reason,
        perCharacter: share,
        levelUps,
      });
      return {
        ok: true,
        message: `Drużyna zdobywa ${amount} XP (${share} na osobę)${
          reason ? ` za ${reason}` : ""
        }.${levelUpLines.length > 0 ? ` ${levelUpLines.join(" ")}` : ""}`,
      };
    }
    case "grant_loot": {
      const parsed = z
        .object({
          characterId: z.string().optional(),
          gold: z.number().int().min(0).max(1_000_000).optional(),
          items: z
            .array(
              z.object({
                name: z.string().min(1).max(64),
                quantity: z.number().int().min(1).max(1000).default(1),
                weight: z.number().min(0).optional(),
                description: z.string().max(300).optional(),
                slot: z.string().optional(),
                attuned: z.boolean().optional(),
              }),
            )
            .max(20)
            .optional(),
        })
        .safeParse(rawArgs);
      if (!parsed.success) {
        return { ok: false, message: "grant_loot wymaga złota (gold) lub przedmiotów (items)." };
      }
      const { characterId, gold = 0, items = [] } = parsed.data;
      if (gold <= 0 && items.length === 0) {
        return { ok: false, message: "grant_loot wymaga złota (gold) lub przedmiotów (items)." };
      }
      for (const item of items) {
        if (item.slot !== undefined && !isSlotKey(item.slot)) {
          return {
            ok: false,
            message: `Nieznany slot ekwipunku: ${item.slot}. Dostępne sloty: ${EQUIPMENT_SLOTS.map(
              (s) => `${s.label} (${s.key})`,
            ).join(", ")}.`,
          };
        }
      }
      const members = getCampaignMembers(campaignId)
        .map((m) => getCharacterById(m.characterId))
        .filter((ch): ch is Character => Boolean(ch));
      if (members.length === 0) {
        return { ok: false, message: "Nie znaleziono postaci." };
      }
      if (!characterId) {
        const share = Math.floor(gold / members.length);
        for (const member of members) {
          if (share > 0) grantLoot(member.id, share, []);
        }
        if (items.length > 0) grantLoot(members[0]!.id, 0, items);
        pushEvent(campaignId, "action.resolved", {
          type: "loot",
          characterId: members[0]!.id,
          gold: share,
          items,
        });
        const message =
          share > 0
            ? `Każdy członek drużyny otrzymuje ${share} złota.${
                items.length > 0
                  ? ` Przedmioty trafiają do ${members[0]!.name}: ${items
                      .map((i) => `${i.quantity}× ${i.name}`)
                      .join(", ")}.`
                  : ""
              }`
            : `Nagroda: ${items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}.`;
        return { ok: true, message, data: { gold: share, items } };
      }
      const target = getCharacterById(characterId);
      if (!target) return { ok: false, message: "Nie znaleziono postaci." };
      grantLoot(target.id, gold, items);
      pushEvent(campaignId, "action.resolved", {
        type: "loot",
        characterId: target.id,
        gold,
        items,
      });
      return {
        ok: true,
        message: `Nagroda: ${gold} sztuk złota${
          items.length > 0
            ? ` oraz ${items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}`
            : ""
        }.`,
        data: { gold, items },
      };
    }
  }
}

function spellNarration(
  def: SpellDef,
  casterName: string,
  target: Combatant,
  result: SpellCastResult,
): string {
  if (def.effect.kind === "damage" && def.effect.attack) {
    if (result.hit) {
      return `${casterName} rzuca ${def.name} na ${target.name} — ${result.critical ? "krytyczne trafienie" : "trafienie"} za ${result.damageTotal} obrażeń (${def.effect.damageType}) (atak ${result.attackTotal} vs AC ${target.armorClass}).`;
    }
    return `${casterName} rzuca ${def.name} na ${target.name} — pudło (atak ${result.attackTotal} vs AC ${target.armorClass}).`;
  }
  if (def.effect.kind === "damage") {
    if (result.hit) {
      return `${casterName} rzuca ${def.name} na ${target.name} — nieudany rzut obronny (${result.saveTotal} vs ST ${result.saveDc}) za ${result.damageTotal} obrażeń (${def.effect.damageType}).`;
    }
    return `${casterName} rzuca ${def.name} na ${target.name} — udany rzut obronny (${result.saveTotal} vs ST ${result.saveDc}), brak obrażeń.`;
  }
  if (def.effect.kind === "heal" || def.effect.kind === "heal_all") {
    return `${casterName} rzuca ${def.name} na ${target.name} — leczy o ${result.healed} punktów życia.`;
  }
  if (def.effect.kind === "condition_apply") {
    const condition = def.effect.condition;
    const label =
      CONDITIONS.find((c) => c.key === condition)?.label ?? condition;
    if (result.hit) {
      return `${casterName} rzuca ${def.name} na ${target.name} — nieudany rzut obronny (${result.saveTotal} vs ST ${result.saveDc}); cel otrzymuje stan: ${label}.`;
    }
    return `${casterName} rzuca ${def.name} na ${target.name} — udany rzut obronny (${result.saveTotal} vs ST ${result.saveDc}), brak efektu.`;
  }
  if (def.effect.kind === "condition_remove") {
    if (result.conditionRemoved) {
      const label =
        CONDITIONS.find((c) => c.key === result.conditionRemoved)?.label ??
        result.conditionRemoved;
      return `${casterName} rzuca ${def.name} na ${target.name} — usuwa stan: ${label}.`;
    }
    return `${casterName} rzuca ${def.name} na ${target.name} — cel nie ma żadnych stanów do usunięcia.`;
  }
  if (def.effect.kind === "revive") {
    return `${casterName} rzuca ${def.name} na ${target.name} — ${target.name} wraca do życia z ${def.effect.fullHp ? "pełnym" : "1"} punktem życia.`;
  }
  if (def.effect.kind === "restore") {
    if (result.restoredExhaustion) {
      return `${casterName} rzuca ${def.name} na ${target.name} — obniża wyczerpanie o 1.`;
    }
    if (result.restoredCondition) {
      const label =
        CONDITIONS.find((c) => c.key === result.restoredCondition)?.label ??
        result.restoredCondition;
      return `${casterName} rzuca ${def.name} na ${target.name} — usuwa stan: ${label}.`;
    }
    return `${casterName} rzuca ${def.name} na ${target.name} — cel nie ma stanów do usunięcia.`;
  }
  return `${casterName} rzuca ${def.name} na ${target.name} — stabilizuje ${target.name}.`;
}

function summarizeState(state: CampaignState) {
  return {
    phase: state.phase,
    location: state.location,
    scene: state.scene,
    worldProgress: state.worldProgress,
    combat: state.combat.active
      ? {
          round: state.combat.round,
          turnIndex: state.combat.turnIndex,
          combatants: state.combat.combatants.map((c) => {
            const monster = MONSTERS.find((m) => c.id.startsWith(`${m.key}-`));
            return {
              id: c.id,
              name: c.name,
              hp: `${c.currentHp}/${c.maxHp}`,
              status: c.status ?? "active",
              attacks: monster?.attacks ?? 1,
              traits: c.traits ?? [],
              turn: c.id === currentTurnCombatant(state)?.id,
            };
          }),
        }
      : null,
    notes: state.notes,
  };
}

export function campaignCharacters(campaignId: string) {
  return getCampaignCharacters(campaignId);
}
