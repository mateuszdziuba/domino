# Loop state

## Runde
18 — roadmapa SRD: 9/12 kierunków zrealizowanych (465 testów)

## Cel
Pełny produkt D&D multiplayer (SRD 5.2.1, Baymard UX, PL) + realizacja roadmapy SRD.

## Wykonane zadania (ostatnie rundy)
- R16: karta postaci w czacie (CharacterDrawer), roadmapa SRD
- R17: cechy klasowe 4-20 + ASI + Feats (39 featów, LevelUpDialog z
  ASI +2/+1+1 lub feat, migracja 0009); broń SRD (36) + ataki z
  ekwipunku; koncentracja (CON save) + inspiracja (migracja 0008)
- R18: cechy potworów (pack_tactics, undead_fortitude, regeneration,
  web, paralyzing_touch) + random_encounter (budżet CR); skill_check
  framework + mikstury (use_item); budżet akcji ataku (1/turę,
  Extra Attack, Multiattack, bonus-action spells); hazardy
  środowiskowe (upadek/duszenie)
- Fix: port 3101 (konflikt docvue 3001) + vite loadEnv proxy

## Testy
PASS — 465 testów (16 plików), typecheck 3/3, lint, build, 2x stabilne.

## Roadmapa SRD 5.2.1 — status
1. ✅ Broń + właściwości (36 broni, finesse/versatile/thrown, ataki z ekwipunku)
2. ✅ Cechy 4-20 + ASI + Feats (39 featów, dialog wyboru)
3. ✅ Koncentracja (CON save DC 10/half, 0 HP, stop tool) + inspiracja
4. ✅ Budżet akcji ataku (1/turę, Extra Attack 5+/11/20, Multiattack,
   bonus-action spells) — pełna ekonomia (bonus/reakcja/ruch) zostaje
5. ✅ Cechy potworów (Pack Tactics, Undead Fortitude, Regeneration,
   Web, Paralyzing Touch)
6. ✅ Tabele losowych spotkań (random_encounter, budżet CR, teren)
7. ✅ Inspiracja
8. ✅ Mikstury (4 poziomy, konsumpcja) — sklepy/encumbrance zostają
9. ⬜ Ruch/zasięg/ataki okazyjne (duża zmiana silnika — wymaga tokenów/pola)
10. ✅ Framework testów umiejętności (skill_check: DC, adv/disadv, inspiracja)
11. ✅ Środowisko (upadek 1k6/10ft max 20k6 + prone, duszenie 1+CON mod)
12. ⬜ Widzenie/światło (Darkvision mechanicznie — wymaga ruchu/oświetlenia)

## Największa luka
- #9 ruch/zasięg/ataki okazyjne + #12 światło (wymagają wspólnego
  fundamentu: pozycje na polu walki) — największy przyszły kierunek
- #4 pełna ekonomia (akcja bonusowa/reakcja per combatant)
- #8 pełne sklepy + encumbrance (STR×15)

## Odrzucone podejścia
- Mastery (weapon mastery) — odłożone
- Pełna ekwipunkowa walidacja atunementu po stronie serwera — UI-only
- PDF SRD nieczytelny dla modelu — dane wg znajomości SRD 5.2.1,
  PDF jako źródło weryfikacji (AGENTS.md)
