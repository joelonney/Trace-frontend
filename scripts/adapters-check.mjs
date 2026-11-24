// Adapter + HTTP wrapper checks. Runs under Node via Vite's SSR loader (same style as api-check).
// Also asserts that VITE_API_MODE=http selects the HTTP implementation.
process.env.VITE_API_MODE = 'http'
import { createServer } from 'vite'

const root = process.argv[2]
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' })

let pass = 0
let fail = 0
const ok = (cond, label) => {
  if (cond) pass += 1
  else fail += 1
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
}
const eq = (a, b, label) => ok(JSON.stringify(a) === JSON.stringify(b), `${label}${JSON.stringify(a) === JSON.stringify(b) ? '' : `  (got ${JSON.stringify(a)})`}`)

// Representative contract payloads (API_CONTRACT_V1 §3)
const ref = (id, name, org = 'Cybercrime Investigation Unit') => ({ id, name, organization: org })
const CASE = {
  id: '9a3f', display_id: 'TRC-2026-0114', title: 'Riverside', type: 'Burglary', status: 'OPEN', priority: 'HIGH',
  description: 'd', lead_investigator: ref('u2', 'Sarah Thomas'), organization: 'Cybercrime Investigation Unit',
  opened_at: '2026-06-02T00:00:00Z',
  assignments: [{ user: ref('u2', 'Sarah Thomas'), role: 'OFFICER', assigned_at: 'x' }, { user: ref('u3', 'Daniel Mathew', 'Lab'), role: 'CLERK', assigned_at: 'x' }],
  evidence_count: 2, created_at: 'x', updated_at: 'x',
}
const EVIDENCE = {
  id: 'b04d', display_id: 'EVD-2026-00231', case_id: '9a3f', case_display_id: 'TRC-2026-0114',
  filename: 'cctv.mp4', evidence_type: 'VIDEO', mime_type: 'video/mp4', size_bytes: 482193408, description: 'd',
  uploaded_by: ref('u2', 'Sarah Thomas'), registered_at: '2026-06-02T23:52:11Z',
  current_custodian: ref('u3', 'Daniel Mathew', 'Lab'), integrity_status: 'RECORDED',
  hash: { algorithm: 'SHA-256', persisted_sha256: 'a'.repeat(64), calculated_by: 'BACKEND', calculated_at: 'x' },
  storage: { provider: 'MINIO', reference: 'evidence/9a3f/b04d', encrypted_at_rest: true },
  ledger: { status: 'RECORDED', network: 'FABRIC_TESTNET', tx_ref: 'f1c0', recorded_sha256: 'a'.repeat(64), recorded_at: 'x', last_checked_at: 'x' },
}
const EVENT = {
  id: 'c17e', evidence_id: 'b04d', event_type: 'CUSTODY_TRANSFERRED', status: 'COMPLETED',
  actor: ref('u2', 'Sarah Thomas'), from_user: ref('u2', 'Sarah Thomas'), to_user: ref('u3', 'Daniel Mathew', 'Lab'),
  reason: 'lab', occurred_at: '2026-06-03T08:10:47Z', ledger: { status: 'RECORDED', tx_ref: 'tx1', recorded_at: 'x' },
}
const VERIF = {
  id: 'e5', evidence_id: 'b04d', kind: 'BACKEND', result: 'MATCH', recalculated_sha256: 'a'.repeat(64),
  persisted_sha256: 'a'.repeat(64), ledger_sha256: 'a'.repeat(64), ledger_tx_ref: 'f1c0',
  verified_by: ref('u2', 'Sarah Thomas'), verified_at: '2026-06-10T10:00:00Z', notes: null,
}
const REPORT = { id: 'r9', display_id: 'RPT-2026-0041', case_id: '9a3f', title: 'T', summary: 's', status: 'DRAFT', author: ref('u2', 'Sarah Thomas'), created_at: '2026-06-10T10:00:00Z', updated_at: 'x', ai_assisted: false, content: null }
const AUDIT = { id: 'a1', occurred_at: '2026-06-03T09:00:00Z', actor: ref('u1', 'Alex Morgan', 'Admin'), action: 'USER_DEACTIVATED', target_type: 'USER', target_id: 'u5', target_display: 'clerk@trace.local', detail: 'd', ip_address: '10.0.0.5', outcome: 'SUCCESS' }

// Fields the UI reads today (extracted from src/pages + src/components in the planning phase).
const UI_FIELDS = {
  case: ['id', 'title', 'type', 'status', 'priority', 'description', 'investigator', 'investigator_id', 'organization', 'opened_date', 'assigned_user_ids', 'documents'],
  evidence: ['id', 'case_id', 'filename', 'file_type', 'description', 'size', 'sha256', 'hash_source', 'cid', 'uploaded_by', 'upload_timestamp', 'current_custodian', 'status', 'is_mock_registration'],
  event: ['id', 'evidence_id', 'event_type', 'status', 'actor', 'organization', 'reason', 'timestamp', 'transaction_id'],
  verification: ['evidence_id', 'source', 'match', 'recorded_sha256', 'current_sha256', 'placeholder_reference', 'checked_at', 'checked_by', 'checked_filename'],
  report: ['id', 'case_id', 'title', 'summary', 'status', 'author', 'generated_at'],
  audit: ['id', 'timestamp', 'actor_name', 'action', 'target', 'detail'],
}
const hasAll = (obj, keys) => keys.filter((k) => !(k in obj))

