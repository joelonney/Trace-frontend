# TRACE contract stub

A tiny in-memory server that speaks [`docs/API_CONTRACT_V1.md`](../docs/API_CONTRACT_V1.md), so the
frontend can be built and tested in `VITE_API_MODE=http` **before the real FastAPI backend exists**.

> It is **not** a backend. No database, no real file storage, **no real blockchain** (the ledger is
> `mock-ledger` and says so), opaque tokens instead of JWTs, and everything resets on restart.
> It binds to `127.0.0.1` only. Never deploy it.

## Run it

```bash
# terminal 1 — the stub (http://127.0.0.1:8000/api/v1)
npm run stub

# terminal 2 — the frontend pointed at it
#   PowerShell:
$env:VITE_API_MODE="http"; $env:VITE_API_BASE_URL="http://localhost:8000/api/v1"; npm run dev
#   bash:
VITE_API_MODE=http VITE_API_BASE_URL=http://localhost:8000/api/v1 npm run dev
```

Sign in with the usual demo accounts (README): `officer@trace.local` / `Officer@123`, etc.

> The stub allows the browser origins `localhost:5173`, `:4173` and `:3000`. For any other port
> set `STUB_CORS_ORIGINS=http://localhost:5199` (comma-separate several).

| Env var | Default | Meaning |
|---|---|---|
| `STUB_PORT` | `8000` | Listen port |
| `STUB_TRANSFER_MODE` | `immediate` | `immediate` = today's UI behaviour. `two-step` = request → recipient accepts (contract decision **D5**) |
| `STUB_LEDGER_DELAY_MS` | `1500` | How long a mock ledger write stays `PENDING` before `RECORDED` |
| `STUB_MIN_PASSWORD` | `12` | Minimum temporary-password length (contract decision **D4**) |
| `STUB_CORS_ORIGINS` | — | Extra allowed browser origins |

## What it does

- Seeds itself from the same synthetic data as mock mode (`src/mock/*`), converted to contract
  shapes. Ids are **UUIDs** (stable across restarts); the human codes (`TRC-2026-0114`) are in
  `display_id`, exactly like the contract says.
- Enforces the permission matrix (§2.2): `403 FORBIDDEN`, and **`404` for resources the caller
  can't see** (§2.3, not 403).
- Validation with `422` + per-field `details`; unknown JSON fields are rejected.
- Auth: login (rate-limited, no email enumeration), `HttpOnly` refresh cookie, `/auth/refresh`,
  `/auth/me`, logout, deactivation revokes tokens.
- Uploads: real multipart parsing, real SHA-256 computed on the bytes, extension allow-list,
  100 MB cap, `client_sha256` cross-check. The ledger write is simulated as async
  (`PENDING_LEDGER` → `RECORDED` with a fake `tx_ref`) on network `MOCK_LEDGER`.
- Verification re-hashes stored bytes → `MATCH` / `MISMATCH` / `LEDGER_UNAVAILABLE`. It never
  changes the persisted hash.
- Custody history, transfers (both modes), reports, case documents, users, audit (including
  `DENIED` attempts).

## What it does not do

Not implemented (returns `404 No such endpoint`): `GET /evidence/{id}/download`,
`GET /ledger/transactions/{tx_ref}`, `POST /evidence/{id}/analysis` and AI jobs,
report edit/finalize/export, case timeline. Seed evidence has no real bytes, so verifying a seed item
follows its seeded state rather than re-hashing a file. Seed custody history has `from_user` /
`to_user` = `null` (the mock data never recorded them). Magic-byte sniffing is not implemented.

## Tests

`npm run check:stub` boots the stub on a free port and runs ~118 assertions over real HTTP
(also part of `npm run check`).
