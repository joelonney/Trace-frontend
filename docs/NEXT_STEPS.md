# TRACE frontend — next steps (Joe)

Ranked easiest → hardest. Status key: `[ ]` to do · `[x]` done.

| # | Status | Task | Effort | Depends on |
|---|---|---|---|---|
| 1 | [x] | Check Custody and Reports pages (and every other page) for console errors; tick the last checklist item | 5 min | nothing |
| 2 | [x] | Add a `Dockerfile` (Node build, then nginx), `.dockerignore`, and an nginx SPA config. **Written, not yet build-tested** (Docker isn't installed on Joe's machine) | 1–2 h | nothing |
| 3 | [x] | Add `docker-compose.yml` with the frontend service and placeholders for backend and Fabric. **YAML validated, not yet run** | 1 h | #2 |
| 4 | [x] | Clone the team's backend repo into `trace-backend/` (next to `trace-frontend/`) and compare its API with `docs/API_CONTRACT_V1.md`. **Done** — see `docs/BACKEND_COMPARISON.md` (backend has chaincode only; no FastAPI code pushed yet) | 1–2 h | friends' repo |
| 5 | [ ] | Fix the 6 lint warnings by moving data loading into a small `useAsync` hook | 2–3 h | nothing |
| 6 | [x] | Build the contract stub server (plan step I-2) so `VITE_API_MODE=http` can be tested without the real backend. **Done** — see `stub/README.md`; `npm run stub`, `npm run check:stub` (118 assertions) | 4–6 h | nothing |
| 7 | [ ] | Fix the UI/contract mismatches found by running the real UI against the stub (list below), plus the new status labels from `docs/INTEGRATION_PLAN.md` §5 | 3–4 h | #6 ✔ |
| 8 | [ ] | Wire auth, users and cases to the real FastAPI (plan steps I-3, I-4) | 1–2 days | Mathew's backend |
| 9 | [ ] | Wire evidence upload/download, custody, verification, ledger banner and polling (plan steps I-4 to I-6) | 2–4 days | backend + Aadi's chaincode |
| 10 | [ ] | Stretch goals: DID login and client-side AES-256 encryption | 1+ week | backend |

## Findings from running the real UI against the stub (feeds task #7)

Tested 2026-11-24 in a real browser, `VITE_API_MODE=http` → stub. Login, cases, evidence, upload,
custody transfer, verification, reports, user management and audit all work end to end. What's
wrong or misleading in http mode:

1. **UUIDs are shown to users.** Tables, headers and breadcrumbs show `id` (e.g.
   `b6df8190-b6d0-…`) where `display_id` (`TRC-2026-0114`) should be shown. Links must keep using `id`.
2. **Hidden resource → wrong page.** The API returns `404` for a case/evidence the user can't see
   (contract §2.3). Pages only treat `403` as "denied", so a Reader sees "could not be found"
   instead of the Access denied page. Treat `403` and `404` the same ("not available to you").
3. **Mock wording appears in http mode.** On backend evidence the UI still says "SYNTHETIC DEMO
   VALUE" for the hash, "None — file was not stored anywhere" for storage, "Evidence registered
   (mock environment)" after upload, and "Run mock verification" on the verification page. It
   should say "Calculated by backend", show the storage reference, "Ledger pending/recorded/mock",
   and "Run backend verification".
4. **Temporary-password rule.** The UI accepts 8 characters; the contract (D4) requires 12. The
   server's `422` shows only the generic "Some fields are invalid" — field-level `details` aren't
   mapped onto the form fields.
5. **Session restore.** Reloading in http mode signs you out (`restoreSession` is a stub until
   plan step I-3 wires `/auth/refresh` + `/auth/me` into `AuthContext`).
6. **Dashboard tile.** "Pending Access Requests" should become "Pending custody transfers"
   (`GET /transfers?status=PENDING&direction=incoming`, decision D5).
7. **Two-step transfer UI (from `docs/BACKEND_COMPARISON.md`).** The chaincode is offer → accept, so
   the UI needs a recipient inbox with Accept/Reject, a "transfer pending" state on the evidence page,
   and the dashboard tile above. Once the team confirms D5, make `two-step` the stub default.

## Suggested order

1 → 2 → 3 → 6, then 4. That gives a runnable Docker setup and an `http`-mode test
environment without waiting on teammates, and the backend repo (#4) can then be compared
against it.

## Related docs

- `docs/MANUAL_TEST_CHECKLIST.md` — browser test checklist (all items passed 2026-11-24)
- `docs/API_CONTRACT_V1.md` — API contract the backend must follow
- `docs/INTEGRATION_PLAN.md` — step-by-step plan for switching from mock to real backend (I-0 … I-7)
