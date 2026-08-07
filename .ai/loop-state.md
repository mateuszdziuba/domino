# Loop state

## Runde
12 — PEŁNY PRODUKT (wszystkie cele spełnione, critic PASS)

## Cel
Pełny produkt D&D multiplayer z AI DM (SRD 5.2.1, Baymard UX, PL).

## Wykonane zadania (12 rund)
1. SSE real-time (hub, stream, chat.message, join fix)
2. DM combat przez silnik zasad (performAttack/DeathSave, attack_combatant/
   resolve_death_save/end_combat, prompt, preview, fixy SRD)
3. Death & recovery (lethal damage, stable, long rest)
4. Spellcasting v1 (6 zaklęć, sloty, cast_spell)
5. Advancement (XP za CR, auto level-up, award_xp)
6. Polski DM + ukryte HP wrogów + animacje rzutów + sugerowane akcje
7. Zaproszenia (invite codes, /join), biblioteka przygód 5e, typografia
8. Cechy rasowe/klasowe/subklasy (SRD) + tooltips + DM XP
9. Tooltips w czacie, dialog wyboru subklasy, modyfikacja czarów
10. Dymek DM myśli, rzuty utrwalane w czacie, bogate opisy czarów/skilli
11. Przewaga/utrudnienie, stany (10 SRD), krótki odpoczynek (HD)
12. Zaklęcia 2-3 (stany, party heal, Revivify), grant_loot, widok drużyny,
    świat kampanii, multiattack, onboarding, fixy critic (canAct,
    rytuał PoH, HD przy pełnym HP)

## Testy
PASS — 291 testów (14 plików), typecheck 3/3, lint, build.
E2E capstone: rejestracja → postać → kampania → zaproszenie → join po
kodzie → wspólny czat z LLM DM (po polsku, przygoda z biblioteki).

## Critic
PASS (po korektach: join security, cast_spell incapacitated, PoH rytuał,
HD full-HP, Revivify death saves, heal_all slot order)

## Największa luka
brak — pełny produkt: auth+invites, real-time, polski DM (LLM+preview),
SRD combat (adv/disadv, stany, death saves), rest (short/long), 12 zaklęć
(0-3 lvl), XP/leveling+subklasy, przygody (biblioteka+custom), łupy/złoto,
drużyna (HP party), świat kampanii, onboarding, tooltips, czytelność.

## Przyszłe kierunki (poza obecnym zakresem)
- Zaklęcia 4-9 poziomu, exhaustion (6 poziomów), monster spellcasters
- Sounds/audio, głębszy mobile polish, więcej przygód w bibliotece
- Metodyczne: auto-crit w zwarciu (paralyzed/unconscious), modyfikatory
  rzutów obronnych celów (obecnie +0)

## Odrzucone podejścia
- better-auth jako zamiennik auth — odrzucone (istniejący auth + invite
  codes spełniają potrzebę; wymiana systemu = ryzyko regresji)
- Wyliczanie przewagi w UI z samych rzutów — brak rozróżnienia adv/disadv
  w payload (pozostawione flagom narzędzi)
