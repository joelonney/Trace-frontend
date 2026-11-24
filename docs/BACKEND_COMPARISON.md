# Backend repo vs the frontend API contract

Reviewed 2026-11-24 from a read-only clone of <https://github.com/Aadi-Perumayan/TRACE>
(`main` = `feature/backend`, last commit `a488e88`, 2026-09-06) placed at
`../trace-backend/` next to this repo. Nothing from it was run — this is a read of the code and docs.

Compared against [`API_CONTRACT_V1.md`](./API_CONTRACT_V1.md) and the frontend as it stands today.

## 1. What actually exists

| Piece | State |
|---|---|
| **Fabric chaincode** (Go, `main.go`, `fabric-contract-api-go v1.2.2`) | ✅ Real and substantial. Per `context(new).md`: v4.0 deployed as `trace` on `mychannel` of Fabric `test-network` (Aadi's Ubuntu WSL2 + Docker Desktop), endorsed by Org1 **and** Org2. |
| **FastAPI backend** | ❌ **No code in the repo.** `backend/` holds only docs. `DEVELOPMENT.md` tells you to run `uvicorn app.main:app` and install `requirements.txt`, but neither `app/` nor `requirements.txt` nor `.env.example` is committed. The scaffold described in `API.md` may exist only on someone's machine. |
| Database, Alembic, auth, storage, AI | ❌ Not started (docs only). |
| Their `README.md` | Cut off mid-setup (ends at `cp .env.example .env`, a file that isn't there). |

So there is **nothing to run the frontend against yet**. The contract stub (`npm run stub`) remains the
integration target.

## 2. Chaincode functions → contract endpoints

| Chaincode function | Maps to | Notes |
|---|---|---|
| `UploadEvidence(id, fileHash, uploader, timestamp)` | `POST /cases/{id}/evidence` (ledger step) | `fileHash` is not validated as 64-hex SHA-256. |
| `OfferCustody(id, currentOwner, pendingOwner)` | `POST /evidence/{id}/transfers` | Sets `TRANSFER_PENDING`. |
| `AcceptCustody(id, receivingOwner)` | `POST /transfers/{id}/accept` | Back to `IN_CUSTODY`. |
| *(none)* | `POST /transfers/{id}/reject` | **Missing.** No way to reject/cancel an offer on-chain (evidence stays `TRANSFER_PENDING` forever). |
| `GetEvidenceHistory(id)` | `GET /evidence/{id}/ledger` | Returns `txId` + `timestamp` per state write. **No block number** (contract has `block`). |
| `ReadEvidence(id)` | verification (compare `fileHash` with the re-hashed file) | Fine. |
| `AddForensicReport(id, report)` | reports | One overwritable string on the evidence record; the contract models reports as separate DRAFT/FINAL resources in the database. Decide whether chaincode stores only a report **hash**. |
| *(none)* | `GET /transfers?status=PENDING&direction=incoming` | **No on-chain query/index.** The backend database must track pending transfers. |
| *(none)* | `INTEGRITY_VERIFIED`, `ACCESSED`, `DOWNLOADED` events | Not recordable on-chain today. Keep them in the database/audit log, or add a generic `RecordEvent`. |

Good news: the chaincode is a **two-step offer → accept handshake**, which is exactly what the contract
recommends in decision **D5**. The stub already supports it (`STUB_TRANSFER_MODE=two-step`).

## 3. Mismatches that need a team decision

1. **Roles.** Chaincode roles are `investigator`, `forensic`, `prosecutor`, `admin`; the frontend and
   contract use `OFFICER`, `CLERK`, `READER`, `ADMIN`. A mapping is needed, and the permissions don't
   line up:
   - `forensic` can **offer** custody and add reports but not upload; contract `CLERK` can hold custody
     but **not** transfer, and registers case documents.
   - `prosecutor` can **accept** custody; contract `READER` can **never** hold custody.
   Either change the chaincode, or the contract/frontend matrix. Needs Aadi + Mathew + Joe.
2. **Identity is caller-supplied, not taken from the certificate.** `OfferCustody` and
   `AcceptCustody` compare `currentOwner` / `receivingOwner` — plain string **arguments** — with the
   stored custodian (`main.go:95-147`). The caller's real identity (`ctx.GetClientIdentity().GetID()`)
   is never compared. Any `investigator`-role identity can offer custody *as* the current custodian,
   and any allowed role can accept *as* the pending custodian. `uploader` and `timestamp` are also
   caller-supplied (the ledger's own transaction timestamp is more trustworthy). This undermines the
   chain-of-custody guarantee and is worth fixing before integration. *(Observation from reading the
   code; Aadi should confirm.)*
3. **What string is a "custodian"?** The contract uses app user UUIDs. Decide whether chaincode
   stores the app user UUID or the Fabric enrollment id, and who maps between them.
4. **Which Fabric identity does the backend sign with?** One per app user, or one service identity per
   role? This decides how `role=` certificate attributes (and the manual NodeOU `config.yaml` copy
   step in `context(new).md`) are handled.
5. **Database: PostgreSQL or SQLite?** Their own docs disagree: `ARCHITECTURE.md` and `agents.md` say
   PostgreSQL + SQLAlchemy + Alembic (matches contract **D2**); `README.md` and the context files say
   SQLite. Pick one and record it.
6. **Evidence storage: MinIO vs IPFS** is still open in their docs (contract **D3** recommends MinIO).
   Client-side AES-256 (README "Application Layer") also conflicts with server-side hashing and AI —
   contract proposes deferring it.
7. **Python ↔ Fabric.** The chaincode is Go. To my knowledge the Fabric Gateway client libraries are
   officially provided for Go, Node.js and Java, and `fabric-sdk-py` is a community project — worth
   verifying before committing. The study plan already lists "fabric-sdk-py vs a small Node bridge" as
   an early decision; it is still open.

## 4. Smaller API-shape notes (for when Mathew's code lands)

- **Trailing slashes.** `API.md` documents `/api/v1/users/`; the contract and our client use
  `/users`. FastAPI redirects (307) between the two, which breaks cross-origin `POST`s from the
  browser. Define routes **without** a trailing slash (or disable slash redirects).
- **User model.** Scaffold takes `{username, password}`; contract takes
  `{name, email, role, organization, temporary_password}` and logs in by **email**.
- Base URL `http://localhost:8000` + `/api/v1/...` already matches our default
  `VITE_API_BASE_URL`. ✅
- JWT auth is planned (matches **D4**). ✅
- CORS must allow the frontend origin (`http://localhost:5173` in dev, `:3000` in Docker).

## 5. Impact on the frontend (new work)

- **Two-step transfers need new UI.** Today "Transfer Custody" changes the custodian immediately. With
  the chaincode's offer → accept flow, the recipient needs an inbox with **Accept** (and **Reject**,
  once the chaincode has it), the evidence page needs a "transfer pending" state, and the dashboard tile
  becomes "Pending custody transfers". Added to the task list.
- Show **"Ledger: mock"** vs **"Fabric test-network"** from `GET /ledger/status` (already planned).
- Keep the stub as the contract reference until the backend's first real endpoints exist.

## 6. Questions to send

**To Aadi (chaincode)**
1. Can `OfferCustody`/`AcceptCustody` derive the caller from the client certificate instead of
   trusting `currentOwner`/`receivingOwner`, and use the transaction timestamp?
2. Can you add `RejectCustody` (and a way to cancel an offer)?
3. Can history entries include the block number, and can `fileHash` be validated as 64-hex?
4. How should `forensic` / `prosecutor` map onto CLERK / READER — or should the matrix change?
5. Is there any on-chain way to list evidence with a pending transfer, or does the backend track it?

**To Mathew (backend)**
1. Is the FastAPI scaffold on a branch or a laptop? Please push it, even if incomplete.
2. PostgreSQL or SQLite? MinIO or IPFS?
3. Python SDK vs a Node bridge for Fabric, and which identity signs transactions?
4. Will you follow `API_CONTRACT_V1.md` (including `404` for hidden resources, `display_id`, UUID ids,
   no trailing slashes)? Which decisions D1–D8 can we close now?
