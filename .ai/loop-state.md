# Loop state

## Runde
4 (cel #2: AI DM combat — PASS; cel #3: death & recovery — PASS)

## Cel
SRD spellcasting v1: silnik zaklęć, sloty, cast_spell, preview "I cast X", sloty w arkuszu, nazwy postaci w czacie/Party.

## Wykonane zadania
- R1 (cel #1 SSE): hub, stream, chat.message, join fix — PASS
- R2 (cel #2 DM combat): performAttack/DeathSave/characterAttackInput,
  attack_combatant/resolve_death_save/end_combat, prompt, preview combat,
  fixy SRD (incapacitated, HP persist, PATCH hp) — PASS
- R3 (cel #3 death & recovery): lethal damage, stable status, take_long_rest,
  gating actions, trigger fixes — PASS (109 testów)
- R4 (cel #4 w toku): kontrakt (Character.spellSlotsUsed, CharacterSheet.spellSlots,
  CampaignMember.characterName), schema + migracja 0001, cast_spell w DM_TOOLS

## Testy
PASS — 109 testów (typecheck 3/3, lint, build) przed rundą 4.

## Critic
PASS (r2/r3 po korektach)

## Największa luka
- (r4) brak silnika zaklęć — kleryk nie może rzucać w silniku

## Odrzucone podejścia
- Spells jako czysty prompt — odrzucone: musi iść przez rules engine (inwariant)
- Bless/Bane w v1 — odrzucone: brak mechaniki buffów, zostawione na później