try {
  const A = await server.ssrLoadModule('/src/api/adapters.js')
  const mode = await server.ssrLoadModule('/src/api/mode.js')
  const { createHttp } = await server.ssrLoadModule('/src/api/http.js')
  const { ApiError } = await server.ssrLoadModule('/src/api/client.js')
  const Badge = await server.ssrLoadModule('/src/components/common/StatusBadge.jsx')

  console.log('\n--- mode')
  ok(mode.useMock === false && mode.API_MODE === 'http', 'VITE_API_MODE=http selects the HTTP implementation')

  console.log('\n--- adapters: every UI field present')
  const c = A.toCase(CASE)
  eq(hasAll(c, UI_FIELDS.case), [], 'toCase has all UI fields')
  const e = A.toEvidence(EVIDENCE)
  eq(hasAll(e, UI_FIELDS.evidence), [], 'toEvidence has all UI fields')
  const ev = A.toCustodyEvent(EVENT)
  eq(hasAll(ev, UI_FIELDS.event), [], 'toCustodyEvent has all UI fields')
  const v = A.toVerification(VERIF)
  eq(hasAll(v, UI_FIELDS.verification), [], 'toVerification has all UI fields')
  const r = A.toReport(REPORT)
  eq(hasAll(r, UI_FIELDS.report), [], 'toReport has all UI fields')
  const a = A.toAuditEvent(AUDIT)
  eq(hasAll(a, UI_FIELDS.audit), [], 'toAuditEvent has all UI fields')

  console.log('\n--- adapters: values')
  eq([c.investigator, c.investigator_id, c.opened_date, c.assigned_user_ids], ['Sarah Thomas', 'u2', '2026-06-02T00:00:00Z', ['u2', 'u3']], 'case mapping')
  eq([e.file_type, e.size, e.sha256.length, e.hash_source, e.upload_timestamp, e.uploaded_by, e.current_custodian, e.status], ['Video', 482193408, 64, 'BACKEND', '2026-06-02T23:52:11Z', 'u2', 'u3', 'RECORDED'], 'evidence mapping')
  ok(e.cid === null && e.storage.provider === 'MINIO', 'non-IPFS storage reference is not presented as a CID')
  eq(A.toEvidence({ ...EVIDENCE, storage: { provider: 'IPFS', reference: 'bafy…' } }).cid, 'bafy…', 'IPFS reference is presented as a CID')
  ok(e.is_mock_registration === false, 'backend evidence is never flagged as mock registration')
  eq([ev.actor, ev.organization, ev.timestamp, ev.transaction_id], ['Sarah Thomas', 'Cybercrime Investigation Unit', '2026-06-03T08:10:47Z', 'tx1'], 'custody event mapping')
  eq(A.toCustodyEvent({ ...EVENT, ledger: { status: 'PENDING', tx_ref: 'tx1' } }).transaction_id, null, 'PENDING ledger → no transaction_id')
  eq(A.toCustodyEvent({ ...EVENT, ledger: { status: 'FAILED', tx_ref: null } }).transaction_id, null, 'FAILED ledger → no transaction_id')
  eq(A.toCustodyEvent({ ...EVENT, ledger: null }).transaction_id, null, 'null ledger → no transaction_id')
  eq(A.toEvidence({ ...EVIDENCE, ledger: { status: 'PENDING', tx_ref: null } }).transaction_id, null, 'evidence with pending ledger → no transaction_id')
  eq([v.source, v.match, v.recorded_sha256 === v.current_sha256, v.placeholder_reference, v.checked_by, v.checked_at], ['BACKEND', true, true, 'f1c0', 'Sarah Thomas', '2026-06-10T10:00:00Z'], 'verification mapping')
  for (const res of ['MISMATCH', 'LEDGER_UNAVAILABLE', 'STORAGE_UNAVAILABLE', 'PENDING', null]) {
    eq(A.toVerification({ ...VERIF, result: res }).match, false, `result ${res} never renders as match`)
  }
  eq([r.author, r.generated_at, r.status], ['Sarah Thomas', '2026-06-10T10:00:00Z', 'DRAFT'], 'report mapping')
  eq([a.actor_name, a.timestamp, a.target, a.action], ['Alex Morgan', '2026-06-03T09:00:00Z', 'clerk@trace.local', 'USER_DEACTIVATED'], 'audit mapping')
  eq(A.toAuditEvent({ ...AUDIT, actor: null }).actor_name, 'System', 'audit event without actor → System')
  eq(A.items({ items: [1, 2], page: 1, page_size: 25, total: 2 }), [1, 2], 'items() unwraps a page')
  eq(A.items([3]), [3], 'items() passes a bare array')
  eq(A.items(null), [], 'items() tolerates null')
  for (const t of Object.keys(A.EVIDENCE_TYPE_LABELS)) {
    ok(A.evidenceLabelToType(A.evidenceTypeToLabel(t)) === t, `evidence type round-trips: ${t}`)
  }
  const an = A.toAnalysis({ id: 'j7', evidence_id: 'b04d', status: 'COMPLETED', is_draft: true, service: { model: 'm' }, result: { summary: 's' } })
  ok(an.synthetic === false && an.is_draft === true && an.model === 'm' && an.summary === 's', 'analysis mapping keeps draft flag')

  console.log('\n--- status badge tones for contract enums')
  const src = await import('node:fs').then((fs) => fs.readFileSync(`${root}/src/components/common/StatusBadge.jsx`, 'utf8'))
  for (const s of ['REGISTERED', 'PENDING_LEDGER', 'RECORDED', 'VERIFIED', 'MISMATCH', 'LEDGER_UNAVAILABLE', 'CONFIRMED', 'SUBMITTED', 'FAILED', 'REJECTED', 'INACTIVE']) {
    ok(new RegExp(`^\\s+${s}: '`, 'm').test(src), `StatusBadge has a tone for ${s}`)
  }
  ok(typeof Badge.StatusBadge === 'function', 'StatusBadge module loads')

  console.log('\n--- http wrapper (fake fetch)')
  const json = (status, body, headers = { 'content-type': 'application/json' }) =>
    new Response(body === null ? null : JSON.stringify(body), { status, headers })
  let calls = []
  const mk = (handler, onAuthExpired) =>
    createHttp({ baseUrl: 'http://api.test/api/v1', onAuthExpired, fetchImpl: async (url, init) => { calls.push({ url, init }); return handler(url, init) } })

  calls = []
  let h = mk(() => json(200, { items: [1], page: 1, page_size: 25, total: 1 }))
  h.setAccessToken('tok')
  const page = await h.get('/cases', { page_size: 100, q: '', status: null })
  ok(page.items[0] === 1, 'GET returns parsed JSON')
  ok(calls[0].url === 'http://api.test/api/v1/cases?page_size=100', `query built, empty/null params dropped (${calls[0].url})`)
  ok(calls[0].init.headers.Authorization === 'Bearer tok', 'bearer header attached')
  ok(calls[0].init.credentials === 'include', 'cookies sent for refresh flow')

  calls = []
  h = mk(() => json(422, { error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email address.', details: [{ field: 'email', message: 'invalid' }] } }))
  try { await h.post('/users', { email: 'x' }); ok(false, '422 should throw') } catch (err) {
    ok(err instanceof ApiError && err.status === 422 && err.code === 'VALIDATION_ERROR' && err.message === 'Enter a valid email address.' && err.details?.[0]?.field === 'email', '422 → ApiError with status/code/message/details')
  }
  ok(calls[0].init.headers['Content-Type'] === 'application/json' && calls[0].init.body === '{"email":"x"}', 'POST sends JSON body')

  calls = []
  h = mk(() => { throw new TypeError('fetch failed') })
  try { await h.get('/health'); ok(false, 'network error should throw') } catch (err) {
    ok(err instanceof ApiError && err.status === 0 && err.code === 'NETWORK', 'network failure → ApiError status 0 / NETWORK')
  }

  calls = []
  h = mk((url) => {
    if (url.endsWith('/auth/refresh')) return json(200, { access_token: 'new', expires_in: 900 })
    if (calls.length === 1) return json(401, { error: { code: 'UNAUTHENTICATED', message: 'expired' } })
    return json(200, { ok: true })
  })
  h.setAccessToken('old')
  const out = await h.get('/cases')
  ok(out.ok === true && calls.length === 3 && calls[2].init.headers.Authorization === 'Bearer new', '401 → refresh once → retry with new token')

  calls = []
  let expired = 0
  h = mk((url) => (url.endsWith('/auth/refresh') ? json(401, { error: { code: 'UNAUTHENTICATED', message: 'no cookie' } }) : json(401, { error: { code: 'UNAUTHENTICATED', message: 'expired' } })), () => { expired += 1 })
  h.setAccessToken('old')
  try { await h.get('/cases'); ok(false, 'should throw after failed refresh') } catch (err) {
    ok(err.status === 401 && expired === 1 && h.getAccessToken() === null, '401 + failed refresh → onAuthExpired fired, token cleared')
  }

  calls = []
  h = mk(() => json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }))
  try { await h.post('/auth/login', { email: 'a@b.c', password: 'x' }); ok(false, 'login 401 should throw') } catch (err) {
    ok(err.code === 'INVALID_CREDENTIALS' && calls.length === 1, 'auth routes never trigger refresh')
  }

  calls = []
  h = mk(() => json(204, null, {}))
  ok((await h.post('/auth/logout')) === null, '204 → null')

  calls = []
  h = mk(() => json(201, { id: 'x' }))
  const fd = new FormData()
  fd.append('description', 'd')
  await h.upload('/cases/1/evidence', fd)
  ok(calls[0].init.body === fd && !('Content-Type' in calls[0].init.headers), 'multipart body passed through without a manual Content-Type')
} finally {
  await server.close()
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
