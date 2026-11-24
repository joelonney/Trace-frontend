# TRACE API Contract — v1 (DRAFT for team review)

Status: **proposal**. Nothing here is implemented by a backend yet. The frontend currently runs
entirely against in-browser mock modules (`src/api/*.js` + `src/mock/*.js`). This document is the
agreement the React client and Mathew's FastAPI service will both be built against.

Items marked **[DECISION]** need team confirmation — see §12. Items marked **[LATER]** are not
required for the first integrated MVP.

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Base path | `/api/v1` (frontend reads `VITE_API_BASE_URL`; default today is `http://localhost:8000/api` and must change to `/api/v1`) |
| Transport | HTTPS in any shared environment; HTTP only on localhost |
| Content type | `application/json` except uploads/downloads |
| Auth header | `Authorization: Bearer <access_token>` on every endpoint except `POST /auth/login`, `POST /auth/refresh`, `GET /health` |
| IDs | `id` is a server-generated UUID (string). Records that users see by code also carry `display_id` (`TRC-2026-0114`, `EVD-2026-00231`, `RPT-2026-0041`). Clients must use `id` in URLs; `display_id` is for humans and search. |
| Timestamps | ISO 8601 UTC with `Z` suffix, e.g. `2026-06-03T09:14:47Z`. Field names end in `_at`. |
| Enums | UPPER_SNAKE_CASE strings. Unknown enum values from the server must not crash the UI. |
| Pagination | List endpoints accept `?page=1&page_size=25` (max 100) and return `{ "items": [...], "page": 1, "page_size": 25, "total": 57 }`. |
| Sorting/filtering | Query params named after fields (`?status=OPEN&case_id=…&q=search`). Documented per endpoint. |
| Optional fields | May be `null`; never omitted. Required fields are never `null`. |
| Idempotency | `POST` creating resources accepts an optional `Idempotency-Key` header **[LATER]**. |
| Rate limiting | `POST /auth/login` is rate-limited per IP + email; returns `429`. |

### 1.1 Error format

