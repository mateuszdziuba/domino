# Cel

Polski DM + ukryte HP + animacje rzutów + sugerowane akcje:

1. **DM mówi po polsku**: SYSTEM_PROMPT (narracja pl-PL, nigdy nie zdradzać liczbowego HP wrogów — opisywać rany: "ranny", "ledwo stoi"), preview + wiadomości narzędzi po polsku, polskie triggery (atak/odpoczynek/koniec tury/czary), polskie tagi potworów (gobliny→goblin itd.).
2. **HP wrogów niewidoczne**: CombatPanel nie renderuje HP/paska dla nie-graczy; prompt zakazuje liczb HP w narracji.
3. **Animacja rzutów w czacie**: SSE `action.resolved` → baner rzutu (kostka, wynik, Trafienie/Pudło/Krytyk/Rzut obronny), CSS animation, auto-znikanie.
4. **Sugerowane akcje nad czatem**: klikalne chipy z legalnych akcji gracza (dm-suggestion), klik → wypełnia input polską frazą.

## Kryteria ukończenia

1. Wszystkie narracje DM (LLM + preview + tool messages) po polsku; testy zaktualizowane.
2. HP wrogów nigdzie w UI; LLM opisuje rany słownie (prompt).
3. Baner rzutu animowany, po polsku, dla każdego action.resolved (atak/śmierć/czar).
4. Chipy nad inputem czatu (tylko legalne akcje), polskie frazy; labelki akcji po polsku w rules/actions.ts.
5. Bramki zielone (typecheck/test/lint/build).

## Poza zakresem

- Polskie komunikaty błędów REST (developer-facing) — osobna iteracja.
- Loot, short rest, więcej zaklęć — osobne iteracje.
