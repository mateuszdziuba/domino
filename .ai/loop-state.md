# Loop state

## Runde
1

## Cel
Real-time combat: SSE dla walki, czatu DM i stanu kampanii; klient aktualizuje UI bez refreshu.

## Wykonane zadania
- R1: Hub pub/sub w pamięci (`apps/server/src/campaign/hub.ts`) + testy (4).
- R1: `store.ts` — `saveState`/`pushEvent` broadcastują do subskrybentów (jedyny punkt emisji, inwariant 1 zachowany).
- R1: Endpoint `GET /api/campaigns/:id/stream` (SSE, requireAuth, heartbeat 15s, cleanup na abort).
- R1: Nowy typ eventu `chat.message` + `ServerStreamEvent` w `packages/shared`.
- R1: Klient — `apps/web/src/lib/stream.ts` (EventSource, dedupe, reconnect), integracja w CampaignPage + wskaźnik Live/Connecting/Offline.
- R1: Fix pre-existing bug: `POST /:id/join` zwracał 404 dla nowych użytkowników (getCampaignForUser filtrował nie-członków) — blokował multiplayer.
- R2 (po critic FAIL): dedupe wiadomości w `onSend` (nadawca dostawał swoją wiadomość 2×), odświeżanie dm-suggestion na `state.updated`, reload Party na `character.joined`.

## Testy
PASS — typecheck 3/3, 45 testów (6 plików, w tym hub.test.ts), lint 3/3, build OK.
E2E: 2 klienty SSE otrzymały identyczne eventy (state.updated, turn.advanced, chat.message×2, encounter.started); negatywy: nie-członek 404, bez ciasteczka 401.

## Critic
PASS (runa 2). Runa 1: FAIL — duplikacja własnych wiadomości u nadawcy (SSE emitowane przed await dmNarrate). Naprawione dedupe per-id.

## Największa luka
brak (po poprawkach)

## Odrzucone podejścia
- WS/WebSocket — SSE wystarcza (jednokierunkowy stream, REST pozostaje autorytatywny, zero dependency).
- Replay eventów z `id:` w SSE — zamiast tego resync przez `load()` na `connected` (prościej, spójne z REST).
- Broadcast z poszczególnych route'ów — odrzucone na rzecz broadcastu z `saveState`/`pushEvent` (jeden punkt emisji, pokrywa też mutacje DM tools).