Every non-2xx response has this body:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not assigned to this case.",
    "details": [ { "field": "email", "message": "Enter a valid email address." } ]
  }
}
```

`details` is present only for validation errors (`422`). `message` is safe to show to the user.

| HTTP | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | malformed body/query |
| 401 | `UNAUTHENTICATED` | missing/expired/invalid token |
| 401 | `INVALID_CREDENTIALS` | login failed (same message for unknown email and wrong password) |
| 403 | `FORBIDDEN` | role lacks permission, or user not assigned to the case |
| 403 | `ACCOUNT_INACTIVE` | login attempt on a deactivated account |
| 404 | `NOT_FOUND` | resource missing **or hidden** (see §2.3) |
| 409 | `CONFLICT` | duplicate email, transfer to current custodian, state conflict |
| 413 | `PAYLOAD_TOO_LARGE` | upload exceeds limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | file type not allowed for evidence type |
| 422 | `VALIDATION_ERROR` | field-level validation |
| 429 | `RATE_LIMITED` | login throttling |
| 503 | `DEPENDENCY_UNAVAILABLE` | storage / ledger / AI service down (body says which: `"dependency": "ledger"`) |

The current frontend maps `err.status === 403` to an **Access denied** page and shows `err.message`
in forms. That behaviour is kept; `401` must additionally clear the session and redirect to login
(see INTEGRATION_PLAN.md).

---

## 2. Roles, permissions and case scoping

### 2.1 Roles

`ADMIN`, `OFFICER`, `CLERK`, `READER` — same four as the frontend (`src/utils/permissions.js`).

### 2.2 Permission matrix (server-enforced)

The backend **must** enforce this independently. Frontend checks only hide UI.

| Permission | ADMIN | OFFICER | CLERK | READER |
|---|:-:|:-:|:-:|:-:|
| `cases.view` (scope: assigned) | ✔ (all) | ✔ | ✔ | ✔ |
| `cases.view_all` | ✔ | – | – | – |
| `cases.create` | – | ✔ | – | – |
| `cases.update` | – | ✔ | – | – |
| `cases.assign` | ✔ | – | – | – |
| `documents.manage` | – | – | ✔ | – |
| `evidence.view` (scope: assigned) | ✔ (all) | ✔ | ✔ | ✔ |
| `evidence.upload` | – | ✔ | – | – |
| `evidence.download` | – | ✔ | ✔ | ✔ |
| `custody.view` | ✔ | ✔ | ✔ | ✔ |
| `custody.transfer` | – | ✔ | – | – |
| `custody.hold` (may be custodian) | ✔ | ✔ | ✔ | – |
| `verification.view` | ✔ | ✔ | ✔ | ✔ |
| `verification.run` | – | ✔ | – | – |
| `ai.view` / `ai.submit` | – | ✔ | – | – |
| `reports.view` | ✔ | ✔ | ✔ | ✔ |
| `reports.create` | – | ✔ | ✔ | – |
| `users.manage` | ✔ | – | – | – |
| `audit.view` | ✔ | – | – | – |

Notes:
- No permission exists to **modify an evidence file, change a persisted hash, or delete evidence**. Not even ADMIN.
- `evidence.download` for ADMIN is deliberately **off** (ADMIN sees metadata, not content). **[DECISION D7]**
- `cases.assign` is new: the mock has no way to change assignments. Needed so ADMIN can give an Officer/Clerk/Reader access to a case.
- `GET /auth/me` returns the resolved permission list so the frontend can stop hard-coding the matrix later.

### 2.3 Case-level scoping

- Every case has an assignment set. A user is **assigned** if they appear in `case_assignments` for that case, or hold `cases.view_all`.
- Evidence, custody events, verifications, reports, documents and AI results inherit visibility from their case.
- Requests for a resource the caller cannot see return **404**, not 403, so existence is not leaked. (Current mock returns 403; the frontend already treats both as "cannot show". Change tracked in INTEGRATION_PLAN.)
- Permission denied for an *action* on a visible resource returns **403**.

---

## 3. Shared schemas

### 3.1 User
```json
{
  "id": "0d8f6b1e-…",
  "name": "Sarah Thomas",
  "email": "officer@trace.local",
  "role": "OFFICER",
  "organization": "Cybercrime Investigation Unit",
  "status": "ACTIVE",
  "created_at": "2026-05-01T08:00:00Z",
  "last_login_at": "2026-06-03T09:00:00Z"
}
```
`status`: `ACTIVE | INACTIVE`. Never includes any credential material.

### 3.2 UserRef (embedded everywhere an actor appears)
```json
{ "id": "0d8f6b1e-…", "name": "Sarah Thomas", "organization": "Cybercrime Investigation Unit" }
```
> The current frontend displays custody `actor` and report `author` as **plain name strings** and
> looks custodians up by id through a name directory. The contract embeds `UserRef` objects
> instead; the thin adapter in `src/api` maps them (see INTEGRATION_PLAN §4).

### 3.3 Case
```json
{
  "id": "9a3f…", "display_id": "TRC-2026-0114",
  "title": "Riverside Warehouse Break-In",
  "type": "Burglary",
  "status": "OPEN",
  "priority": "HIGH",
  "description": "…",
  "lead_investigator": { "id": "…", "name": "Sarah Thomas", "organization": "…" },
  "organization": "Cybercrime Investigation Unit",
  "opened_at": "2026-06-02T00:00:00Z",
  "assignments": [ { "user": { "id": "…", "name": "…", "organization": "…" }, "role": "OFFICER", "assigned_at": "…" } ],
  "evidence_count": 2,
  "created_at": "…", "updated_at": "…"
}
```
`status`: `OPEN | UNDER_REVIEW | CLOSED | ARCHIVED`. `priority`: `HIGH | MEDIUM | LOW`.
`assignments` is included on detail, omitted (`null`) on list.

### 3.4 Evidence
```json
{
  "id": "b04d…", "display_id": "EVD-2026-00231",
  "case_id": "9a3f…", "case_display_id": "TRC-2026-0114",
  "filename": "warehouse_cctv_north_entry.mp4",
  "evidence_type": "VIDEO",
  "mime_type": "video/mp4",
  "size_bytes": 482193408,
  "description": "…",
  "uploaded_by": { "id": "…", "name": "Sarah Thomas", "organization": "…" },
  "registered_at": "2026-06-02T23:52:11Z",
  "current_custodian": { "id": "…", "name": "Daniel Mathew", "organization": "…" },
  "integrity_status": "VERIFIED",
  "hash": {
    "algorithm": "SHA-256",
    "persisted_sha256": "a3f5…d6",
    "calculated_by": "BACKEND",
    "calculated_at": "2026-06-02T23:52:12Z"
  },
  "storage": { "provider": "MINIO", "reference": "evidence/9a3f…/b04d…", "encrypted_at_rest": true },
  "ledger": {
    "status": "RECORDED",
    "network": "FABRIC_TESTNET",
    "tx_ref": "f1c0…",
    "recorded_sha256": "a3f5…d6",
    "recorded_at": "2026-06-02T23:52:20Z",
    "last_checked_at": "2026-06-03T08:11:02Z"
  },
  "created_at": "…", "updated_at": "…"
}
```

- `evidence_type`: `VIDEO | AUDIO | DOCUMENT | IMAGE_ARCHIVE | DISK_IMAGE | LOG_FILE` (frontend currently uses title-case labels; adapter maps).
- `integrity_status`: `REGISTERED | PENDING_LEDGER | RECORDED | VERIFIED | MISMATCH | LEDGER_UNAVAILABLE`. See §5 for exact meaning. (Frontend today uses `PENDING_VERIFICATION | VERIFIED | FLAGGED | UNDER_REVIEW`; mapping in INTEGRATION_PLAN.)
- `ledger.status`: `NOT_SUBMITTED | PENDING | RECORDED | FAILED`. `tx_ref`, `recorded_sha256`, `recorded_at` are `null` unless `RECORDED`.
- `storage.reference` is opaque. It is **not** an IPFS CID unless `provider` is `IPFS`.
- The **file bytes are never in this object**; see `GET /evidence/{id}/download`.

### 3.5 CustodyEvent
```json
{
  "id": "c17e…",
  "evidence_id": "b04d…",
  "event_type": "CUSTODY_TRANSFERRED",
  "status": "COMPLETED",
  "actor": { "id": "…", "name": "Sarah Thomas", "organization": "…" },
  "from_user": { "id": "…", "name": "…", "organization": "…" },
  "to_user":   { "id": "…", "name": "Daniel Mathew", "organization": "…" },
  "reason": "Transferred to lab for imaging.",
  "occurred_at": "2026-06-03T08:10:47Z",
  "ledger": { "status": "RECORDED", "tx_ref": "…", "recorded_at": "…" }
}
```
`event_type`: `REGISTERED | CUSTODY_TRANSFER_REQUESTED | CUSTODY_TRANSFERRED | CUSTODY_TRANSFER_REJECTED | INTEGRITY_VERIFIED | ACCESSED | DOWNLOADED`.
`status`: `COMPLETED | PENDING | REJECTED`. `from_user`/`to_user` are `null` except for transfer events.

> `ACCESS_REQUESTED / ACCESS_GRANTED` exist in the mock seed only. No frontend action creates them.
> They are **not** in v1. The dashboard tile "Pending Access Requests" should become
> "Pending Custody Transfers" (count of `CUSTODY_TRANSFER_REQUESTED` with status `PENDING` where the
> caller is `to_user`). Tracked in INTEGRATION_PLAN.

### 3.6 Verification
```json
{
  "id": "e5b2…",
  "evidence_id": "b04d…",
  "kind": "BACKEND",
  "result": "MATCH",
  "recalculated_sha256": "a3f5…d6",
  "persisted_sha256":   "a3f5…d6",
  "ledger_sha256":      "a3f5…d6",
  "ledger_tx_ref": "f1c0…",
  "verified_by": { "id": "…", "name": "Sarah Thomas", "organization": "…" },
  "verified_at": "2026-06-10T10:00:00Z",
  "notes": null
}
```
`kind`: `BACKEND` (server re-hashed the stored object) | `LEDGER_ONLY` (ledger lookup only, object not re-read) **[LATER]**.
`result`: `MATCH | MISMATCH | LEDGER_UNAVAILABLE | STORAGE_UNAVAILABLE`.
`ledger_sha256` and `ledger_tx_ref` are `null` when the ledger is unavailable or the item was never recorded; `result` then says so and the UI must not show a green "verified".

A **browser-calculated** hash (what the frontend does today in `utils/hash.js`) is **not** a
Verification record and is never sent to this endpoint as a result. It is a client-side convenience
only (§5.3).

### 3.7 Report
```json
{
  "id": "r9…", "display_id": "RPT-2026-0041",
  "case_id": "9a3f…",
  "title": "Preliminary Forensic Summary",
  "summary": "…",
  "status": "DRAFT",
  "author": { "id": "…", "name": "Sarah Thomas", "organization": "…" },
  "created_at": "2026-06-10T10:00:00Z", "updated_at": "…",
  "ai_assisted": false,
  "content": null
}
```
`status`: `DRAFT | FINAL`. `content` (structured sections) is **[LATER]**; MVP is title + summary.

### 3.8 CaseDocument (metadata only)
```json
{ "id": "…", "case_id": "…", "title": "Intake form", "note": "…", "added_by": { … }, "added_at": "…" }
```

### 3.9 AuditEvent
```json
{
  "id": "a1…",
  "occurred_at": "2026-06-03T09:00:00Z",
  "actor": { "id": "…", "name": "Alex Morgan", "organization": "…" },
  "action": "USER_DEACTIVATED",
  "target_type": "USER",
  "target_id": "…",
  "target_display": "clerk@trace.local",
  "detail": "…",
  "ip_address": "10.0.0.5",
  "outcome": "SUCCESS"
}
```
`outcome`: `SUCCESS | DENIED | FAILED`. Denied attempts **are** logged.

### 3.10 AnalysisJob **[LATER]**
```json
{
  "id": "j7…",
  "evidence_id": "b04d…",
  "status": "COMPLETED",
  "requested_by": { … },
  "requested_at": "…", "completed_at": "…",
  "service": { "name": "trace-ai", "version": "0.1.0", "model": "…" },
  "is_draft": true,
  "disclaimer": "AI-generated draft. Does not establish authenticity. Requires investigator review.",
  "result": {
    "summary": "…",
    "entities": [ { "type": "DATE", "text": "3 June 2026", "confidence": 0.91, "source_span": [120, 131] } ],
    "timeline": [ { "at": "2026-06-02T22:00:00Z", "text": "…", "source_span": [0, 40] } ],
    "classification": { "label": "ACCESS_LOG", "confidence": 0.77 }
  },
  "error": null
}
```
`status`: `QUEUED | RUNNING | COMPLETED | FAILED | UNSUPPORTED_FORMAT`.

---

## 4. Endpoints

Legend: **MVP** = needed for first integrated demo. **Perm** = permission from §2.2. **Scope** = case-level rule.

### 4.1 Auth

| Method/path | Perm | MVP |
|---|---|---|
| `POST /auth/login` | public | ✔ |
| `POST /auth/refresh` | refresh cookie | ✔ |
| `POST /auth/logout` | authenticated | ✔ |
| `GET /auth/me` | authenticated | ✔ |

**POST /auth/login**
```json
→ { "email": "officer@trace.local", "password": "…" }
← 200 { "access_token": "eyJ…", "token_type": "Bearer", "expires_in": 900,
        "user": { …User… }, "permissions": ["cases.view", "cases.create", …] }
