# TRACE Frontend — Backend Integration Plan

Companion to `API_CONTRACT_V1.md`. Status: **plan only**; no API module has been rewritten yet.

## 1. Where the boundary already is

Every page and component imports only from `src/api/*` for **data and operations**. Verified with
grep: the only `src/mock` imports outside `src/api` are **enum constants** — `ROLES`, `ROLE_LABELS`,
`ORGANIZATIONS`, `USER_STATUS` from `mock/users.js` (AccessDenied, Header, Sidebar, UserManagement,
`utils/permissions.js`) and `CASE_STATUS`, `CASE_PRIORITY` from `mock/cases.js` (CaseDetails,
CasesList). No UI file imports seed data or mock functions. Step I-1 moves those enums to
`src/constants/` so that `api/mock/` can later be excluded from the production bundle. That is the
seam we keep.

Current API modules and what is mocked in each:

| Module | Functions | Mock-only behaviour to replace |
|---|---|---|
| `api/auth.js` | `login, restoreSession, logout, getUsers, createUser, updateUser, setUserStatus, getUserDirectory, getAuditLog` | digest check in `mock/demoAuth.js`; user id in `sessionStorage`; in-memory users and audit log |
| `api/cases.js` | `getCases, getCaseById, createCase, updateCase, registerCaseDocument, removeCaseDocument` | in-memory `db.cases`; client-side `canViewCase` scoping |
| `api/evidence.js` | `getEvidence, getEvidenceById, getEvidenceByCaseId, uploadEvidence, validateEvidenceFile, ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, EVIDENCE_TYPES` | in-memory records; browser SHA-256 is the *only* hash; synthetic CIDs on seed data |
| `api/custody.js` | `getCustodyEvents, getRecentCustodyEvents, getPendingAccessRequests, transferCustody, getTransferRecipients` | immediate in-memory transfer; no transaction refs |
| `api/verification.js` | `getVerification, runVerification` | synthetic result or local file comparison; nothing persisted server-side |
| `api/reports.js` | `getReports, getReportsByCaseId, createDraftReport` | in-memory |
| `api/ai.js` | `getAiAnalysis` | hard-coded placeholder text |
| `api/session.js`, `api/guard.js` | mock session + `authorize()` | **delete entirely** — the server authorizes |
| `api/client.js` | `BASE_URL, mockDelay, ApiError` | `mockDelay` goes away; `ApiError` stays |

## 2. Target shape (no new dependencies)

```
src/api/
  client.js        fetch wrapper: base URL, bearer token, JSON, errors, 401 handling, refresh
  adapters.js      contract ⇄ UI field mapping (see §4)
  <feature>.js     same exported function names as today; body = http call + adapter
  mock/            current in-memory implementations, moved here unchanged
  index.js         picks real or mock implementation per VITE_API_MODE
```

Pages keep importing `from '../../api/cases'` etc. Each feature file becomes:

```js
// src/api/cases.js (after integration)
import { http } from './client'
import { toCase } from './adapters'
import * as mock from './mock/cases'
import { useMock } from './mode'

export const getCases = useMock ? mock.getCases
  : async () => (await http.get('/cases', { page_size: 100 })).items.map(toCase)
```

Plain `fetch` is sufficient; React Query is **not** required for MVP and is deferred. The six
`set-state-in-effect` lint warnings are the fetch-in-effect pattern; they stay until a data-fetching
library is adopted, which is a separate decision.

## 3. Environment configuration

`.env.example` (committed) / `.env.local` (git-ignored, Vite already ignores `*.local`):

```
VITE_API_MODE=mock          # mock | http
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_LEDGER_BANNER=auto     # auto = show "mock ledger" banner from /ledger/status
```

Rules:
- `VITE_API_MODE=mock` is the default when the variable is absent, so `npm run dev` keeps working with no backend. `npm run check:api` continues to test the mock implementations.
- `VITE_API_MODE=http` with an unreachable backend must fail loudly (login page shows "Backend unreachable at …"), never silently fall back to mock. Mixing real and mock data in one session is not allowed.
- The sidebar footer "Mock data mode — no live backend" reads the mode; in `http` mode it shows the `/ledger/status` adapter name instead (e.g. "Ledger: mock-ledger" or "Fabric test-network").
- Secrets never live in `VITE_*` variables (they are bundled into the client).

## 4. Adapter layer — contract → UI shape

Keep the pages untouched in the first pass by mapping contract objects to the field names the UI reads today. Each mapping is a pure function in `adapters.js`, trivially unit-testable.

| Contract | UI field today | Mapping |
|---|---|---|
| `Case.lead_investigator.name` | `investigator` | copy |
| `Case.lead_investigator.id` | `investigator_id` | copy |
| `Case.opened_at` | `opened_date` | copy (UI formats) |
| `Case.assignments[].user.id` | `assigned_user_ids` | map |
| `Evidence.size_bytes` | `size` | copy |
| `Evidence.evidence_type` (`DOCUMENT`) | `file_type` (`Document`) | enum table |
| `Evidence.registered_at` | `upload_timestamp` | copy |
| `Evidence.uploaded_by.id` / `.name` | `uploaded_by` (id) | keep id; directory lookup still works, or switch panel to `.name` |
| `Evidence.hash.persisted_sha256` | `sha256` | copy |
| `Evidence.hash.calculated_by` | `hash_source` | `BACKEND` → `'BACKEND'` (new label "Calculated by backend") |
| `Evidence.storage.reference` + `.provider` | `cid` | show as "Storage reference (MinIO)"; CID label only when provider is IPFS |
| `Evidence.integrity_status` | `status` | enum table (§5) |
| `Evidence.ledger.*` | *(new)* | pass through as `ledger`; detail panel gains a "Ledger" field |
| `CustodyEvent.actor.name` | `actor` | copy |
| `CustodyEvent.occurred_at` | `timestamp` | copy |
| `CustodyEvent.ledger.tx_ref` (only if `status==='RECORDED'`) | `transaction_id` | conditional copy, else `null` |
| `Verification.*` | `source, recorded_sha256, current_sha256, placeholder_reference, checked_*` | `kind→source` (`BACKEND`), `persisted→recorded`, `recalculated→current`, `ledger_tx_ref→placeholder_reference` (rename UI label to "Ledger transaction"), `verified_*→checked_*` |
| `Report.author.name`, `created_at` | `author`, `generated_at` | copy |
| `AuditEvent.actor.name`, `occurred_at`, `target_display` | `actor_name`, `timestamp`, `target` | copy |

