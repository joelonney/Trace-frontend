// Contract stub checks. Boots the stub in-process on a free port and exercises it over real HTTP.
// Run:  node scripts/stub-check.mjs .      (also part of `npm run check`)
import path from 'node:path'
import crypto from 'node:crypto'
import { loadSeed } from '../stub/seed.mjs'
import { createStub } from '../stub/app.mjs'

const root = path.resolve(process.argv[2] ?? '.')
let pass = 0
let fail = 0
const ok = (cond, label) => {
  if (cond) pass += 1
  else fail += 1
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
}
const eq = (a, b, label) => ok(JSON.stringify(a) === JSON.stringify(b), `${label}${JSON.stringify(a) === JSON.stringify(b) ? '' : `  (got ${JSON.stringify(a)})`}`)

const seed = await loadSeed(root)
const boot = async (opts = {}) => {
  const stub = createStub({ seed: structuredClone(seed), ledgerDelayMs: 40, ...opts })
  await new Promise((r) => stub.server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${stub.server.address().port}/api/v1`
  return { stub, base }
}

const client = (base) => {
  let token = null
  let cookie = null
  const call = async (method, p, { body, form, headers = {}, auth = true } = {}) => {
    const h = { Accept: 'application/json', ...headers }
    if (auth && token) h.Authorization = `Bearer ${token}`
    if (cookie) h.Cookie = cookie
    let payload
    if (form) payload = form
    else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = typeof body === 'string' ? body : JSON.stringify(body) }
    const res = await fetch(base + p, { method, headers: h, body: payload })
    const sc = res.headers.get('set-cookie')
    if (sc) cookie = sc.split(';')[0].endsWith('=') ? null : sc.split(';')[0]
    const text = await res.text()
    let json = null
    try { json = text ? JSON.parse(text) : null } catch { /* non-json */ }
    return { status: res.status, body: json, headers: res.headers }
  }
  return {
    call,
    get: (p, o) => call('GET', p, o), post: (p, body, o) => call('POST', p, { body, ...o }),
    patch: (p, body) => call('PATCH', p, { body }), put: (p, body) => call('PUT', p, { body }), del: (p) => call('DELETE', p),
    login: async (email, password) => { const r = await call('POST', '/auth/login', { body: { email, password }, auth: false }); token = r.body?.access_token ?? null; return r },
    setToken: (t) => { token = t }, getToken: () => token,
  }
}
const as = async (base, email, pw) => { const c = client(base); const r = await c.login(email, pw); if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status}`); return c }
const CRED = {
  admin: ['admin@trace.local', 'Admin@123'], officer: ['officer@trace.local', 'Officer@123'],
  clerk: ['clerk@trace.local', 'Clerk@123'], reader: ['reviewer@trace.local', 'Reviewer@123'],
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const upload = (c, caseId, { name = 'note.txt', content = 'hello trace', type = 'DOCUMENT', desc = 'test doc', clientHash } = {}) => {
  const fd = new FormData()
  fd.append('file', new Blob([content]), name)
  fd.append('evidence_type', type)
  fd.append('description', desc)
  if (clientHash !== undefined) fd.append('client_sha256', clientHash)
  return c.call('POST', `/cases/${caseId}/evidence`, { form: fd })
}

const { stub, base } = await boot()
try {
  console.log('--- public / auth')
  const anon = client(base)
  eq((await anon.get('/health', { auth: false })).body.status, 'ok', 'GET /health is public')
  const noTok = await anon.get('/cases', { auth: false })
  ok(noTok.status === 401 && noTok.body.error.code === 'UNAUTHENTICATED', 'no token → 401 UNAUTHENTICATED')
  ok(Boolean(noTok.body.error.message), 'error body has { error: { code, message } }')
  const bad1 = await anon.login('officer@trace.local', 'wrong')
  const bad2 = await anon.login('nobody@trace.local', 'wrong')
  ok(bad1.status === 401 && bad1.body.error.code === 'INVALID_CREDENTIALS', 'wrong password → 401 INVALID_CREDENTIALS')
  eq(bad1.body.error.message, bad2.body.error.message, 'unknown email gives the same message (no enumeration)')
  const val = await anon.login('notanemail', '')
  ok(val.status === 422 && val.body.error.details.length === 2, 'invalid email + empty password → 422 with 2 field details')
  const unk = await anon.call('POST', '/auth/login', { auth: false, body: { email: 'a@b.co', password: 'x', extra: 1 } })
  ok(unk.status === 422 && unk.body.error.details[0].field === 'extra', 'unknown JSON field → 422')
  const badJson = await anon.call('POST', '/auth/login', { auth: false, body: '{nope' })
  eq(badJson.status, 400, 'malformed JSON → 400')

  const off = client(base)
  const lg = await off.login(...CRED.officer)
  ok(lg.status === 200 && lg.body.token_type === 'Bearer' && lg.body.expires_in === 900, 'login returns Bearer token + expires_in 900')
  ok(lg.body.permissions.includes('cases.create') && !lg.body.permissions.includes('users.manage'), 'login returns the officer permission list')
  ok(!JSON.stringify(lg.body).includes('password'), 'login response contains no credential material')
  ok((lg.headers.get('set-cookie') ?? '').includes('HttpOnly'), 'refresh token is an HttpOnly cookie')
  eq((await off.get('/auth/me')).body.user.email, 'officer@trace.local', 'GET /auth/me returns the user')
  const ref = await off.post('/auth/refresh', {}, { auth: false })
  ok(ref.status === 200 && typeof ref.body.access_token === 'string', 'POST /auth/refresh with cookie → new access token')
  eq((await client(base).post('/auth/refresh', {}, { auth: false })).status, 401, 'refresh without cookie → 401')
  eq((await off.post('/auth/logout', undefined)).status, 204, 'logout → 204')
  eq((await off.post('/auth/refresh', {}, { auth: false })).status, 401, 'refresh after logout → 401 (token revoked)')

  console.log('--- scoping (404 for hidden, contract §2.3)')
  const reader = await as(base, ...CRED.reader)
  const admin = await as(base, ...CRED.admin)
  const officer = await as(base, ...CRED.officer)
  const clerk = await as(base, ...CRED.clerk)
  const rCases = (await reader.get('/cases')).body
  eq(rCases.total, 4, 'reader sees 4 assigned cases')
  const allCases = (await admin.get('/cases')).body.items
  eq(allCases.length, 6, 'admin sees all 6 cases')
  const hidden = allCases.find((c) => c.display_id === 'TRC-2026-0142')
  const visible = allCases.find((c) => c.display_id === 'TRC-2026-0114')
  const hc = await reader.get(`/cases/${hidden.id}`)
  ok(hc.status === 404 && hc.body.error.code === 'NOT_FOUND', 'reader opening an unassigned case → 404 (not 403)')
  eq((await reader.get(`/cases/${visible.id}`)).status, 200, 'reader opens an assigned case')
  const allEv = (await admin.get('/evidence', { })).body
  const hiddenEv = allEv.items.find((e) => e.case_display_id === 'TRC-2026-0142')
  eq((await reader.get(`/evidence/${hiddenEv.id}`)).status, 404, 'reader opening evidence on an unassigned case → 404')
  ok((await reader.get('/evidence')).body.items.every((e) => e.case_display_id !== 'TRC-2026-0142'), 'reader evidence list excludes hidden cases')
  eq((await reader.get(`/evidence/${hiddenEv.id}/custody`)).status, 404, 'reader custody for hidden evidence → 404')
  ok((await clerk.get('/cases')).body.items.every((c) => c.display_id !== 'TRC-2025-0967'), 'clerk does not see TRC-2025-0967')
  ok(visible.assignments === null && (await admin.get(`/cases/${visible.id}`)).body.assignments.length === 3, 'assignments omitted on list, present on detail')
  ok(typeof visible.id === 'string' && /^[0-9a-f-]{36}$/.test(visible.id) && visible.display_id === 'TRC-2026-0114', 'ids are UUIDs and display_id is separate')

  console.log('--- permissions (403)')
  const f1 = await reader.post('/cases', { title: 'xxx', type: 'x', priority: 'LOW', description: 'd' })
  ok(f1.status === 403 && f1.body.error.code === 'FORBIDDEN', 'reader cannot create a case → 403 FORBIDDEN')
  eq((await clerk.get('/users')).status, 403, 'clerk cannot list users')
  eq((await officer.get('/audit')).status, 403, 'officer cannot read audit')
  eq((await clerk.post(`/evidence/${allEv.items[0].id}/transfers`, { to_user_id: 'x', reason: 'r' })).status, 403, 'clerk cannot transfer custody')
  eq((await upload(clerk, visible.id)).status, 403, 'clerk cannot upload evidence')
  eq((await upload(admin, visible.id)).status, 403, 'admin cannot upload evidence')
  const dir = await reader.get('/users/directory')
  ok(dir.status === 200 && dir.body.items.length === 4 && !('email' in dir.body.items[0]), 'directory open to any signed-in user, names only')

  console.log('--- cases CRUD + validation')
  const v422 = await officer.post('/cases', { title: 'x', type: '', priority: 'URGENT', description: '' })
  ok(v422.status === 422 && ['title', 'type', 'priority', 'description'].every((f) => v422.body.error.details.some((d) => d.field === f)), 'create case with bad fields → 422 listing every bad field')
  const created = await officer.post('/cases', { title: 'Stub test case', type: 'Cybercrime', priority: 'HIGH', description: 'Created by stub-check' })
  ok(created.status === 201 && created.body.status === 'OPEN' && /^TRC-\d{4}-\d{4}$/.test(created.body.display_id), 'create case → 201, OPEN, display id')
  ok(created.body.assignments.length === 1 && created.body.lead_investigator.name === 'Sarah Thomas', 'creator is auto-assigned as lead')
  eq((await officer.patch(`/cases/${created.body.id}`, { status: 'UNDER_REVIEW', priority: 'LOW' })).body.status, 'UNDER_REVIEW', 'update case status')
  eq((await officer.patch(`/cases/${created.body.id}`, { status: 'NOPE' })).status, 422, 'invalid status → 422')
  await officer.patch(`/cases/${created.body.id}`, { status: 'ARCHIVED' })
  eq((await officer.patch(`/cases/${created.body.id}`, { status: 'OPEN' })).status, 409, 'ARCHIVED is terminal → 409')
  eq((await reader.get(`/cases/${created.body.id}`)).status, 404, 'new case is hidden from unassigned reader')
  const readerUserId = (await admin.get('/users?role=READER')).body.items[0].id
  const asg = await admin.put(`/cases/${created.body.id}/assignments`, { user_ids: [created.body.lead_investigator.id, readerUserId] })
  eq(asg.status, 200, 'admin assigns the reader to the case')
  eq((await reader.get(`/cases/${created.body.id}`)).status, 200, 'assigned reader can now open it')
  eq((await admin.put(`/cases/${created.body.id}/assignments`, { user_ids: [] })).status, 422, 'assignments must keep the lead investigator → 422')
  const doc = await clerk.post(`/cases/${visible.id}/documents`, { title: 'Intake form', note: 'n' })
  eq(doc.status, 201, 'clerk registers a case document')
  eq((await clerk.post(`/cases/${visible.id}/documents`, { title: '' })).status, 422, 'empty document title → 422')
  eq((await clerk.del(`/cases/${visible.id}/documents/${doc.body.id}`)).status, 204, 'clerk removes the document → 204')

  console.log('--- users (admin)')
  const strong = { name: 'New Person', email: 'new.person@agency.gov', role: 'CLERK', organization: 'Digital Forensic Laboratory', temporary_password: 'a-long-temp-pass-1' }
  const u422 = await admin.post('/users', { ...strong, temporary_password: 'short123' })
  ok(u422.status === 422 && u422.body.error.details[0].field === 'temporary_password', 'temporary password under 12 chars → 422 (contract D4)')
  eq((await admin.post('/users', { ...strong, email: 'OFFICER@trace.local' })).status, 409, 'duplicate email (case-insensitive) → 409')
  const nu = await admin.post('/users', strong)
  ok(nu.status === 201 && nu.body.must_change_password === true && !('password' in nu.body), 'create user → 201, must_change_password, no password echoed')
  const nuLogin = await client(base).login(strong.email, strong.temporary_password)
  eq(nuLogin.status, 200, 'the new user can sign in')
  const me = (await admin.get('/auth/me')).body.user
  eq((await admin.patch(`/users/${me.id}`, { role: 'READER' })).status, 409, 'admin cannot change their own role → 409')
  eq((await admin.post(`/users/${me.id}/status`, { status: 'INACTIVE' })).status, 409, 'admin cannot deactivate self → 409')
  const nuClient = client(base); nuClient.setToken(nuLogin.body.access_token)
  eq((await nuClient.get('/cases')).status, 200, 'new user token works before deactivation')
  eq((await admin.post(`/users/${nu.body.id}/status`, { status: 'INACTIVE', reason: 'test' })).body.status, 'INACTIVE', 'deactivate user')
  eq((await nuClient.get('/cases')).status, 401, 'deactivation revokes the user’s existing token')
  const inactive = await client(base).login(strong.email, strong.temporary_password)
  ok(inactive.status === 403 && inactive.body.error.code === 'ACCOUNT_INACTIVE', 'deactivated user login → 403 ACCOUNT_INACTIVE')
  const filt = (await admin.get('/users', { })).body
  eq(filt.total, 5, 'user list total counts the new user')
  eq((await admin.get('/users?role=CLERK&status=INACTIVE')).body.total, 1, 'user list filters by role + status')

  console.log('--- evidence upload + ledger lifecycle')
  const bytes = 'chain of custody test bytes'
  const goodHash = crypto.createHash('sha256').update(bytes).digest('hex')
  const up = await upload(officer, visible.id, { name: 'case_notes.txt', content: bytes, clientHash: goodHash })
  ok(up.status === 201, 'officer uploads evidence → 201')
  eq(up.body.hash.persisted_sha256, goodHash, 'server SHA-256 equals the real hash of the bytes')
  eq(up.body.hash.calculated_by, 'BACKEND', 'hash is labelled calculated by BACKEND')
  eq(up.body.client_hash_matched, true, 'matching client_sha256 → client_hash_matched true')
  ok(up.body.integrity_status === 'PENDING_LEDGER' && up.body.ledger.status === 'PENDING' && up.body.ledger.tx_ref === null, 'new evidence is PENDING_LEDGER with no tx_ref yet')
  ok(up.body.ledger.network === 'MOCK_LEDGER', 'ledger network says MOCK_LEDGER (never pretends to be Fabric)')
  await wait(150)
  const settled = (await officer.get(`/evidence/${up.body.id}`)).body
  ok(settled.ledger.status === 'RECORDED' && typeof settled.ledger.tx_ref === 'string' && settled.integrity_status === 'RECORDED', 'ledger write settles → RECORDED with tx_ref')
  eq(settled.hash.persisted_sha256, goodHash, 'persisted hash unchanged by ledger settlement')
  const mism = await upload(officer, visible.id, { name: 'b.txt', content: 'abc', clientHash: 'f'.repeat(64) })
  ok(mism.status === 201 && mism.body.client_hash_matched === false, 'wrong client hash still uploads but client_hash_matched false')
  eq((await upload(officer, visible.id, { name: 'run.exe', content: 'x' })).status, 415, 'disallowed extension → 415')
  eq((await upload(officer, visible.id, { name: 'e.txt', content: '' })).status, 422, 'empty file → 422')
  eq((await upload(officer, visible.id, { name: 'a.txt', content: 'x', type: 'NOPE' })).status, 422, 'bad evidence_type → 422')
  eq((await upload(officer, visible.id, { name: 'a.txt', content: 'x', desc: '' })).status, 422, 'empty description → 422')
  // The seed officer is assigned to every case, so use a second officer with no assignments.
  const o2 = { name: 'Second Officer', email: 'second.officer@agency.gov', role: 'OFFICER', organization: 'Cybercrime Investigation Unit', temporary_password: 'second-officer-pass-1' }
  await admin.post('/users', o2)
  const officer2 = await as(base, o2.email, o2.temporary_password)
  eq((await upload(officer2, visible.id)).status, 404, 'upload to a case the officer is not assigned to → 404')
  eq((await officer2.get('/cases')).body.total, 0, 'an unassigned officer sees no cases')
  const custodyNew = (await officer.get(`/evidence/${up.body.id}/custody`)).body.items
  ok(custodyNew.length === 1 && custodyNew[0].event_type === 'REGISTERED', 'upload writes one REGISTERED custody event')
  await wait(100)
  const led = (await officer.get(`/evidence/${up.body.id}/ledger`)).body
  ok(led.network === 'MOCK_LEDGER' && led.entries.length === 1 && led.entries[0].status === 'CONFIRMED', 'GET /evidence/:id/ledger lists the confirmed entry')
  eq((await officer.get('/ledger/status')).body.adapter, 'mock-ledger', 'GET /ledger/status reports adapter mock-ledger')
  ok((await admin.get('/audit?action=EVIDENCE_REGISTERED')).body.total >= 1, 'upload is audited')

  console.log('--- verification')
  const v0 = await officer.get(`/evidence/${up.body.id}/verifications`)
  eq(v0.body.total, 0, 'no verification yet for new evidence')
  const v1 = await officer.post(`/evidence/${up.body.id}/verifications`, {})
  ok(v1.status === 202 && v1.body.result === 'MATCH' && v1.body.recalculated_sha256 === goodHash, 'verification re-hashes stored bytes → MATCH')
  eq((await officer.get(`/evidence/${up.body.id}`)).body.integrity_status, 'VERIFIED', 'MATCH sets integrity_status VERIFIED')
  eq((await officer.get(`/evidence/${up.body.id}`)).body.hash.persisted_sha256, goodHash, 'verification never changes the persisted hash')
  const flagged = allEv.items.find((e) => e.display_id === 'EVD-2026-00258')
  const vf = await officer.post(`/evidence/${flagged.id}/verifications`, {})
  ok(vf.body.result === 'MISMATCH' && vf.body.recalculated_sha256 !== vf.body.persisted_sha256, 'flagged seed item → MISMATCH with differing hashes')
  const pendingSeed = allEv.items.find((e) => e.integrity_status === 'PENDING_LEDGER')
  const vp = await officer.post(`/evidence/${pendingSeed.id}/verifications`, {})
  ok(vp.body.result === 'LEDGER_UNAVAILABLE' && vp.body.ledger_tx_ref === null, 'ledger not recorded yet → LEDGER_UNAVAILABLE, never a green MATCH')
  eq((await reader.post(`/evidence/${(await reader.get('/evidence')).body.items[0].id}/verifications`, {})).status, 403, 'reader cannot run verification')
  eq((await officer.get(`/evidence/${flagged.id}/verifications`)).body.items[0].result, 'MISMATCH', 'verification list is newest first')

  console.log('--- custody transfer (immediate mode)')
  const ev231 = allEv.items.find((e) => e.display_id === 'EVD-2026-00231') // custodian: Daniel Mathew (clerk)
  const rec = (await officer.get(`/evidence/${ev231.id}/transfer-recipients`)).body.items
  ok(rec.every((u) => u.name !== 'Priya Nair' && u.id !== ev231.current_custodian.id), 'recipients exclude the reader and the current custodian')
  ok(rec.some((u) => u.name === 'Sarah Thomas'), 'recipients include the other eligible user')
  eq((await officer.post(`/evidence/${ev231.id}/transfers`, { to_user_id: rec[0].id, reason: '' })).status, 422, 'empty reason → 422')
  eq((await officer.post(`/evidence/${ev231.id}/transfers`, { to_user_id: ev231.current_custodian.id, reason: 'x' })).status, 409, 'transfer to current custodian → 409')
  const readerUser = (await admin.get('/users?role=READER')).body.items[0]
  eq((await officer.post(`/evidence/${ev231.id}/transfers`, { to_user_id: readerUser.id, reason: 'x' })).status, 422, 'transfer to a reader → 422')
  const sarah = rec.find((u) => u.name === 'Sarah Thomas')
  const tr = await officer.post(`/evidence/${ev231.id}/transfers`, { to_user_id: sarah.id, reason: 'Move for imaging.' })
  ok(tr.status === 201 && tr.body.transfer.status === 'COMPLETED' && tr.body.event.event_type === 'CUSTODY_TRANSFERRED', 'transfer → 201 COMPLETED with a CUSTODY_TRANSFERRED event')
  eq((await officer.get(`/evidence/${ev231.id}`)).body.current_custodian.name, 'Sarah Thomas', 'custodian changed')
  const hist = (await officer.get(`/evidence/${ev231.id}/custody`)).body.items
  ok(hist.at(-1).event_type === 'CUSTODY_TRANSFERRED' && hist[0].occurred_at <= hist.at(-1).occurred_at, 'custody history is oldest → newest, new event last')
  const recent = (await officer.get('/custody/events?limit=3')).body.items
  ok(recent.length === 3 && recent[0].occurred_at >= recent[1].occurred_at, 'GET /custody/events is newest first and honours limit')
  eq((await officer.get('/custody/events?limit=0')).status, 422, 'limit=0 → 422')

  console.log('--- reports')
  const rp = await clerk.post(`/cases/${visible.id}/reports`, { title: 'Stub draft', summary: 's' })
  ok(rp.status === 201 && rp.body.status === 'DRAFT' && rp.body.author.name === 'Daniel Mathew', 'clerk creates a DRAFT report authored by them')
  eq((await reader.post(`/cases/${visible.id}/reports`, { title: 'nope nope', summary: '' })).status, 403, 'reader cannot create reports')
  eq((await clerk.post(`/cases/${visible.id}/reports`, { title: 'ab' })).status, 422, 'short title → 422')
  ok((await reader.get('/reports')).body.items.every((r) => r.case_id !== hidden.id), 'reader report list excludes hidden cases')
  ok((await clerk.get(`/cases/${visible.id}/reports`)).body.items.some((r) => r.id === rp.body.id), 'new report shows under its case')

  console.log('--- pagination, errors, audit, CORS')
  const pg = (await admin.get('/evidence?page=1&page_size=5')).body
  ok(pg.items.length === 5 && pg.page === 1 && pg.page_size === 5 && pg.total >= 12, 'pagination envelope { items, page, page_size, total }')
  eq((await admin.get('/evidence?page_size=101')).status, 422, 'page_size 101 → 422')
  eq((await admin.get('/nope')).status, 404, 'unknown endpoint → 404 error body')
  eq((await admin.call('DELETE', '/cases')).status, 405, 'wrong method → 405')
  const au = (await admin.get('/audit?page_size=100')).body
  ok(au.items.some((a) => a.outcome === 'DENIED'), 'denied attempts are logged in the audit trail')
  ok(au.items.length > 1 && au.items[0].occurred_at >= au.items.at(-1).occurred_at, 'audit is newest first')
  const pre = await fetch(base + '/cases', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' } })
  ok(pre.status === 204 && pre.headers.get('access-control-allow-origin') === 'http://localhost:5173' && pre.headers.get('access-control-allow-credentials') === 'true', 'CORS preflight allows the Vite dev origin with credentials')
  const evil = await fetch(base + '/cases', { method: 'OPTIONS', headers: { Origin: 'http://evil.example', 'Access-Control-Request-Method': 'GET' } })
  eq(evil.headers.get('access-control-allow-origin'), null, 'CORS does not allow an unknown origin')
  const pending = (await officer.get('/transfers?status=PENDING&direction=incoming')).body
  ok(Array.isArray(pending.items), 'GET /transfers returns an envelope')
} finally {
  await stub.close()
}

console.log('--- custody transfer (two-step mode, decision D5)')
{
  const { stub: s2, base: b2 } = await boot({ transferMode: 'two-step' })
  try {
    const off = await as(b2, ...CRED.officer)
    const clk = await as(b2, ...CRED.clerk)
    const ev = (await off.get('/evidence')).body.items.find((e) => e.display_id === 'EVD-2026-00231')
    const to = (await off.get(`/evidence/${ev.id}/transfer-recipients`)).body.items.find((u) => u.name === 'Sarah Thomas')
    const t = await off.post(`/evidence/${ev.id}/transfers`, { to_user_id: to.id, reason: 'Two-step test' })
    ok(t.status === 201 && t.body.transfer.status === 'PENDING' && t.body.event.event_type === 'CUSTODY_TRANSFER_REQUESTED', 'two-step: request → PENDING')
    eq((await off.get(`/evidence/${ev.id}`)).body.current_custodian.name, 'Daniel Mathew', 'two-step: custodian unchanged until accepted')
    eq((await off.post(`/evidence/${ev.id}/transfers`, { to_user_id: to.id, reason: 'again' })).status, 409, 'two-step: second pending transfer → 409')
    eq((await clk.post(`/transfers/${t.body.transfer.id}/accept`, {})).status, 404, 'two-step: only the recipient can accept (others get 404)')
    const incoming = (await off.get('/transfers?status=PENDING&direction=incoming')).body
    ok(incoming.items.some((x) => x.id === t.body.transfer.id), 'two-step: recipient sees it as incoming')
    const acc = await off.post(`/transfers/${t.body.transfer.id}/accept`, {})
    ok(acc.status === 200 && acc.body.transfer.status === 'COMPLETED', 'two-step: recipient accepts')
    eq((await off.get(`/evidence/${ev.id}`)).body.current_custodian.name, 'Sarah Thomas', 'two-step: custodian changes on accept')
    eq((await off.post(`/transfers/${t.body.transfer.id}/accept`, {})).status, 409, 'two-step: cannot decide twice → 409')
  } finally {
    await s2.close()
  }
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