← 401 INVALID_CREDENTIALS | 403 ACCOUNT_INACTIVE | 422 | 429
```
Sets an `httpOnly; Secure; SameSite=Strict` refresh cookie. **[DECISION D4]**
Validation: `email` RFC-5322 basic, case-insensitive match; `password` non-empty. Identical error for unknown email and wrong password.

**POST /auth/refresh** → `200 { access_token, expires_in }` or `401`.
**POST /auth/logout** → `204`; revokes the refresh token.
**GET /auth/me** → `200 { "user": {…}, "permissions": [...] }`. Frontend calls this on page load to restore the session.

### 4.2 Users (ADMIN)

| Method/path | Perm | MVP |
|---|---|---|
| `GET /users?q=&role=&status=&page=&page_size=` | `users.manage` | ✔ |
| `POST /users` | `users.manage` | ✔ |
| `GET /users/{id}` | `users.manage` | ✔ |
| `PATCH /users/{id}` | `users.manage` | ✔ |
| `POST /users/{id}/status` | `users.manage` | ✔ |
| `GET /users/directory` | authenticated | ✔ |

**POST /users**
```json
→ { "name": "New Person", "email": "new@agency.gov", "role": "CLERK",
    "organization": "Digital Forensic Laboratory", "temporary_password": "…" }
