# TRACE frontend — manual browser test checklist

Run `npm run dev` and open the printed URL (if port 5173 is taken by another project, Vite picks
another port — check the terminal). Tick each line only after seeing it in a browser.

Status key: `[ ]` not yet checked in a browser · `[x]` passed · `[!]` failed (note the issue).

Automated coverage: `npm run check:api` exercises the mock API layer (login, scoping, validation,
hashing, transfers, user management) under Node. It does **not** render any UI, so every item below
still needs a human pass. Items ticked 2026-11-24 were also verified with an automated headless-Chrome run (50/50 checks, no console errors on the pages visited).

## 0. Startup and login page (no account)
- [X] App loads; browser tab title is "TRACE — Forensic Evidence Management".
- [X] Visiting `/` or `/dashboard` while signed out redirects to `/login`.
- [x] Visiting `/users` while signed out redirects to `/login`, and after signing in as ADMIN you land on `/users`.
  Fixed in Login.jsx (saved destination now honoured). Verified in browser 2026-11-24.
- [X] Empty submit shows "Email is required." and "Password is required." under the fields.
- [X] `notanemail` shows "Enter a valid email address."
- [X] Wrong password shows "Invalid email or password." and clears the password field.
- [X] Unknown email shows the *same* message (no account enumeration).
- [X] Show/hide password toggle works; button label changes.
- [X] Sign-in button shows a spinner and is disabled while submitting.
- [X] Narrow window (< 1024px): left branding panel hides, compact header appears, no horizontal scroll.

## 1. ADMIN — admin@trace.local / Admin@123
- [X] Lands on `/dashboard`; header shows "Alex Morgan · Administrator · TRACE System Administration".
- [X] Sidebar shows: Dashboard, Cases, Evidence, Chain of Custody, Verification, Reports, User Management, Audit Log.
- [x] Cases: all 6 cases listed; description reads "Browse and search all forensic cases."; **no** "New case" button.
- [x] Open any case: **no** "Edit case" button; Documents tab has **no** "Register document" button.
- [x] Evidence: all 12 items; **no** "Upload Evidence" button.
- [x] Open an evidence item: **no** "Transfer Custody" button; **no** AI Analysis card; "View Verification" works.
- [x] Verification page: no "Run mock verification" / "Hash a local file…" buttons; result labelled synthetic.
- [X] User Management: 4 users listed with name, email, role label, organization, status badge.
- [X] Search by name/email/org filters; role and status filters work.
- [X] Create user with missing fields → inline error. Bad email → error. Existing email (try `OFFICER@trace.local`) → "already exists". Password < 8 → error.
- [X] Create a valid user → success banner says in-memory only; user appears in the table.
- [X] Edit that user's role/org → saved; table updates.
- [X] Deactivate that user → badge turns Inactive; row action says "Activate".
- [X] Own row shows "(you)" instead of a Deactivate button.
- [X] Edit own account and change role to READER → error "cannot remove your own administrator role".
- [X] Audit Log lists LOGIN, USER_CREATED, USER_UPDATED, USER_DEACTIVATED entries, newest first.
- [X] Log out → back at `/login`; browser Back does not re-enter the app.
- [x] Click "Activate" on the user you deactivated above, log out, then log in as that user with its temp password → works. Refresh → sent to login (user no longer exists; expected and documented).
  Verified: activate → login works → refresh sends to login (users are in memory only, expected). The earlier failure was because the user had been deactivated first.

## 2. OFFICER — officer@trace.local / Officer@123
- [X] Sidebar: Dashboard, Cases, Evidence, Chain of Custody, Verification, Reports. **No** User Management / Audit Log.
- [X] Type `/users` in the address bar → "Access denied" page inside the app layout, with link back to Dashboard. Same for `/audit`.
- [X] Cases: 6 cases (officer is assigned to all seed cases); "New case" button present.
- [X] New case with empty fields → error. Valid → success banner, new case appears at top; opens correctly.
- [X] Open a case → "Edit case" button; change title/status/priority → saved and header badges update.
- [X] Evidence → "Upload Evidence" opens the modal. Case dropdown lists only assigned cases.
- [X] Submit with no file → "Select a file to register."
- [X] Pick a 0-byte file → "The selected file is empty."
- [X] Pick `.exe` (or any file with a wrong extension for the chosen type) → "not accepted … Allowed: …".
- [X] Pick a `.pdf` with type "Video" → rejected; switch type to "Document" → accepted.
- [X] Drag-and-drop a file onto the dashed area → filename and size shown; X clears it.
- [X] Valid upload → modal closes, green banner "Evidence registered (mock environment)" with the new ID; row at top of the list with status "Pending Verification".
- [X] Dashboard → "Total Evidence Items" increased by 1 and item appears under Recent Evidence.
- [x] Open the new item: yellow "Mock registration" banner; SHA-256 tagged "Calculated locally in browser · not blockchain-recorded"; CID says "None — file was not stored anywhere"; Custody History shows one REGISTERED event with no Ref line.
- [X] Open a seed item (e.g. EVD-2026-00231): SHA-256 tagged "Synthetic demo value"; CID tagged "Synthetic placeholder".
- [X] AI Analysis (placeholder) card is visible and clearly says no model is connected.
- [X] Transfer Custody: dropdown excludes yourself and Priya Nair (READER); empty reason → error; valid → custodian changes and a CUSTODY_TRANSFERRED event appears with "Simulated — not recorded on a blockchain".
  A green banner now appears after a transfer; the new event is at the BOTTOM of Custody History (oldest first). Verified in browser 2026-11-24.
