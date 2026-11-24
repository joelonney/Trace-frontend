# TRACE frontend — next steps (Joe)

Ranked easiest → hardest. Status key: `[ ]` to do · `[x]` done.

| # | Status | Task | Effort | Depends on |
|---|---|---|---|---|
| 1 | [x] | Check Custody and Reports pages (and every other page) for console errors; tick the last checklist item | 5 min | nothing |
| 2 | [ ] | Add a `Dockerfile` (Node build, then nginx), `.dockerignore`, and an nginx SPA config | 1–2 h | nothing |
| 3 | [ ] | Add `docker-compose.yml` with the frontend service and placeholders for backend and Fabric | 1 h | #2 |
| 4 | [ ] | Clone the team's backend repo into `trace-backend/` (next to `trace-frontend/`) and compare its API with `docs/API_CONTRACT_V1.md` | 1–2 h | friends' repo |
| 5 | [ ] | Fix the 6 lint warnings by moving data loading into a small `useAsync` hook | 2–3 h | nothing |
| 6 | [ ] | Build the contract stub server (plan step I-2) so `VITE_API_MODE=http` can be tested without the real backend | 4–6 h | nothing |
| 7 | [ ] | Add the new status labels from `docs/INTEGRATION_PLAN.md` §5 ("Ledger pending", "Calculated by backend", …) | 3–4 h | #6 helps |
| 8 | [ ] | Wire auth, users and cases to the real FastAPI (plan steps I-3, I-4) | 1–2 days | Mathew's backend |
| 9 | [ ] | Wire evidence upload/download, custody, verification, ledger banner and polling (plan steps I-4 to I-6) | 2–4 days | backend + Aadi's chaincode |
| 10 | [ ] | Stretch goals: DID login and client-side AES-256 encryption | 1+ week | backend |

## Suggested order

1 → 2 → 3 → 6, then 4. That gives a runnable Docker setup and an `http`-mode test
environment without waiting on teammates, and the backend repo (#4) can then be compared
against it.

## Related docs

- `docs/MANUAL_TEST_CHECKLIST.md` — browser test checklist (all items passed 2026-11-24)
- `docs/API_CONTRACT_V1.md` — API contract the backend must follow
- `docs/INTEGRATION_PLAN.md` — step-by-step plan for switching from mock to real backend (I-0 … I-7)
