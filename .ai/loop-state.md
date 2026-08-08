# Loop state

## Runde
16 — PEŁNY PRODUKT + kierunki SRD w realizacji (392 testów)

## Cel
Pełny produkt D&D multiplayer (SRD 5.2.1, Baymard UX, PL) + roadmapa kierunków SRD.

## Wykonane zadania (wybrane rundy)
- R1-12: pełny produkt (SSE, DM combat, death/recovery, spells, XP,
  polski DM, zaproszenia, przygody, cechy/subklasy, czat-tooltips,
  przewaga/stany/short rest, spells 2-5, ekwipunek, świat, multiattack)
- R13: spells 3-5 + exhaustion (migracja 0007); R14: ekwipunek sloty +
  SRD gear (54); R15: 3 przygody + dźwięki; R15b: spells 6-9 + auto-kryt
- R16a: critic fixes (auto-kryt tylko hit, Blade Barrier 6k10 tnące,
  Resurrection fullHp, natural 1 = pudło, restore sync)
- R16b: karta postaci w czacie (CharacterDrawer)
- R16c: ROADMAPA SRD — kierunek #1 broń (36 broni, ataki z ekwipunku),
  #3 koncentracja (CON save DC 10/half, 0 HP, zastępowanie, stop tool),
  #7 inspiracja (set_inspiration, useInspiration, ✦ UI) — migracja 0008

## Testy
PASS — 392 testy (16 plików), typecheck 3/3, lint, build.
E2E: broń live (Dagger→Longsword 1d10+2), karta postaci w czacie.

## Critic
PASS (po korektach partii kierunków)

## Roadmapa SRD 5.2.1 (kierunki rozwoju — priorytet)
1. ✅ Broń + właściwości (36 broni, finesse/versatile/thrown, ataki z ekwipunku)
2. ⬜ Cechy klasowe 4-20 + ASI + Feats (~40 featów SRD, dialog wyboru)
3. ✅ Koncentracja + rytuały (koncentracja; rytuały zostają)
4. ⬜ Ekonomia akcji (akcja/bonus/reakcja, two-weapon fighting)
5. ⬜ Cechy potworów (Pack Tactics, Regeneration, Undead Fortitude)
6. ⬜ Tabele losowych spotkań + budżet CR
7. ✅ Inspiracja
8. ⬜ Sklepy/konsumables (mikstury), encumbrance (STR)
9. ⬜ Ruch/zasięg/ataki okazyjne (duża zmiana silnika)
10. ⬜ Framework testów umiejętności (DC, przewaga na checkach)
11. ⬜ Środowisko (upadek, duszenie, głód)
12. ⬜ Widzenie/światło (Darkvision mechanicznie)

## Największa luka
brak (pełny produkt); roadmapa SRD w toku (#2, #4-6, #8-12 do zrobienia)

## Odrzucone podejścia
- Mastery (weapon mastery 2024) — odłożone (złożone, niska pilność)
- Save profs klasy w conSaveMod — uproszczone do modyfikatora Kondycji
- PDF SRD nieczytelny dla modelu — dane wg znajomości SRD 5.2.1,
  PDF jako źródło weryfikacji (AGENTS.md)
