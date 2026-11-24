# TRACE — Frontend

Frontend foundation for **TRACE**, a final-year project building a secure blockchain-based
platform for smart forensic evidence management.

> **Status: frontend-only foundation.** Blockchain (Hyperledger Fabric), the FastAPI backend,
> AI/NLP processing, and real evidence storage are **not yet connected**. Everything in this app
> currently runs against local, synthetic mock data.

## Install & Run

Requires Node.js 18+.

```bash
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # production build to dist/
npm run preview   # preview the production build locally
npm run lint      # oxlint static checks
npm run check     # check:api (mock API layer, 58 assertions) + check:adapters (HTTP adapters, 60)
```

### API mode (mock vs HTTP)

The data layer is selected once at startup by `VITE_API_MODE` (see `.env.example`; copy it to
`.env.local`, which is git-ignored):

| Mode | What happens | Status |
|---|---|---|
| `mock` (default when unset) | In-memory demo data from `src/api/mock/*` + `src/mock/*`. No backend needed. | Working; covered by `npm run check:api` |
| `http` | Real requests to `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`) following `docs/API_CONTRACT_V1.md`, mapped to the UI shapes by `src/api/adapters.js`. | **Not yet tested against a live backend.** Request/response mapping is covered by `npm run check:adapters` with a fake `fetch` only. |

Pages import only `src/api/<feature>.js`; each of those is a facade that picks the mock or HTTP
implementation. Shared enums live in `src/constants/`. A typo in `VITE_API_MODE` throws at startup
rather than silently falling back to mock.

## Demo accounts (local mock environment ONLY)

Sign in at `/login` with one of four fictional demonstration identities:

| User | Role | Organization | Email | Password |
|---|---|---|---|---|
| Alex Morgan | ADMIN | TRACE System Administration | `admin@trace.local` | `Admin@123` |
| Sarah Thomas | OFFICER | Cybercrime Investigation Unit | `officer@trace.local` | `Officer@123` |
| Daniel Mathew | CLERK | Digital Forensic Laboratory | `clerk@trace.local` | `Clerk@123` |
| Priya Nair | READER | Judicial Review Division | `reviewer@trace.local` | `Reviewer@123` |

These credentials are public, documented here, and exist only for the local demo. Do not reuse
them anywhere and do not deploy this build as if it were secured.

### Mock authentication limitations

- **This is not production-grade authentication.** There is no identity provider, DID login, token,
  or backend. Passwords are checked in the browser against salted SHA-256 digests in
  `src/mock/demoAuth.js` — anyone with the source can read or bypass them. The digests only keep
  plaintext out of the user records.
- The "session" is the signed-in user's id in `sessionStorage`. It survives a refresh in the same
  tab and is cleared on logout or when the tab closes. A refresh re-reads the seeded user list, so
  accounts created at runtime are gone after a reload (and their stored session is discarded).
- Unauthenticated visits to any protected route redirect to `/login`. Logout clears the session.
- All demo-only auth logic is isolated in `src/mock/demoAuth.js` and `src/api/auth.js` so it can be
  replaced by Mathew's FastAPI authentication without touching components.

## Architecture

The guiding principle: **UI components never talk to mock data directly.** Everything goes
through an API abstraction layer, so swapping mock data for Mathew's FastAPI backend later only
means changing `src/api/*.js` — no component changes required.

```
React component
      │
      ▼
src/api/*.js   (getCases, getEvidence, login, ...)
      │
      ▼ (today)                     ▼ (future)
src/mock/*.js  (synthetic data)     FastAPI → database / blockchain / IPFS
```

Each function in `src/api/*.js` is `async` and currently resolves data from `src/mock/*.js`
after a short simulated delay (`src/api/client.js`). Later, these functions become
`fetch(`${BASE_URL}/...`)` calls — the function signatures and return shapes are designed to stay
the same.

## Folder Structure