← 201 { …User… , "must_change_password": true }
← 409 CONFLICT (email exists) | 422 (name/email/role/organization required; password policy)
```
`temporary_password` policy: min 12 chars **[DECISION D4]**; server hashes with argon2id/bcrypt; never returned. Alternative: server generates a one-time setup link instead of a password — **[DECISION D4]**.

**PATCH /users/{id}** — any of `name, email, role, organization`. Rules enforced server-side:
- caller cannot change their own `role`;
- cannot demote/deactivate the **last active ADMIN** → `409 CONFLICT`.

**POST /users/{id}/status** → `{ "status": "INACTIVE", "reason": "…" }`. Caller cannot deactivate self (`409`). Deactivation revokes all refresh tokens for that user.

**GET /users/directory** → `200 { "items": [ {UserRef}, … ] }` — names only, for any signed-in user (replaces the mock `getUserDirectory`).

### 4.3 Cases

| Method/path | Perm | Scope | MVP |
|---|---|---|---|
| `GET /cases?q=&status=&type=&priority=&investigator_id=&page=&page_size=` | `cases.view` | filtered to assigned unless `view_all` | ✔ |
| `POST /cases` | `cases.create` | creator auto-assigned as lead | ✔ |
| `GET /cases/{id}` | `cases.view` | assigned, else 404 | ✔ |
| `PATCH /cases/{id}` | `cases.update` | assigned | ✔ |
| `PUT /cases/{id}/assignments` | `cases.assign` | — | ✔ |
| `GET /cases/{id}/evidence` | `evidence.view` | assigned | ✔ |
| `GET /cases/{id}/reports` | `reports.view` | assigned | ✔ |
| `GET /cases/{id}/documents` | `cases.view` | assigned | [LATER] |
| `POST /cases/{id}/documents` | `documents.manage` | assigned | [LATER] |
| `DELETE /cases/{id}/documents/{doc_id}` | `documents.manage` | assigned | [LATER] |
| `GET /cases/{id}/timeline` | `cases.view` | assigned | [LATER] (frontend composes it client-side today) |

**POST /cases**
```json
→ { "title": "…", "type": "Cybercrime", "priority": "HIGH", "description": "…" }
← 201 { …Case… }      422: title (3–200), type (1–80), description (1–4000), priority enum
```
**PATCH /cases/{id}** → any of `title, status, priority, description`. Status transitions: `ARCHIVED` is terminal → `409`.
**PUT /cases/{id}/assignments** → `{ "user_ids": ["…", "…"] }` → `200 { …Case with assignments… }`. Must keep at least the lead investigator (`422`).

### 4.4 Evidence

| Method/path | Perm | Scope | MVP |
|---|---|---|---|
| `GET /evidence?q=&case_id=&integrity_status=&evidence_type=&page=&page_size=` | `evidence.view` | visible cases | ✔ |
| `POST /cases/{case_id}/evidence` (multipart) | `evidence.upload` | assigned | ✔ |
| `GET /evidence/{id}` | `evidence.view` | assigned | ✔ |
| `GET /evidence/{id}/download` | `evidence.download` | assigned | ✔ (streams) |
| `GET /evidence/{id}/custody` | `custody.view` | assigned | ✔ |
| `GET /evidence/{id}/verifications` | `verification.view` | assigned | ✔ |
| `POST /evidence/{id}/verifications` | `verification.run` | assigned | ✔ |
| `GET /evidence/{id}/ledger` | `custody.view` | assigned | ✔ |
| `POST /evidence/{id}/analysis` | `ai.submit` | assigned | [LATER] |

**POST /cases/{case_id}/evidence** — `multipart/form-data`
```
file:            binary (required)
evidence_type:   VIDEO | AUDIO | DOCUMENT | IMAGE_ARCHIVE | DISK_IMAGE | LOG_FILE (required)
description:     string 1–2000 (required)
client_sha256:   64 hex chars (optional, advisory — see §5.3)
```
```json
← 201 { …Evidence…, "integrity_status": "PENDING_LEDGER", "ledger": { "status": "PENDING", … },
        "client_hash_matched": true }
