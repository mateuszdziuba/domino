# Wdrażanie DoMinoAI

Jeden proces Node serwuje API (`/api/*`), obrazy (`/static/*`) i gotowy frontend (SPA).
Migracje bazy wykonują się automatycznie przy starcie w trybie produkcyjnym.

## Wymagania

- Node.js ≥ 22 (testowane na 24)
- pnpm ≥ 10
- Dysk trwały na SQLite (`data/domino.db`) — **ważne**: wybierz hosting z trwałym
  dyskiem (VPS, Railway z volume, Fly.io z volume). Render free tier NIE ma
  trwałego dysku — baza ginie przy restarcie.

## Zmienne środowiskowe

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `PORT` | `3001` | Port HTTP |
| `DATABASE_URL` | `apps/server/data/domino.db` | Ścieżka do pliku SQLite |
| `WEB_ORIGIN` | `http://localhost:5173` | CORS origin (w prod ustaw adres aplikacji) |
| `DM_PROVIDER` | `deepseek` | `deepseek` \| `groq` \| `ollama` \| `openrouter` |
| `DEEPSEEK_API_KEY` | — | Klucz DM (jeśli DM_PROVIDER=deepseek) |
| `DM_MODEL` | `deepseek-v4-flash` | Model DM |
| `IMAGE_PROVIDER` | `pollinations` | `pollinations` (bez klucza) \| `gemini` \| `off` |
| `GEMINI_API_KEY` | — | Klucz obrazków (jeśli IMAGE_PROVIDER=gemini) |

## Opcja A — Railway (najprostsza z trwałym dyskiem)

1. `railway init` w repo, wybierz Dockerfile.
2. Dodaj Volume o ścieżce `/app/apps/server/data` (trwała baza).
3. Ustaw zmienne: `PORT=3001`, `WEB_ORIGIN=https://<twoja-domena>`,
   `DEEPSEEK_API_KEY=...` (opcjonalnie).
4. `railway up` — gotowe.

## Opcja B — VPS / dowolny hosting z Dockerem

```bash
docker build -t domino .
docker run -d --name domino -p 3001:3001 \
  -e PORT=3001 \
  -e WEB_ORIGIN=https://twoja-domena.pl \
  -e DEEPSEEK_API_KEY=... \
  -v domino-data:/app/apps/server/data \
  domino
```

## Opcja C — bez Dockera (VPS z Node)

```bash
pnpm install --frozen-lockfile
pnpm build
cd apps/server
NODE_ENV=production PORT=3001 WEB_ORIGIN=https://twoja-domena.pl node --env-file-if-exists=.env dist/index.js
```

## Weryfikacja po wdrożeniu

```bash
curl https://twoja-domena.pl/api/health          # {"ok":true,"service":"domino-server"}
curl https://twoja-domena.pl/                     # index.html aplikacji
```

## Uwagi

- SQLite + wiele replik: **uruchamiaj dokładnie jedną instancję** (SQLite nie
  znosi zapisów z wielu procesów). Railway: skaluj do 1.
- Przy pierwszym starcie migracje wykonają się automatycznie; konto demo
  (`demo`/`demo1234`) utworzysz przez `pnpm --filter @domino/server db:seed`
  (lokalnie przed wdrożeniem — seed na żywej bazie przez `node` w kontenerze).
- Obrazy generowane są do `data/images` — leżą w volume razem z bazą.