```
src/
  components/
    layout/       AppLayout, Sidebar, Header, Breadcrumbs
    common/        Card, Button, Table, Tabs, Modal, Alert, StatusBadge,
                    LoadingState, EmptyState, PageHeader
    dashboard/     StatCard, RecentActivityList, VerificationSummary
    cases/         CaseFilters, CaseTable
    evidence/      EvidenceTable, EvidenceUploadForm, EvidenceDetailPanel
    custody/       CustodyTimeline, CustodyEventCard
  pages/
    Login/, Dashboard/, Cases/, Evidence/, Custody/, Verification/, Reports/, NotFound/
  api/             client.js, auth.js, cases.js, evidence.js, custody.js,
                   verification.js, reports.js, ai.js, session.js, guard.js
  mock/            users.js, cases.js, evidence.js, custody.js, verification.js, reports.js
  hooks/           useAuth.js
  context/         AuthContext.jsx (mock auth/session state)
  routes/          AppRoutes.jsx, ProtectedRoute.jsx
  utils/           formatters.js, permissions.js, hash.js
```

### Routing

| Path | Page |
|---|---|
| `/login` | Mock sign-in (email + password) |
| `/dashboard` | Overview stats, recent activity |
| `/cases` | Case list, search + filters |
| `/cases/:caseId` | Case detail tabs (Overview, Evidence, Timeline, Chain of Custody, Documents, Reports) |
| `/evidence` | Evidence list, upload (simulated) |
| `/evidence/:evidenceId` | Evidence detail, custody history |
| `/custody` | Pick an evidence item to view its custody chain |
| `/custody/:evidenceId` | Chain-of-custody timeline for one evidence item |
| `/verification` | Pick an evidence item to check integrity |
| `/verification/:evidenceId` | Mocked hash comparison / verification result |
| `/reports` | Report list, draft creation |
| `/users` | User management (ADMIN only) |
| `/audit` | Audit log (ADMIN only) |

All routes except `/login` are behind `ProtectedRoute`, which checks the mock `AuthContext` and
redirects to `/login` if no user is signed in.

### Roles and permissions

The policy lives in one place: `src/utils/permissions.js` (`hasPermission`, `canViewCase`,
`canAccessEvidence`, `canUpdateCase`, `canUploadToCase`). Sidebar items, route guards
(`ProtectedRoute permission=…`), buttons and forms all call these helpers. Navigating directly to a
page your role cannot use shows an **Access denied** page.

| Capability | ADMIN | OFFICER | CLERK | READER |
|---|:-:|:-:|:-:|:-:|
| Dashboard | ✔ | ✔ | ✔ | ✔ |
| View cases | all | assigned | assigned | assigned |
| Create cases | – | ✔ | – | – |
| Update case details | – | ✔ (assigned) | – | – |
| Register case documentation | – | – | ✔ (assigned) | – |
| View evidence metadata + SHA-256 | all | assigned | assigned | assigned |
| Upload evidence | – | ✔ (assigned case) | – | – |
| View chain of custody | ✔ | ✔ | ✔ | ✔ |
| Request / simulate custody transfer | – | ✔ | – | – |
| View verification results | ✔ | ✔ | ✔ | ✔ |
| Run mock integrity verification | – | ✔ | – | – |
| View mock AI analysis | – | ✔ | – | – |
| View reports | ✔ | ✔ | ✔ | ✔ |
| Create draft reports | – | ✔ | ✔ | – |
| Manage mock users / roles / status | ✔ | – | – | – |
| View audit log | ✔ | – | – | – |

No role can edit an evidence file, rewrite a recorded hash, delete evidence, or bypass
verification — those permissions simply do not exist. The Clerk is deliberately **not** granted
evidence upload in this initial policy.

Case assignment is defined in `src/mock/cases.js` (`assigned_user_ids`). Evidence visibility follows
its parent case. Only ADMIN, OFFICER and CLERK can be named as a custodian (`custody.hold`); a
READER can never receive custody.

### Security limitations of frontend-only access control

**Hiding buttons and guarding routes is not security.** Anyone can open dev tools, edit state or
call functions directly. The mock API layer re-checks the same rules (`src/api/guard.js`) purely so
the demo behaves consistently — it runs in the browser and is equally bypassable. Real authorization
must be enforced by the FastAPI backend and by the Hyperledger Fabric chaincode/policies.

### User management (ADMIN only, `/users`)

Lists the four mock users with search and role/status filters; supports create, edit, role
assignment and activate/deactivate. Validation covers required fields, email format and duplicate
emails. The signed-in admin cannot deactivate themselves or drop their own admin role, and the last
active admin cannot be deactivated or demoted.

**Creating a user:** the admin must type a *temporary demo password* (min 8 chars); none is invented.
It is held only in browser memory (as a digest), is not secure, and both the account and password
vanish on page reload. Changes go through `src/api/auth.js` and the shared `src/mock/db.js`.