← 413 PAYLOAD_TOO_LARGE | 415 UNSUPPORTED_MEDIA_TYPE | 422 | 503 (storage)
```
Server rules: max size **[DECISION D3]** default 100 MB; allow-list per `evidence_type` (same table as `src/api/evidence.js ALLOWED_EXTENSIONS`) **plus** magic-byte sniffing; empty file → 422; server computes SHA-256 while streaming to storage; if `client_sha256` is present and differs, the upload **still succeeds** but `client_hash_matched: false` and an audit event `CLIENT_HASH_MISMATCH` is written (the file may have changed between browser hashing and upload; the server hash is authoritative).

Response is returned **before** the ledger write completes (`ledger.status: PENDING`). Client polls `GET /evidence/{id}` or `/ledger`.

**GET /evidence/{id}/download** → streams bytes with `Content-Disposition: attachment`, `X-TRACE-SHA256: <persisted_sha256>`. Writes an `ACCESSED`/`DOWNLOADED` custody event and an audit entry. ADMIN is denied by default **[DECISION D7]**.

**GET /evidence/{id}/ledger**
```json
← 200 { "evidence_id": "…", "network": "FABRIC_TESTNET",
        "entries": [ { "event_type": "REGISTERED", "sha256": "…", "tx_ref": "…", "block": 1203,
                       "recorded_at": "…", "status": "CONFIRMED", "explorer_url": null } ],
        "last_synced_at": "…" }
