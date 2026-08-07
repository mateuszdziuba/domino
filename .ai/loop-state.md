# Loop state

## Runde
5 — MVP GOTOWE (5 celów, każdy z critic PASS)

## Cel (ost.)
SRD advancement — XP, leveling, nagrody (ukończone).

## Wykonane zadania
- R1 cel #1 SSE real-time: hub, stream, chat.message, join fix — PASS
- R2 cel #2 DM combat: performAttack/DeathSave, attack_combatant/
  resolve_death_save/end_combat, prompt, preview combat, fixy SRD — PASS
- R3 cel #3 death & recovery: lethal damage, stable, take_long_rest,
  gating actions, trigger fixes — PASS
- R4 cel #4 spellcasting v1: spells.ts (6 SRD zaklęć), sloty (migracja
  0001), cast_spell, preview 'I cast X', sloty w arkuszu, nazwy postaci — PASS
- R5 cel #5 advancement: XP_BY_CR/progi/hit die, Combatant.cr,
  XP za pokonanych (REST+DM identycznie), award_xp, auto level-up,
  pasek XP w arkuszu (migracja 0002) — PASS

## Testy
PASS — 156 testów (11 plików), typecheck 3/3, lint, build.
Live E2E: SSE 2 graczy, pełna walka w czacie, death saves, rest, cast,
sloty, XP (integracja temp DB), nazwy postaci w czacie/Party.

## Critic
PASS we wszystkich rundach (po korektach: duplikat wiadomości, downed-loop,
shadowing triggerów).

## Największa luka
brak — MVP spójny: auth → postacie → kampanie → czat → walka (REST+DM+preview)
→ śmierć/leczenie → rest → zaklęcia → XP/poziomy; bez klucza LLM działa
preview mode.

## Kandydaci na kolejne iteracje (wymagają decyzji użytkownika)
- Short rest / Hit Dice (SRD)
- Więcej zaklęć (poziom 2+), buffy (Bless/Bane), concentration
- Conditions (poisoned, frightened...), advantage/disadvantage w dice
- Loot/przedmioty w walce, multiattack potworów
- Invites/role graczy, podgląd HP party

## Odrzucone podejścia
- Spells jako prompt — odrzucone (inwariant: rules engine)
- Buffy w v1 — odrzucone (brak mechaniki, na później)
- Replay SSE z id: — odrzucone (resync przez load() na connected)
- XP jako czysty prompt — odrzucone (tabele SRD w silniku)