- [X] Verification page for the new item: "Run mock verification" → result says "(synthetic)". "Hash a local file…" with the **same** file → "Hashes match (local comparison)" and the Calculated SHA-256 equals the Recorded one. With a **different** file → "Hash mismatch (local comparison)"; Recorded SHA-256 is unchanged.
- [X] Verification for EVD-2026-00258 (seed FLAGGED item) shows a synthetic mismatch.
- [x] Both info banners on the verification page are present: source label + "Not yet available" (backend/blockchain).
- [X] Reports → "New draft report" → appears with DRAFT badge; also shows under the case's Reports tab.
- [X] Refresh the browser → still signed in as Officer; the uploaded evidence, new case and draft report are **gone** (documented behaviour).

## 3. CLERK — clerk@trace.local / Clerk@123
- [X] Sidebar: Dashboard, Cases, Evidence, Chain of Custody, Verification, Reports.
- [X] Cases: 5 cases (not TRC-2025-0967). Description says "Cases assigned to you." **No** "New case".
- [X] Type `/cases/TRC-2025-0967` → "You are not assigned to this case."
- [X] Open a case: **no** "Edit case". Documents tab → "Register document" button present.
- [X] Register a document with empty title → error; valid → appears with "metadata only (mock)"; trash icon removes it.
- [X] Evidence: **no** "Upload Evidence" button. Type `/evidence/EVD-2025-00812` (archived case) → access denied.
- [X] Open an evidence item: **no** "Transfer Custody"; **no** AI card.
- [X] Verification: no run buttons; result is read-only.
- [X] Reports: "New draft report" present and works.
- [X] `/users` and `/audit` → Access denied.

## 4. READER — reviewer@trace.local / Reviewer@123
- [X] Sidebar: Dashboard, Cases, Evidence, Chain of Custody, Verification, Reports.
- [X] Cases: 4 cases (not TRC-2026-0142 or TRC-2026-0151). No "New case", no "Edit case", no "Register document".
- [X] Evidence: only items from the 4 visible cases; no upload button.
- [X] Evidence detail: SHA-256, CID, custodian and custody history visible; no Transfer, no AI card.
- [X] Verification visible, no run buttons.
- [X] Reports: list only, **no** "New draft report".
- [x] Direct URLs `/users`, `/audit` → Access denied; `/cases/TRC-2026-0142` → not assigned; `/evidence/EVD-2026-00279` → not authorized.
  Verified: all four show "Access denied" inside the layout with the correct message. An earlier "page not found" was most likely a mistyped URL.

- [x] Dashboard "Pending Access Requests" count is 0 or only counts requests on visible evidence.
  CORRECT: shows 1 because EVD-2026-00256 (case TRC-2026-0129, which the reader is assigned to) has one pending access request. The other pending one (EVD-2026-00280) is on a case the reader can't see, so it is correctly not counted.

## 5. Cross-cutting (things that apply to every page)
- [x] Modals: as Officer open any popup (Evidence → "Upload Evidence", Cases → "New case", Evidence detail → "Transfer Custody"). Each popup must close with the X button, with the Escape key, and by clicking the dark area outside it. Try all three.
- [x] Breadcrumbs: as Admin open `/users` and `/audit`. The trail at the top should read "User Management" and "Audit Log" (not "users" / "audit").
- [x] Type `/nonexistent` in the address bar (signed in or out) → "Page not found" with a link back to the Dashboard.
- [x] Console: press F12 → Console tab, clear it, then click through every sidebar page as one role. There should be no red errors (yellow warnings are OK).
  Verified 2026-11-24 (automated): all sidebar pages plus the first case, evidence, custody and verification detail page, for all four roles — 26 pages, 0 console errors or warnings.
- [x] Deactivated account: as Admin deactivate a user you created, log out, try to log in as them → message "This account has been deactivated."

## 6. API mode (against the contract stub)

Start the stub and point the app at it (see `stub/README.md`): `npm run stub`, then run the frontend
with `VITE_API_MODE=http` and `VITE_API_BASE_URL=http://localhost:8000/api/v1`. For the transfer
approval items start the stub with `STUB_TRANSFER_MODE=two-step`. Restart the stub for a clean
state. Same demo accounts as above.

Verified 2026-11-24 with an automated headless-Chrome run (not yet by hand):
- [x] Tables, page headers, dashboard and selects show readable codes (`TRC-…`, `EVD-…`), never UUIDs; breadcrumbs read "Case details" / "Evidence details", not a UUID.
- [x] Reader opening a hidden case or evidence sees "could not be found, or you do not have access to it" (the API returns 404 for hidden records).
- [x] A backend/network failure on a detail page says "Could not load …: <reason>" instead of "not found".
- [x] Evidence detail shows "Calculated by backend", the storage reference (MINIO) with "Encrypted at rest", and the ledger state ("Recorded on the mock ledger (not a real blockchain)" / "Pending").
- [x] Uploading evidence shows "Evidence registered" with the backend-calculated hash and ledger status — no "mock environment" wording.
- [x] Verification page: before any verification it shows a neutral "Not verified yet" box (not a red mismatch); "Run backend verification" gives "Hashes match (backend)"; ledger-not-recorded gives "Ledger unavailable — integrity not confirmed", never green.
- [x] Create user: under 12 characters is refused with the 12-character message; server field errors are shown.
- [x] Reloading any page (including a direct deep link) keeps you signed in; after logout a reload goes to the login page.
- [x] Two-step transfer: the officer's offer shows "Transfer requested…", the evidence page shows "Custody transfer pending" and hides the Transfer button; custodian is unchanged until accepted.
- [x] Dashboard tile reads "Pending custody transfers" and opens **Incoming transfers**; Accept changes the custodian, Reject asks for confirmation first and leaves custody unchanged; history shows the request, acceptance and rejection.
- [x] A Reader has no Transfers link.
- [ ] Still needs a human look: the visual layout of the Incoming transfers page and the new notices.