← 503 DEPENDENCY_UNAVAILABLE { "dependency": "ledger" }
```
`status` per entry: `SUBMITTED | CONFIRMED | FAILED`. Only `CONFIRMED` entries count as "recorded on-chain" in the UI.

### 4.5 Verification

**POST /evidence/{id}/verifications** → body `{}` (or `{ "kind": "LEDGER_ONLY" }` [LATER]) → `202 { …Verification with result… }` for small files, or `202 { "id": "…", "result": "PENDING" }` for large objects; poll `GET /evidence/{id}/verifications/{vid}` **[DECISION: sync vs async threshold]**. Writes `INTEGRITY_VERIFIED` custody event and updates `integrity_status` (`VERIFIED` or `MISMATCH`). **Never modifies the persisted hash.**

**GET /evidence/{id}/verifications** → paginated list, newest first.

### 4.6 Custody transfers

| Method/path | Perm | Scope | MVP |
|---|---|---|---|
| `POST /evidence/{id}/transfers` | `custody.transfer` | caller is current custodian **or** lead investigator of the case | ✔ |
| `GET /transfers?status=PENDING&direction=incoming` | `custody.view` | own | ✔ (if approval mode) |
| `POST /transfers/{id}/accept` | `custody.hold` | caller is `to_user` | ✔ (if approval mode) |
| `POST /transfers/{id}/reject` | `custody.hold` | caller is `to_user` | ✔ (if approval mode) |
| `GET /evidence/{id}/transfer-recipients` | `custody.transfer` | assigned | ✔ |

**POST /evidence/{id}/transfers**
```json
→ { "to_user_id": "…", "reason": "Move to lab for imaging." }
← 201 { "transfer": { "id": "…", "status": "PENDING", "evidence_id": "…",
                      "from_user": {…}, "to_user": {…}, "reason": "…", "requested_at": "…" },
        "event": { …CustodyEvent CUSTODY_TRANSFER_REQUESTED… } }
← 403 | 404 | 409 (recipient is already custodian; another transfer pending) | 422 (reason 1–1000; recipient must be ACTIVE, hold `custody.hold`, and be assigned to the case)
```
**Transfer mode [DECISION D5]:** *two-step* (request → recipient accepts, custody changes on accept, ledger write on accept) vs *immediate* (the mock's behaviour). Recommended: two-step. Endpoints above are specified for two-step; in immediate mode `accept/reject` are dropped and `POST …/transfers` returns `status: COMPLETED`.

**GET /evidence/{id}/transfer-recipients** → `{ "items": [UserRef + role] }` using the identical rule the server applies on transfer (so the dropdown never offers someone the server will reject).

### 4.7 Blockchain status

| Method/path | Perm | MVP |
|---|---|---|
| `GET /ledger/status` | authenticated | ✔ |
| `GET /ledger/transactions/{tx_ref}` | `custody.view` + visibility of the referenced evidence | ✔ |

**GET /ledger/status** → `200 { "network": "FABRIC_TESTNET", "adapter": "fabric-gateway" | "mock-ledger", "reachable": true, "last_block": 1203, "checked_at": "…" }`. The UI shows a persistent banner when `adapter` is `mock-ledger` or `reachable` is false.

**GET /ledger/transactions/{tx_ref}** → `200 { "tx_ref": "…", "status": "CONFIRMED", "block": 1203, "recorded_at": "…", "payload": { "evidence_id": "…", "event_type": "…", "sha256": "…" } }`.

### 4.8 AI analysis **[LATER]**

| Method/path | Perm | Scope |
|---|---|---|
| `POST /evidence/{id}/analysis` | `ai.submit` | assigned |
| `GET /analysis/{job_id}` | `ai.view` | assigned via evidence |
| `GET /evidence/{id}/analysis` | `ai.view` | assigned (latest job) |

`POST` → `202 { "job_id": "…", "status": "QUEUED" }`; `415` if format unsupported **[DECISION D6]**; `409` if a job is already running. The backend, not the browser, sends the object to the AI service. Results are always `is_draft: true` with the fixed disclaimer. AI output never changes `integrity_status`.

### 4.9 Reports

| Method/path | Perm | Scope | MVP |
|---|---|---|---|
| `GET /reports?case_id=&status=&page=` | `reports.view` | visible cases | ✔ |
| `POST /cases/{case_id}/reports` | `reports.create` | assigned | ✔ |
| `GET /reports/{id}` | `reports.view` | assigned | ✔ |
| `PATCH /reports/{id}` | `reports.create` + author | assigned, DRAFT only | [LATER] |
| `POST /reports/{id}/finalize` | `reports.create` + author | DRAFT → FINAL | [LATER] |
| `GET /reports/{id}/export` (PDF) | `reports.view` | assigned | [LATER] |

**POST /cases/{case_id}/reports** → `{ "title": "…", "summary": "…" }` → `201 { …Report DRAFT… }`.

### 4.10 Audit

| Method/path | Perm | MVP |
|---|---|---|
| `GET /audit?actor_id=&action=&target_type=&target_id=&outcome=&from=&to=&page=&page_size=` | `audit.view` | ✔ |

Append-only; no write endpoint. Includes DENIED outcomes. Sorted newest first.

### 4.11 Health
`GET /health` → `200 { "status": "ok", "version": "…", "dependencies": { "database": "ok", "storage": "ok", "ledger": "degraded", "ai": "down" } }` (503 if database is down). Public, no secrets.

---

## 5. Evidence lifecycle and hash terminology

### 5.1 Four different hashes — never conflate them in the UI

| Term | Where computed | Field | Trust level |
|---|---|---|---|
| **Client-calculated hash** | Browser, Web Crypto, before/without upload | `client_sha256` request field; `utils/hash.js` | Advisory only. Proves nothing about what the server stored. |
| **Persisted hash** | Backend, while streaming the upload to storage | `hash.persisted_sha256` | The system's reference value. Trusted as much as the database is. |
| **Ledger-recorded hash** | Copied by backend into a blockchain transaction | `ledger.recorded_sha256` + `tx_ref`, status `RECORDED`/`CONFIRMED` | Tamper-evident once the transaction is confirmed. |
| **Recalculated hash** | Backend, re-reading the stored object during verification | `recalculated_sha256` in a Verification | Compared against the other two to produce `result`. |

A **verified transaction reference** is a `tx_ref` that the adapter has confirmed exists on the ledger (`status: CONFIRMED`) and whose payload hash equals the persisted hash. Only then may the UI say "recorded on blockchain". `PENDING`/`SUBMITTED` must be shown as pending; `mock-ledger` must be shown as mock.

### 5.2 Intended flow

```
1. OFFICER uploads file  ──POST /cases/{id}/evidence──►  FastAPI
2. FastAPI: auth → permission → case assignment → size/type/magic-byte validation
3. Stream to off-chain storage, computing SHA-256 on the fly  → persisted_sha256, storage.reference
4. DB: evidence row (integrity_status=PENDING_LEDGER), custody event REGISTERED, audit entry
5. Async: ledger adapter submits {evidence_id, sha256, event, actor, at}  → tx_ref
      on confirm: ledger.status=RECORDED, integrity_status=RECORDED, event.ledger updated
      on failure: ledger.status=FAILED, integrity_status=PENDING_LEDGER, retry with backoff; UI shows "not yet recorded"
