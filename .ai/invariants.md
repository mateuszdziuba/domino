# Inwarianty

1. `apps/server/src/campaign/store.ts` pozostaje jedynym miejscem persystencji stanu kampanii i emisji `game_events` — nie omijać go.
2. Silnik zasad (`apps/server/src/rules/`) jest autorytatywny — serwer waliduje akcje (ataki tylko w turze aktywnego combatanta), klient jedynie wyświetla.
3. Wspólne typy `packages/shared/src/types.ts` muszą pozostać w sync; po zmianie uruchom `pnpm typecheck`.
4. SSO/SSE nie może być jedynym źródłem prawdy — REST pozostaje autorytatywny; SSE to powiadomienia, nie mutacje.
5. SRD 5.2.1 jest źródłem reguł; nie dodawać reguł spoza SRD.
6. Bezpieczeństwo: tylko członek kampanii może subskrybować jej strumień.
