# Loop state

## Runde
23 — turn-gating czatu + portrety AI działające (589 testów)

## Cel
Pełny produkt D&D multiplayer (SRD 5.2.1, Baymard UX, PL) — pętla ciągła.

## Wykonane zadania (ostatnie rundy)
- R21-22: AI obrazki (Pollinations/Gemini, /static, portrety), Weapon
  Mastery 5.2.1 + ruch/exhaustion pełne, monster casters, drawer v2
- R23: TURN-GATING CZATU — podczas walki tylko gracz aktywnej tury i
  DM mogą pisać (403 "To nie Twoja tura..."), UI blokuje input z
  placeholderem "Czekaj na swoją turę (teraz: X)", prompt woła graczy
  po kolei; fixy critic v2 (instant death >= wg OCR PDF, Priest DC 13,
  Acolyte +4/1d6+2, proxy /static, CharacterSummary.portraitUrl,
  gitignore images, sap/vex konsystencja, wygasanie markerów)

## Testy
PASS — 589 testów (17 plików), typecheck 3/3, lint, build.
Live: turn-gating 403 dla nieaktywnego gracza / DM pisze; portrety
200 przez 5173 i 3101; generateImage działa (Pollinations).

## Największa luka
brak — aplikacja kompletna; turn-gating domyka flow wieloosobowe.

## Przyszłe kierunki
- Dźwięki środowiskowe (już: dice/message), PWA/offline
- Pełny grid walki (tokeny/mapa) zamiast abstrakcyjnych pozycji
- Więcej przygód w bibliotece, więcej zaklęć (poza Cleric)
- Exhaustion pełny przepływ UI (mechanika gotowa)
