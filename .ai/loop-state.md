# Loop state

## Runde
21 — WSZYSTKIE KIERUNKI ROADMAPY ZREALIZOWANE (524 testów)

## Cel
Pełny produkt D&D multiplayer (SRD 5.2.1, Baymard UX, PL) — roadmapa SRD domknięta.

## Wykonane zadania (ostatnie rundy)
- R19: reakcje (opportunity_attack), PL nazwy zaklęć (namePl ×20),
  sweep tłumaczeń serwera, mobile-first, PL/EN toggle
- R20: ruch/zasięg (position, reach 5/10/999, move_combatant),
  światło/darkvision (set_lighting, heavily obscured), akcje bonusowe
  (bonus_attack TWF, czary bonusowe konsumują), encumbrance (STR×15),
  Kupiec (Kup/Sprzedaj, priceGp), price w InventoryItem
- R21: przygoda przy tworzeniu kampanii (GET /api/adventures + seed
  stanu), LOBBY przed startem (state.started, POST /:id/start,
  lobby view z przyciskiem właściciela, SSE flips live), Plecak
  (niezałożone przedmioty w drawerze), ikony przedmiotów (lucide MIT
  — dndbeyond WotC odrzucone ze względów licencyjnych)

## Testy
PASS — 524 testy (16 plików), typecheck 3/3, lint, build.
Live: kampania z przygodą (scene z biblioteki, started:false) →
start → started:true → drugi start 400 "Kampania już trwa."

## Roadmapa SRD — WSZYSTKIE pozycje ✅
1 broń ✅ 2 feats/ASI ✅ 3 koncentracja ✅ 4 ekonomia (akcja/bonus/
reakcja) ✅ 5 cechy potworów ✅ 6 random encounters ✅ 7 inspiracja ✅
8 sklepy+mikstury+encumbrance ✅ 9 ruch/zasięg/OA ✅ 10 skill checks ✅
11 środowisko ✅ 12 światło/darkvision ✅ 13 mobile-first ✅
+ PL sweep ✅ + PL nazwy zaklęć ✅ + przygody przy tworzeniu ✅
+ lobby przed startem ✅ + ikony (lucide) ✅ + plecak w drawerze ✅

## Największa luka
brak — roadmapa domknięta. Przyszłe opcje (poza roadmapą):
- pełna mapa walki (grid/tokeny) zamiast abstrakcyjnych pozycji
- Mastery (weapon mastery 2024), exhaustion pełne (6 poziomów z UI),
  monster spellcasters, dźwięki środowiskowe, tryb offline/PWA

## Odrzucone podejścia
- Ikony z dndbeyond.com — WotC materiały zastrzeżone (nie CC-BY);
  zamiast tego lucide (MIT). Opcja: game-icons.net (CC BY 3.0)
- Pełny grid walki — odłożony (abstrakcyjne pozycje wystarczają)
