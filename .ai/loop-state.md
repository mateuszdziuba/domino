# Loop state

## Runde
19 — roadmapa SRD: 10/13 kierunków (481 testów)

## Cel
Pełny produkt D&D multiplayer (SRD 5.2.1, Baymard UX, PL) + roadmapa SRD + mobile-first.

## Wykonane zadania (ostatnie rundy)
- R18: cechy potworów, random_encounter, skill_check, mikstury,
  budżet akcji ataku, hazardy środowiskowe; fix port 3101 (docvue)
- R19: reakcje (opportunity_attack, reactionAvailable raz na rundę),
  polskie nazwy zaklęć (namePl ×20, findSpellByName EN/PL, cast_spell
  toleruje PL), pełny sweep tłumaczeń serwera (auth/characters/
  campaigns/combat + rules), mobile-first (#13: iOS zoom fix, touch
  targets, full-width mobile controls, safe-area), PL/EN toggle zaklęć

## Testy
PASS — 481 testów (16 plików), typecheck 3/3, lint, build, 2x stabilne.
Live: PL błędy REST ("Nie znaleziono postaci.", "Nieprawidłowa nazwa
użytkownika lub hasło.", "Brak walki w toku."), namePl w /api/spells.

## Roadmapa SRD — status (13 pozycji)
1-3,5-7,10-11 ✅ | 4 ✅ (budżet ataku; pełna ekonomia bonus/reakcja/ruch ⬜) |
8 ✅ (mikstury; sklepy/encumbrance ⬜) | 9 ⬜ ruch/zasięg/ataki okazyjne
(wymaga pozycji/pola) | 12 ⬜ światło/widzenie (z ruchem) |
13 ✅ mobile-first | + PL sweep ✅ | + PL nazwy zaklęć ✅

## Największa luka
- #9 ruch/zasięg + #12 światło — wspólny fundament (pozycje na polu
  walki) — największy przyszły kierunek
- #4 pełna ekonomia (bonus actions per combatant), #8 sklepy +
  encumbrance (STR×15)

## Odrzucone podejścia
- Mastery (weapon mastery) — odłożone
- PDF SRD nieczytelny dla modelu — dane wg znajomości SRD 5.2.1
