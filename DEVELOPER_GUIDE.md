# Developer Guide (MailMint Email Validation API)

This guide is for maintainers/operators. For client-facing usage, see `CLIENT_GUIDE.md`.

## Stack
- Node.js + Express (app entry: `src/server.js`, app definition: `src/app.js`)
- Postgres (via `pg`)
- DNS lookups via `dns.resolveMx`
- Disposable domains fetched from GitHub with 24h caching; optional disk cache + override

## Getting Started
```bash
pnpm install
node src/scripts/migrate.js   # create tables
node src/scripts/createTestApiKey.js   # seed a user + API key
pnpm run dev
```
Base URL: `http://localhost:8000`

## Environment
See `.env.example` for full list. Key vars:
- `DATABASE_URL` (required)
- `PORT` (default 8000)
- Rate limiting/timeouts: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `REQUEST_TIMEOUT_MS`, `SERVER_TIMEOUT_MS`
- Testing/ops: `SKIP_DB_CHECK=true` to skip startup ping; `DISPOSABLE_DOMAINS_OVERRIDE` for offline/tests; `DISPOSABLE_CACHE_PATH` to persist cache
- RapidAPI integration:
  - `RAPIDAPI_PROXY_SECRET`: shared secret configured in RapidAPI that the gateway sends as `x-rapidapi-proxy-secret`
  - `RAPIDAPI_INTERNAL_API_KEY`: an internal API key value stored in your `api_keys` table, used for all RapidAPI traffic

## Architecture Highlights
- `src/app.js`: middleware, rate limiting, logging, request timeouts, routes
- `src/server.js`: loads env, starts HTTP server, sets server timeout
- `src/middleware/apiKeyAuth.js`: 
  - RapidAPI mode: validates `x-rapidapi-proxy-secret` and maps to `RAPIDAPI_INTERNAL_API_KEY`
  - First‑party mode: accepts API key via Bearer, `x-api-key`, or `api_key` query
- `src/services/apiKeyService.js`: key validation, credit deduction, usage logging
- `src/utils/emailValidator.js`: syntax, DNS/MX, disposable check, role-based check
- `src/utils/disposableDomains.js`: fetch + cache disposable lists; supports disk cache and overrides
- `src/database/schema.sql`: tables/indexes; `src/scripts/migrate.js` applies schema
  - `api_keys.source` marks ownership: `'direct'` (website customers) or `'rapidapi'` (sold via RapidAPI)
  - `src/scripts/addSourceToApiKeys.js` adds the column to existing DBs
  - `src/scripts/createRapidApiInternalKey.js` bootstraps an internal RapidAPI key

## Production Hardening (RapidAPI friendly)
- `app.set('trust proxy', 1)` to work behind proxies/CDNs.
- `helmet` + `compression` enabled by default.
- Rate limiting default 60 req/min per IP; adjust via env or RapidAPI plan.
- Request timeout default 10s; server timeout 15s.
- Structured JSON logs with requestId (`request_start`/`request_complete`).
- Disposable cache can be persisted (`DISPOSABLE_CACHE_PATH`) to avoid cold fetch on boot.

## Testing
```bash
pnpm test
```
- Vitest + Supertest cover validators, API key format, rate-limit headers, disposable cache override.

## Operational Notes
- Credits: `deductCredit` subtracts 1 per call (including bad syntax). `logUsage` is best-effort.
- Startup DB ping can be skipped with `SKIP_DB_CHECK=true` (used in tests).
- For RapidAPI listing, publish client-facing docs from `CLIENT_GUIDE.md`; keep this file internal.


