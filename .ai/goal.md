# Cel

AI DM prowadzi walkę przez silnik zasad. Dziś DM nie może przeprowadzić walki: `resolve_action` jest narracyjny ("authoritative resolution happens through the combat/game endpoints"), a ataki/śmierć/koniec walki są tylko w UI. DM musi móc adiudykować walkę narzędziami, z pełną walidacją silnika zasad.

## Kryteria ukończenia

1. `DM_TOOLS` zawiera `attack_combatant`, `resolve_death_save`, `end_combat`, działające przez `rules/combat.ts` + `saveState`/`pushEvent` (SSE propaguje live).
2. Walidacja identyczna z REST: atak tylko dla aktywnego combatanta, death save tylko dla downed, end_combat zapisuje HP do postaci. Wspólna logika wyciągnięta do `rules/combat.ts` (REST i DM używają tej samej implementacji — AI nie omija silnika).
3. System prompt (`llm.ts`) instruuje DM, aby rozstrzygał walkę narzędziami i nigdy nie wymyślał wyników rzutów/HP.
4. Preview mode (bez klucza LLM): walka grywalna w czacie — atak/koniec tury/death saves/koniec walki rozstrzygane rutyną.
5. Testy nowych narzędzi (mocked store + integracyjny z temp DB); bramki (typecheck/test/lint/build) zielone.

## Poza zakresem

- Zaklęcia, stany (conditions), inventory w walce — inna iteracja.
- UI poza istniejącym CombatPanel — wyniki idą przez czat DM + live state.