Once the backend is stable, a second pass can rename UI fields to the contract names and delete the adapter. Doing it in two passes keeps each change reviewable.

## 5. Enum and label changes the UI needs

- `StatusBadge` tone map: add `REGISTERED→info`, `PENDING_LEDGER→warning`, `RECORDED→info`, `MISMATCH→danger`, `LEDGER_UNAVAILABLE→warning`, `REJECTED→danger`, `CONFIRMED→success`, `SUBMITTED→warning`.
- `VerificationSummary` (dashboard) currently counts `VERIFIED|PENDING_VERIFICATION|UNDER_REVIEW|FLAGGED`; switch to the new set.
- Dashboard tile "Pending Access Requests" → "Pending custody transfers" fed by `GET /transfers?status=PENDING&direction=incoming` (two-step mode) or removed (immediate mode). Depends on **D5**.
- Evidence detail: hash tag text becomes one of "Calculated by backend", "Recorded on ledger (tx …)", "Ledger pending", "Mock ledger". Never "verified" unless a `Verification` with `result: MATCH` exists.
- Verification page: the "Run mock verification" button becomes "Run backend verification" (`POST …/verifications`); "Hash a local file…" stays client-side and is labelled "local comparison".

## 6. Error handling (one place)

`client.js`:

```
request → add Authorization → fetch
  network error        → ApiError('Backend unreachable', 0)
  401 UNAUTHENTICATED  → try POST /auth/refresh once → retry; else clear session, emit 'auth:expired'
  other non-2xx        → ApiError(body.error.message, status, body.error.code, body.error.details)
```

- `AuthContext` listens for `auth:expired` and navigates to `/login` with `state.from`.
- Pages already show `err.message` in forms and branch on `err.status === 403`; extend the branch to `403 || 404` for "not available to you" and keep the AccessDenied page.
- `422` `details[]` are mapped to field-level messages in forms (login, user form, upload form already have per-field error state).
- `503 DEPENDENCY_UNAVAILABLE` shows a non-blocking banner naming the dependency (ledger/storage/ai) and leaves the rest of the page usable.

## 7. Session handling after integration

- Access token kept **in memory only** (module variable in `client.js`), not in `localStorage`/`sessionStorage`.
- On app load `AuthContext` calls `POST /auth/refresh` (cookie) then `GET /auth/me`; success restores the user and the `permissions` array; failure lands on `/login`.
- `permissions.js` keeps its matrix for now, but `hasPermission` should prefer `user.permissions` when present so the server's list wins. One-line change, deferred until `/auth/me` exists.
- `mock/demoAuth.js` is deleted when `VITE_API_MODE=http` is the default.

## 8. Upload path after integration

1. User picks file → existing validation (`validateEvidenceFile`) runs for fast feedback.
2. Browser computes SHA-256 (existing `utils/hash.js`) → sent as `client_sha256`. If the file exceeds the local hashing cap, skip the field; the server hash is authoritative anyway.
3. `multipart/form-data` POST with progress via `XMLHttpRequest` (fetch has no upload progress; no library needed).
4. Response `ledger.status: PENDING` → list row shows "Ledger pending"; detail page polls `GET /evidence/{id}` every 3 s for up to 60 s, then stops and shows the current state.
5. Success banner text changes to: "Evidence registered. SHA-256 calculated by the backend. Ledger recording: pending/recorded/mock."

## 9. Milestones for the integration itself (after approval)

| Step | Work | Depends on |
|---|---|---|
| I-0 | Agree contract; freeze D1–D8 | team |
| I-1 | Add `VITE_API_MODE`, `client.js` http wrapper, `adapters.js` with unit tests (Node, same harness style as `scripts/api-check.mjs`); move current implementations to `api/mock/`; move enum constants from `src/mock/*` to `src/constants/` | nothing |
| I-2 | Contract stub: a tiny Node/JSON-server that serves the contract shapes (for Joe to develop against before FastAPI exists) | I-1 |
| I-3 | Switch auth + users + cases to http mode; keep others on mock behind the mode flag per-module | FastAPI `/auth`, `/users`, `/cases` |
| I-4 | Evidence upload/list/detail/download + custody + verification | FastAPI evidence routes + storage |
| I-5 | Ledger status banner, tx refs, pending polling | adapter (mock-ledger acceptable) |
| I-6 | Reports, audit, AI job polling | FastAPI reports/audit; AI service |
| I-7 | Remove adapter layer, rename UI fields to contract names, delete `api/mock` from the production bundle | all above |

Each step must keep `npm run build`, `npm run lint`, and `npm run check:api` green, and the manual checklist re-run for the affected role(s).

## 10. Things this plan deliberately does not do

- No React Query / Zustand / axios. Fetch + context is enough for MVP.
- No DID authentication, no client-side AES. Flagged as stretch goals in the contract.
- No changes to `src/pages` or `src/components` until step I-7, other than enum/label additions listed in §5.