6. Verification (POST …/verifications): re-read object → recalculated; compare with persisted and ledger
      all equal → MATCH, integrity_status=VERIFIED
      recalculated≠persisted → MISMATCH (storage tampering or corruption)
      ledger unreachable → LEDGER_UNAVAILABLE (do not claim verified)
7. AI (POST …/analysis): backend fetches object, calls AI service, stores job; result is labelled draft and never affects steps 3–6
```

`integrity_status` semantics: `REGISTERED` (persisted, ledger not attempted) → `PENDING_LEDGER` → `RECORDED` → `VERIFIED` (after a MATCH verification) or `MISMATCH`; `LEDGER_UNAVAILABLE` is a transient display state.

### 5.3 Client-side hashing's role after integration

The existing browser SHA-256 stays useful for two things only: (a) sending `client_sha256` so the server can flag a transit discrepancy, and (b) the "Hash a local file…" convenience on the verification page, which compares a local file against the **persisted** hash returned by the API. The UI label for that must remain "local comparison — not a backend or blockchain verification".

### 5.4 What AI does not do
AI results never set `integrity_status`, never appear in `Verification`, and are always `is_draft: true` with a disclaimer. Investigators decide; AI drafts.

---

## 6. Open decisions **[DECISION]** — team confirmation required

| # | Decision | Recommended MVP default | Why / trade-off | Owner |
|---|---|---|---|---|
| D1 | **Ledger: Hyperledger Fabric vs Solana** | **Fabric test-network (local, Docker)**, behind a `LedgerAdapter` interface with a `mock-ledger` implementation for development | Matches the paper and the permissioned multi-agency story; heavier to run. Solana is easier to spin up but public/ fee-based and off-narrative. The contract above is chain-agnostic: only `network`, `tx_ref`, `block`, `explorer_url` differ. | Aadi |
| D2 | **Database** | **PostgreSQL 16 in Docker** (SQLAlchemy + Alembic) | SQLite (in the context doc) is fine for a single-process demo but blocks concurrent uploads/ledger workers; Postgres costs one container. | Mathew |
| D3 | **Evidence storage + limits** | **MinIO** (S3 API) with server-side encryption (SSE-S3) and object lock; 100 MB/file MVP; allow-list per type + magic bytes | IPFS adds a node and CID semantics for no MVP benefit; can be added as a second `StorageProvider`. Client-side AES (context doc) would prevent server hashing and AI — propose deferring. | Mathew |
| D4 | **Auth/session** | **Email + password (argon2id), 15-min JWT access token in memory, 7-day httpOnly refresh cookie, `/auth/refresh`**; admin-set temporary password with forced change on first login | Simplest secure default; DID login remains a stretch goal. Alternative: server-side opaque sessions (simpler revocation, needs sticky store). | Mathew |
| D5 | **Custody transfer approval** | **Two-step (request → accept/reject)**; custody changes and ledger write happen on accept | Mirrors real chain-of-custody sign-off; adds two endpoints and an inbox. The mock currently does immediate transfer. | Mathew + Aadi |
| D6 | **AI interface & formats** | HTTP service `POST /analyze` (multipart or signed URL) → async job; MVP formats **PDF, TXT, DOCX**; outputs summary, entities, timeline, classification with confidences and source spans | Images/video/OCR later. Decide sync vs async by expected latency. | Jijo |
| D7 | **ADMIN evidence download** | **Denied** (metadata only) | Separation of duties; easy to flip. | Team |
| D8 | **Verification sync/async** | Sync up to 50 MB, async job above | Depends on storage throughput. | Mathew |

---

## 7. Mismatches between this contract and the current frontend

Found by reading `src/api/*.js`, `src/pages/**`, `src/components/**` (none are blockers; all are handled by the adapter layer described in INTEGRATION_PLAN.md):

1. **Actor/author/custodian shape.** UI reads `event.actor`, `report.author` as strings and resolves `uploaded_by`/`current_custodian` ids via `getUserDirectory`. Contract returns `UserRef` objects.
2. **Field renames.** `upload_timestamp→registered_at`, `size→size_bytes`, `file_type→evidence_type` (+ enum casing), `sha256→hash.persisted_sha256`, `cid→storage.reference` (+ provider), `transaction_id→ledger.tx_ref`, `timestamp→occurred_at`, `generated_at→created_at`, `opened_date→opened_at`, `investigator→lead_investigator`, `assigned_user_ids→assignments[]`.
3. **Enum sets.** Evidence `status` (`PENDING_VERIFICATION|VERIFIED|FLAGGED|UNDER_REVIEW`) → `integrity_status` (§3.4). `StatusBadge` needs tones for the new values.
4. **Verification record.** UI reads `source`, `recorded_sha256`, `current_sha256`, `placeholder_reference`, `checked_at/by/filename`. Contract: `kind`, `persisted_sha256`, `recalculated_sha256`, `ledger_sha256`, `ledger_tx_ref`, `verified_at/by`. The "hash a local file" path becomes purely client-side (no POST).
5. **404 vs 403 for hidden resources.** Pages branch on `err.status === 403` → AccessDenied. Under the contract hidden resources are 404; pages should treat both as "not available to you".
6. **No pagination in the UI.** Every list page loads everything. The adapter can request `page_size=100` for MVP; proper pagination is UI work later.
7. **`ACCESS_REQUESTED` / "Pending Access Requests" tile** has no producer. Replace with pending incoming transfers (D5) or drop.
8. **Case `documents` are embedded** in the mock case object; the contract has `/cases/{id}/documents`. Adapter can fetch and attach for now.
9. **`getRecentCustodyEvents`** (dashboard) has no endpoint; add `GET /custody/events?limit=6` (visible cases, newest first) — **added as MVP** below.
10. **Reader scoping of the evidence list** currently relies on the mock filtering by case; backend must do the same (§2.3).
11. **`BASE_URL` default** is `/api` (no version). Change to `/api/v1`.
12. **Frontend `IDs`** (`TRC-…`, `EVD-…`) are used as route params. Under the contract routes should use UUID `id`; `display_id` is shown. Links in `RecentActivityList`, tables, breadcrumbs need `row.id`, which is already how they're written — only the value changes.

Addendum to §4: `GET /custody/events?limit=&since=` — `custody.view`, visible cases, newest first. **MVP** (dashboard).

---

## 8. Validation summary (server-side, authoritative)

| Field | Rule |
|---|---|
| email | trimmed, lower-cased, basic RFC format, unique (case-insensitive) |
| password / temporary_password | ≥ 12 chars (D4), not equal to email, argon2id/bcrypt |
| name, organization | 1–120 chars, trimmed |
| role | enum |
| case.title | 3–200 · case.type 1–80 · description 1–4000 |
| evidence.description | 1–2000 · evidence_type enum · file non-empty, ≤ limit, extension ∈ allow-list, magic bytes match |
| reason (transfer) | 1–1000 |
| report.title | 3–200 · summary 0–8000 |
| page_size | 1–100 |

All string inputs are trimmed. All enums are validated. Unknown JSON fields are rejected (`422`) to catch client/server drift early.