### Evidence upload (mock registration)

On `/evidence` (Officer only, assigned cases): pick a case, evidence type and description, then choose
or drag a real local file. The file is validated (extension allow-list per type, non-empty, max
100 MB), then:

1. Its SHA-256 is **genuinely calculated in the browser** with the Web Crypto API.
2. A new synthetic evidence ID is generated and a mock record is added to the in-memory store, along
   with a `REGISTERED` custody event. Lists and dashboard counts update.
3. The file is then discarded.

Not performed: no upload, encryption, IPFS pinning, blockchain transaction or permanent storage. New
records have **no CID** and **no transaction reference**, and are labelled "calculated locally in
browser · not blockchain-recorded". They are lost on page reload.

### Verification clarity

The verification page labels each result by source:

- **Synthetic demonstration result** — seed data; nothing was actually hashed or looked up.
- **Locally calculated file hash** — an Officer picks a file; its SHA-256 is compared with the mock
  record. Not backend-confirmed, not blockchain-verified.
- **Backend-confirmed verification** and **blockchain transaction references** — *not available yet*
  (pending Mathew and Aadi). Placeholder `TXN-…` values in seed data are labelled as non-real.

Verification can never change a recorded hash.

## Mock Data

All data in `src/mock/*.js` is synthetic and fictional (fake names, fabricated seed hashes/CIDs and `TXN-…` references, a placeholder AI summary).
Key shapes:

**Evidence** (`src/mock/evidence.js`):
```js
{
  id, case_id, filename, file_type, description, size,
  sha256, cid, uploaded_by, upload_timestamp,
  current_custodian, status  // VERIFIED | PENDING_VERIFICATION | UNDER_REVIEW | FLAGGED
}
```

**Custody event** (`src/mock/custody.js`):
```js
{
  id, evidence_id, event_type, actor, organization,
  timestamp, reason, status, transaction_id
}
```

**User** (`src/mock/users.js`, no passwords):
```js
{ id, name, email, role, organization, status }  // status: ACTIVE | INACTIVE
```

## Current Limitations

- **Nothing persists.** All mock data lives in memory (`src/mock/db.js`). A page reload resets every
  created user, case, evidence record, custody event, report, document and audit entry to the seed
  data. Only the sign-in session id survives a refresh (in `sessionStorage`).
- **Mock authentication and authorization** — see above; not secure.
- **No real file storage, encryption, IPFS, or blockchain.**
- **Seed hashes, CIDs, transaction references and AI text are synthetic.** Only SHA-256 values for
  files registered or checked locally in this session are genuinely calculated.
- Case "Documents" registered by a Clerk are metadata only. Draft reports are records, not documents.
- The audit log is session-only and is not tamper-evident.
- Organization management and access-policy editing are not implemented.

## Future FastAPI Integration

When Mathew's backend is ready, integration should only require:

1. Setting `VITE_API_BASE_URL` (see `src/api/client.js`) to the FastAPI base URL.
2. Replacing the mock-resolving implementation inside each `src/api/*.js` function with a real
   `fetch`/HTTP call, keeping the same function names and return shapes.
3. Replacing mock login in `src/api/auth.js` with a real authentication call.

No page or component code should need to change.

## Team / Dependencies

- **Mathew** — FastAPI backend and security: real authentication (replace `src/mock/demoAuth.js` and
  login/session in `src/api/auth.js`), server-side authorization of every action, user and case
  persistence, file ingestion/hash recording, backend-confirmed verification. Needs to confirm the
  permission matrix above (especially Clerk access) and the case-assignment model.
- **Aadi** — Hyperledger Fabric: chain-of-custody and hash-recording transactions, real transaction
  references, on-chain audit trail and chaincode access policies.
- **Jijo** — AI/NLP: replaces the placeholder analysis in `src/api/ai.js`.
- **Joe** — Frontend & DevOps (this project).

### API abstraction (current surface)

`src/api/`: `auth.js` (login, restoreSession, logout, getUsers, createUser, updateUser,
setUserStatus, getUserDirectory, getAuditLog), `cases.js`, `evidence.js`, `custody.js`,
`verification.js`, `reports.js`, `ai.js`, plus `session.js`/`guard.js` (mock session and
server-style authorization stand-ins). Each function is async and returns/throws like a REST client
would (`ApiError` with HTTP-like status codes).
