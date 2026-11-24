// TRACE contract stub — a small in-memory HTTP server that speaks docs/API_CONTRACT_V1.md so the
// frontend can be developed and tested in VITE_API_MODE=http before the real FastAPI exists.
//
// It is NOT a backend: no database, no real storage, no real blockchain, opaque tokens instead of
// JWTs, and data resets on every restart. The "ledger" is a mock and says so everywhere
// (adapter "mock-ledger"). Never deploy it. It binds to loopback only.
//
// Where the contract and the current UI disagree, the stub follows the CONTRACT on purpose
// (e.g. hidden resources return 404, temporary passwords need 12+ chars) so those mismatches show
// up here and not later against the real backend. See stub/README.md.
import http from 'node:http'
import crypto from 'node:crypto'

// ------------------------------------------------------------------ constants
const ROLES = ['ADMIN', 'OFFICER', 'CLERK', 'READER']
const CASE_STATUS = ['OPEN', 'UNDER_REVIEW', 'CLOSED', 'ARCHIVED']
const PRIORITY = ['HIGH', 'MEDIUM', 'LOW']
const EVIDENCE_TYPES = ['VIDEO', 'AUDIO', 'DOCUMENT', 'IMAGE_ARCHIVE', 'DISK_IMAGE', 'LOG_FILE']
const ALLOWED_EXT = {
  VIDEO: ['mp4', 'mov', 'avi', 'mkv'],
  AUDIO: ['mp3', 'wav', 'm4a', 'aac'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'],
  IMAGE_ARCHIVE: ['jpg', 'jpeg', 'png', 'tiff', 'zip'],
  DISK_IMAGE: ['img', 'dd', 'e01', 'raw', 'iso'],
  LOG_FILE: ['log', 'txt', 'json', 'evtx'],
}
const TYPE_BY_LABEL = {
  Video: 'VIDEO', Audio: 'AUDIO', Document: 'DOCUMENT',
  'Image Archive': 'IMAGE_ARCHIVE', 'Disk Image': 'DISK_IMAGE', 'Log File': 'LOG_FILE',
}
const MIME = {
  mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', json: 'application/json',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', zip: 'application/zip',
}
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

const PERMISSIONS = {
  ADMIN: ['cases.view', 'cases.view_all', 'cases.assign', 'evidence.view', 'evidence.view_all', 'custody.view',
    'custody.hold', 'verification.view', 'reports.view', 'users.manage', 'audit.view'],
  OFFICER: ['cases.view', 'cases.create', 'cases.update', 'evidence.view', 'evidence.upload', 'evidence.download',
    'custody.view', 'custody.transfer', 'custody.hold', 'verification.view', 'verification.run', 'ai.view',
    'ai.submit', 'reports.view', 'reports.create'],
  CLERK: ['cases.view', 'documents.manage', 'evidence.view', 'evidence.download', 'custody.view', 'custody.hold',
    'verification.view', 'reports.view', 'reports.create'],
  READER: ['cases.view', 'evidence.view', 'evidence.download', 'custody.view', 'verification.view', 'reports.view'],
}

// Local demo credentials only (same as the README / mock mode).
const DEMO_PASSWORDS = {
  'admin@trace.local': 'Admin@123',
  'officer@trace.local': 'Officer@123',
  'clerk@trace.local': 'Clerk@123',
  'reviewer@trace.local': 'Reviewer@123',
}

const ACCESS_TTL_S = 900
const REFRESH_TTL_S = 7 * 24 * 3600
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEX64 = /^[0-9a-fA-F]{64}$/
const TAMPERED_HASH = 'e2f4061829304a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c9'

// ------------------------------------------------------------------ helpers
export const uuid = (key) => {
  const h = crypto.createHash('sha1').update(`trace-stub:${key}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const txRef = (key) => sha256(`tx:${key}`).slice(0, 40)

class HttpError extends Error {
  constructor(status, code, message, details = null, extra = null) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.extra = extra
  }
}
const fail = (status, code, message, details, extra) => new HttpError(status, code, message, details, extra)
const invalid = (details) => fail(422, 'VALIDATION_ERROR', 'Some fields are invalid.', details)

// ------------------------------------------------------------------ app factory
export const createStub = ({ seed, transferMode = 'immediate', ledgerDelayMs = 1500, minPassword = 12, corsOrigins = [] }) => {
  // ---- state
  let seq = { case: 200, evidence: 1000, report: 100, event: 1000, transfer: 1, doc: 1, audit: 1, user: 10, verification: 1 }
  const nextDisplay = (kind, prefix, pad) => `${prefix}-${new Date().getUTCFullYear()}-${String(++seq[kind]).padStart(pad, '0')}`
  const timers = new Set()

  const users = seed.users.map((u, i) => ({
    id: uuid(u.id), name: u.name, email: u.email, role: u.role, organization: u.organization, status: u.status,
    created_at: '2026-05-01T08:00:00Z', last_login_at: null, password: DEMO_PASSWORDS[u.email] ?? `seed-pw-${i}-xxxxxxxx`,
  }))
  const userByMockId = Object.fromEntries(seed.users.map((u) => [u.id, users.find((x) => x.email === u.email)]))
  const userByName = (name) => users.find((u) => u.name === name)
  const SYSTEM = { id: 'system', name: 'System', organization: 'TRACE Platform' }
  const uref = (u) => (u ? { id: u.id, name: u.name, organization: u.organization } : null)
  const userJson = (u) => ({
    id: u.id, name: u.name, email: u.email, role: u.role, organization: u.organization, status: u.status,
    created_at: u.created_at, last_login_at: u.last_login_at,
  })

  const cases = seed.cases.map((c) => ({
    id: uuid(c.id), display_id: c.id, title: c.title, type: c.type, status: c.status, priority: c.priority,
    description: c.description, lead_id: userByMockId[c.investigator_id].id, organization: c.organization,
    opened_at: `${c.opened_date}T00:00:00Z`,
    assignments: c.assigned_user_ids.map((mid) => ({ user_id: userByMockId[mid].id, role: userByMockId[mid].role, assigned_at: `${c.opened_date}T00:00:00Z` })),
    documents: [], created_at: `${c.opened_date}T00:00:00Z`, updated_at: `${c.opened_date}T00:00:00Z`,
  }))
  const caseByMockId = Object.fromEntries(seed.cases.map((c) => [c.id, cases.find((x) => x.display_id === c.id)]))

  const STATUS_MAP = { VERIFIED: 'VERIFIED', UNDER_REVIEW: 'RECORDED', PENDING_VERIFICATION: 'PENDING_LEDGER', FLAGGED: 'MISMATCH' }
  const evidence = seed.evidence.map((e) => {
    const ext = e.filename.split('.').pop().toLowerCase()
    const integrity = STATUS_MAP[e.status] ?? 'REGISTERED'
    const recorded = integrity !== 'PENDING_LEDGER'
    return {
      id: uuid(e.id), display_id: e.id, case_id: caseByMockId[e.case_id].id, filename: e.filename,
      evidence_type: TYPE_BY_LABEL[e.file_type] ?? 'DOCUMENT', mime_type: MIME[ext] ?? 'application/octet-stream',
      size_bytes: e.size, description: e.description, uploaded_by: userByMockId[e.uploaded_by].id,
      registered_at: e.upload_timestamp, custodian_id: userByMockId[e.current_custodian].id,
      integrity_status: integrity, sha256: e.sha256, hash_at: e.upload_timestamp, data: null,
      ledger: recorded
        ? { status: 'RECORDED', tx_ref: txRef(e.id), recorded_sha256: e.sha256, recorded_at: e.upload_timestamp, last_checked_at: nowIso() }
        : { status: 'PENDING', tx_ref: null, recorded_sha256: null, recorded_at: null, last_checked_at: null },
      created_at: e.upload_timestamp, updated_at: e.upload_timestamp,
    }
  })
  const evByMockId = Object.fromEntries(seed.evidence.map((e) => [e.id, evidence.find((x) => x.display_id === e.id)]))

  const EVENT_MAP = { REGISTERED: 'REGISTERED', ACCESSED: 'ACCESSED', CUSTODY_TRANSFERRED: 'CUSTODY_TRANSFERRED',
    INTEGRITY_VERIFIED: 'INTEGRITY_VERIFIED', ACCESS_REQUESTED: 'CUSTODY_TRANSFER_REQUESTED' }
  const transfers = []
  const events = []
  for (const ev of seed.custody) {
    const type = EVENT_MAP[ev.event_type]
    if (!type) continue // UPLOADED has no contract equivalent (REGISTERED covers it)
    const ref = evByMockId[ev.evidence_id]
    const actor = userByName(ev.actor) ?? null
    const rec = {
      id: uuid(ev.id), evidence_id: ref.id, event_type: type, status: ev.status === 'PENDING' ? 'PENDING' : 'COMPLETED',
      actor: actor ? uref(actor) : SYSTEM, from_user: null, to_user: null, reason: ev.reason,
      occurred_at: ev.timestamp,
      ledger: ev.transaction_id ? { status: 'RECORDED', tx_ref: txRef(ev.id), recorded_at: ev.timestamp } : { status: 'NOT_SUBMITTED', tx_ref: null, recorded_at: null },
    }
    events.push(rec)
    if (type === 'CUSTODY_TRANSFER_REQUESTED' && rec.status === 'PENDING') {
      const to = users.find((u) => u.id === ref.custodian_id)
      rec.to_user = uref(to)
      rec.from_user = rec.actor
      transfers.push({ id: uuid(`transfer-${ev.id}`), status: 'PENDING', evidence_id: ref.id, from_user: rec.actor, to_user: uref(to), reason: ev.reason, requested_at: ev.timestamp })
    }
  }

  const reports = seed.reports.map((r) => ({
    id: uuid(r.id), display_id: r.id, case_id: caseByMockId[r.case_id].id, title: r.title, summary: '',
    status: r.status === 'DRAFT' ? 'DRAFT' : 'FINAL', author_id: (userByName(r.author) ?? users[1]).id,
    created_at: r.generated_at, updated_at: r.generated_at, ai_assisted: false, content: null,
  }))

  const verifications = []
  for (const e of evidence) {
    if (e.integrity_status !== 'VERIFIED' && e.integrity_status !== 'MISMATCH') continue
    const lastEv = events.filter((x) => x.evidence_id === e.id && x.event_type === 'INTEGRITY_VERIFIED').pop()
    verifications.push({
      id: uuid(`verif-${e.id}`), evidence_id: e.id, kind: 'BACKEND',
      result: e.integrity_status === 'VERIFIED' ? 'MATCH' : 'MISMATCH',
      recalculated_sha256: e.integrity_status === 'VERIFIED' ? e.sha256 : TAMPERED_HASH,
      persisted_sha256: e.sha256, ledger_sha256: e.ledger.recorded_sha256, ledger_tx_ref: e.ledger.tx_ref,
      verified_by: lastEv?.actor ?? SYSTEM, verified_at: lastEv?.occurred_at ?? e.registered_at, notes: null,
    })
  }

  const audit = []
  const tokens = new Map() // access token -> { userId, exp }
  const refreshTokens = new Map() // refresh token -> { userId, exp }
  const loginFailures = new Map() // ip|email -> [timestamps]

  const record = (actor, action, targetType, targetId, display, detail = '', outcome = 'SUCCESS', ip = '127.0.0.1') =>
    audit.push({
      id: uuid(`audit-${seq.audit++}-${Date.now()}`), occurred_at: nowIso(), actor: actor ? uref(actor) : null,
      action, target_type: targetType, target_id: targetId, target_display: display, detail, ip_address: ip, outcome,
    })

  // ---- shared lookups / serializers
  const findUser = (id) => users.find((u) => u.id === id)
  const findCase = (id) => cases.find((c) => c.id === id)
  const findEvidence = (id) => evidence.find((e) => e.id === id)
  const can = (user, perm) => PERMISSIONS[user.role].includes(perm)
  const assigned = (user, c) => can(user, 'cases.view_all') || c.assignments.some((a) => a.user_id === user.id)
  const caseJson = (c, withAssignments) => ({
    id: c.id, display_id: c.display_id, title: c.title, type: c.type, status: c.status, priority: c.priority,
    description: c.description, lead_investigator: uref(findUser(c.lead_id)), organization: c.organization,
    opened_at: c.opened_at,
    assignments: withAssignments
      ? c.assignments.map((a) => ({ user: uref(findUser(a.user_id)), role: a.role, assigned_at: a.assigned_at }))
      : null,
    evidence_count: evidence.filter((e) => e.case_id === c.id).length, created_at: c.created_at, updated_at: c.updated_at,
  })
  const evidenceJson = (e) => ({
    id: e.id, display_id: e.display_id, case_id: e.case_id, case_display_id: findCase(e.case_id).display_id,
    filename: e.filename, evidence_type: e.evidence_type, mime_type: e.mime_type, size_bytes: e.size_bytes,
    description: e.description, uploaded_by: uref(findUser(e.uploaded_by)), registered_at: e.registered_at,
    current_custodian: uref(findUser(e.custodian_id)), integrity_status: e.integrity_status,
    hash: { algorithm: 'SHA-256', persisted_sha256: e.sha256, calculated_by: 'BACKEND', calculated_at: e.hash_at },
    storage: { provider: 'MINIO', reference: `evidence/${e.case_id}/${e.id}`, encrypted_at_rest: true },
    ledger: { network: 'MOCK_LEDGER', ...e.ledger }, created_at: e.created_at, updated_at: e.updated_at,
  })
  const reportJson = (r) => ({
    id: r.id, display_id: r.display_id, case_id: r.case_id, title: r.title, summary: r.summary, status: r.status,
    author: uref(findUser(r.author_id)), created_at: r.created_at, updated_at: r.updated_at,
    ai_assisted: r.ai_assisted, content: r.content,
  })
  const docJson = (d, caseId) => ({ id: d.id, case_id: caseId, title: d.title, note: d.note, added_by: uref(findUser(d.added_by)), added_at: d.added_at })

  const visibleCases = (user) => cases.filter((c) => assigned(user, c))
  const visibleCaseIds = (user) => new Set(visibleCases(user).map((c) => c.id))

  // ---- request context helpers
  const authenticate = (req) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')
    const t = m && tokens.get(m[1])
    if (!t || t.exp < Date.now()) throw fail(401, 'UNAUTHENTICATED', 'Authentication required.')
    const user = findUser(t.userId)
    if (!user || user.status !== 'ACTIVE') throw fail(401, 'UNAUTHENTICATED', 'Authentication required.')
    return user
  }
  const need = (ctx, perm) => {
    if (!can(ctx.user, perm)) {
      record(ctx.user, 'PERMISSION_DENIED', 'ENDPOINT', ctx.path, `${ctx.method} ${ctx.path}`, `Missing ${perm}`, 'DENIED', ctx.ip)
      throw fail(403, 'FORBIDDEN', 'You do not have permission to perform this action.')
    }
  }
  // Hidden resources are 404 (never 403) so existence is not leaked — contract §2.3.
  const caseFor = (ctx, id) => {
    const c = findCase(id)
    if (!c || !assigned(ctx.user, c)) throw fail(404, 'NOT_FOUND', 'Case not found.')
    return c
  }
  const evidenceFor = (ctx, id) => {
    const e = findEvidence(id)
    if (!e || !assigned(ctx.user, findCase(e.case_id))) throw fail(404, 'NOT_FOUND', 'Evidence not found.')
    return e
  }
  const onlyFields = (body, allowed) => {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'BAD_REQUEST', 'Request body must be a JSON object.')
    const extra = Object.keys(body).filter((k) => !allowed.includes(k))
    if (extra.length) throw invalid(extra.map((f) => ({ field: f, message: 'Unknown field.' })))
  }
  const str = (v) => (typeof v === 'string' ? v.trim() : v)
  const checks = (rules) => {
    const details = []
    for (const [field, ok, message] of rules) if (!ok) details.push({ field, message })
    if (details.length) throw invalid(details)
  }
  const len = (v, min, max) => typeof v === 'string' && v.length >= min && v.length <= max

  const paginate = (all, query) => {
    const page = Number(query.page ?? 1)
    const pageSize = Number(query.page_size ?? 25)
    checks([
      ['page', Number.isInteger(page) && page >= 1, 'page must be 1 or more.'],
      ['page_size', Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100, 'page_size must be 1–100.'],
    ])
    return { items: all.slice((page - 1) * pageSize, page * pageSize), page, page_size: pageSize, total: all.length }
  }
  const matches = (q, ...fields) => !q || fields.some((f) => String(f ?? '').toLowerCase().includes(String(q).toLowerCase()))

  // ---- ledger simulation (async, like a real chain): PENDING -> RECORDED after a short delay
  const settleLater = (fn) => {
    const t = setTimeout(() => { timers.delete(t); fn() }, ledgerDelayMs)
    t.unref?.()
    timers.add(t)
  }
  const settleEvent = (event) => settleLater(() => { event.ledger = { status: 'RECORDED', tx_ref: txRef(event.id), recorded_at: nowIso() } })
  const settleEvidence = (e) => settleLater(() => {
    e.ledger = { status: 'RECORDED', tx_ref: txRef(e.id), recorded_sha256: e.sha256, recorded_at: nowIso(), last_checked_at: nowIso() }
    if (e.integrity_status === 'PENDING_LEDGER') e.integrity_status = 'RECORDED'
  })
  const addEvent = (e, type, actor, reason, extra = {}) => {
    const ev = {
      id: uuid(`event-${seq.event++}-${Date.now()}`), evidence_id: e.id, event_type: type, status: 'COMPLETED',
      actor: uref(actor), from_user: null, to_user: null, reason, occurred_at: nowIso(),
      ledger: { status: 'PENDING', tx_ref: null, recorded_at: null }, ...extra,
    }
    events.push(ev)
    settleEvent(ev)
    return ev
  }

  // ---- multipart (single file + text fields), no dependencies
  const parseMultipart = (buf, contentType) => {
    const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '')
    if (!m) return null
    const boundary = Buffer.from(`--${m[1] ?? m[2]}`)
    const fields = {}
    let file = null
    let pos = buf.indexOf(boundary)
    while (pos !== -1) {
      const next = buf.indexOf(boundary, pos + boundary.length)
      if (next === -1) break
      let part = buf.subarray(pos + boundary.length, next)
      if (part.subarray(0, 2).toString() === '\r\n') part = part.subarray(2)
      if (part.subarray(part.length - 2).toString() === '\r\n') part = part.subarray(0, part.length - 2)
      const sep = part.indexOf('\r\n\r\n')
      if (sep !== -1) {
        const head = part.subarray(0, sep).toString('utf8')
        const body = part.subarray(sep + 4)
        const name = /name="([^"]*)"/.exec(head)?.[1]
        const filename = /filename="([^"]*)"/.exec(head)?.[1]
        if (filename !== undefined) file = { name, filename, data: body }
        else if (name) fields[name] = body.toString('utf8')
      }
      pos = next
    }
    return { fields, file }
  }

  // ------------------------------------------------------------ routes
  const routes = []
  const route = (method, pattern, handler, opts = {}) => {
    const keys = []
    const re = new RegExp(`^${pattern.replace(/:([a-z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)' })}$`)
    routes.push({ method, re, keys, handler, public: Boolean(opts.public), rawBody: Boolean(opts.rawBody) })
  }

  // health & ledger status
  route('GET', '/health', () => ({ status: 200, body: { status: 'ok', version: 'stub-0.1.0', dependencies: { database: 'ok', storage: 'ok', ledger: 'mock', ai: 'mock' } } }), { public: true })
  route('GET', '/ledger/status', () => ({ status: 200, body: { network: 'MOCK_LEDGER', adapter: 'mock-ledger', reachable: true, last_block: 1000 + events.length, checked_at: nowIso() } }))

  // ---- auth
  const issueTokens = (user, res) => {
    const access = crypto.randomBytes(24).toString('hex')
    tokens.set(access, { userId: user.id, exp: Date.now() + ACCESS_TTL_S * 1000 })
    const refresh = crypto.randomBytes(24).toString('hex')
    refreshTokens.set(refresh, { userId: user.id, exp: Date.now() + REFRESH_TTL_S * 1000 })
    res.setHeader('Set-Cookie', `trace_refresh=${refresh}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${REFRESH_TTL_S}`)
    return access
  }
  const revokeUser = (userId) => {
    for (const [k, v] of tokens) if (v.userId === userId) tokens.delete(k)
    for (const [k, v] of refreshTokens) if (v.userId === userId) refreshTokens.delete(k)
  }
  route('POST', '/auth/login', (ctx) => {
    onlyFields(ctx.body, ['email', 'password'])
    const email = str(ctx.body.email)?.toLowerCase?.()
    checks([
      ['email', typeof email === 'string' && EMAIL_RE.test(email), 'Enter a valid email address.'],
      ['password', typeof ctx.body.password === 'string' && ctx.body.password.length > 0, 'Password is required.'],
    ])
    const key = `${ctx.ip}|${email}`
    const recent = (loginFailures.get(key) ?? []).filter((t) => Date.now() - t < 60_000)
    if (recent.length >= 10) throw fail(429, 'RATE_LIMITED', 'Too many sign-in attempts. Try again in a minute.')
    const user = users.find((u) => u.email.toLowerCase() === email)
    if (!user || user.password !== ctx.body.password) {
      recent.push(Date.now())
      loginFailures.set(key, recent)
      record(null, 'LOGIN_FAILED', 'USER', user?.id ?? null, email, 'Invalid credentials', 'FAILED', ctx.ip)
      throw fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    }
    if (user.status !== 'ACTIVE') {
      record(user, 'LOGIN_FAILED', 'USER', user.id, user.email, 'Account inactive', 'DENIED', ctx.ip)
      throw fail(403, 'ACCOUNT_INACTIVE', 'This account has been deactivated. Contact an administrator.')
    }
    user.last_login_at = nowIso()
    record(user, 'LOGIN', 'USER', user.id, user.email, 'Sign-in', 'SUCCESS', ctx.ip)
    return { status: 200, body: { access_token: issueTokens(user, ctx.res), token_type: 'Bearer', expires_in: ACCESS_TTL_S, user: userJson(user), permissions: PERMISSIONS[user.role] } }
  }, { public: true })
  route('POST', '/auth/refresh', (ctx) => {
    const m = /(?:^|;\s*)trace_refresh=([^;]+)/.exec(ctx.req.headers.cookie ?? '')
    const rt = m && refreshTokens.get(m[1])
    if (!rt || rt.exp < Date.now()) throw fail(401, 'UNAUTHENTICATED', 'Session expired.')
    const user = findUser(rt.userId)
    if (!user || user.status !== 'ACTIVE') throw fail(401, 'UNAUTHENTICATED', 'Session expired.')
    const access = crypto.randomBytes(24).toString('hex')
    tokens.set(access, { userId: user.id, exp: Date.now() + ACCESS_TTL_S * 1000 })
    return { status: 200, body: { access_token: access, expires_in: ACCESS_TTL_S } }
  }, { public: true })
  route('POST', '/auth/logout', (ctx) => {
    const m = /(?:^|;\s*)trace_refresh=([^;]+)/.exec(ctx.req.headers.cookie ?? '')
    if (m) refreshTokens.delete(m[1])
    tokens.delete(/^Bearer (.+)$/.exec(ctx.req.headers.authorization ?? '')?.[1])
    ctx.res.setHeader('Set-Cookie', 'trace_refresh=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0')
    record(ctx.user, 'LOGOUT', 'USER', ctx.user.id, ctx.user.email, 'Sign-out', 'SUCCESS', ctx.ip)
    return { status: 204 }
  })
  route('GET', '/auth/me', (ctx) => ({ status: 200, body: { user: userJson(ctx.user), permissions: PERMISSIONS[ctx.user.role] } }))

  // ---- users
  route('GET', '/users/directory', () => ({ status: 200, body: { items: users.map(uref) } }))
  route('GET', '/users', (ctx) => {
    need(ctx, 'users.manage')
    const { q, role, status } = ctx.query
    const all = users.filter((u) => matches(q, u.name, u.email, u.organization) && (!role || u.role === role) && (!status || u.status === status))
    const page = paginate(all, ctx.query)
    return { status: 200, body: { ...page, items: page.items.map(userJson) } }
  })
  route('POST', '/users', (ctx) => {
    need(ctx, 'users.manage')
    onlyFields(ctx.body, ['name', 'email', 'role', 'organization', 'temporary_password'])
    const b = { name: str(ctx.body.name), email: str(ctx.body.email)?.toLowerCase?.(), role: ctx.body.role, organization: str(ctx.body.organization), pw: ctx.body.temporary_password }
    checks([
      ['name', len(b.name, 1, 120), 'Name is required (1–120 characters).'],
      ['email', typeof b.email === 'string' && EMAIL_RE.test(b.email), 'Enter a valid email address.'],
      ['role', ROLES.includes(b.role), 'Select a valid role.'],
      ['organization', len(b.organization, 1, 120), 'Organization is required (1–120 characters).'],
      ['temporary_password', typeof b.pw === 'string' && b.pw.length >= minPassword && b.pw.toLowerCase() !== b.email, `Temporary password must be at least ${minPassword} characters.`],
    ])
    if (users.some((u) => u.email.toLowerCase() === b.email)) throw fail(409, 'CONFLICT', 'A user with this email already exists.')
    const user = { id: uuid(`user-${seq.user++}-${Date.now()}`), name: b.name, email: b.email, role: b.role, organization: b.organization, status: 'ACTIVE', created_at: nowIso(), last_login_at: null, password: b.pw }
    users.push(user)
    record(ctx.user, 'USER_CREATED', 'USER', user.id, user.email, `Role ${user.role}`, 'SUCCESS', ctx.ip)
    return { status: 201, body: { ...userJson(user), must_change_password: true } }
  })
  const activeAdmins = () => users.filter((u) => u.role === 'ADMIN' && u.status === 'ACTIVE')
  route('GET', '/users/:id', (ctx) => {
    need(ctx, 'users.manage')
    const u = findUser(ctx.params.id)
    if (!u) throw fail(404, 'NOT_FOUND', 'User not found.')
    return { status: 200, body: userJson(u) }
  })
  route('PATCH', '/users/:id', (ctx) => {
    need(ctx, 'users.manage')
    onlyFields(ctx.body, ['name', 'email', 'role', 'organization'])
    const u = findUser(ctx.params.id)
    if (!u) throw fail(404, 'NOT_FOUND', 'User not found.')
    const b = ctx.body
    const rules = []
    if ('name' in b) rules.push(['name', len(str(b.name), 1, 120), 'Name is required (1–120 characters).'])
    if ('email' in b) rules.push(['email', typeof b.email === 'string' && EMAIL_RE.test(str(b.email)), 'Enter a valid email address.'])
    if ('role' in b) rules.push(['role', ROLES.includes(b.role), 'Select a valid role.'])
    if ('organization' in b) rules.push(['organization', len(str(b.organization), 1, 120), 'Organization is required (1–120 characters).'])
    checks(rules)
    if ('role' in b && b.role !== u.role) {
      if (u.id === ctx.user.id) throw fail(409, 'CONFLICT', 'You cannot change your own role.')
      if (u.role === 'ADMIN' && activeAdmins().length <= 1) throw fail(409, 'CONFLICT', 'At least one active administrator is required.')
    }
    if ('email' in b) {
      const email = str(b.email).toLowerCase()
      if (users.some((x) => x.id !== u.id && x.email.toLowerCase() === email)) throw fail(409, 'CONFLICT', 'A user with this email already exists.')
      u.email = email
    }
    if ('name' in b) u.name = str(b.name)
    if ('role' in b) u.role = b.role
    if ('organization' in b) u.organization = str(b.organization)
    record(ctx.user, 'USER_UPDATED', 'USER', u.id, u.email, '', 'SUCCESS', ctx.ip)
    return { status: 200, body: userJson(u) }
  })
  route('POST', '/users/:id/status', (ctx) => {
    need(ctx, 'users.manage')
    onlyFields(ctx.body, ['status', 'reason'])
    const u = findUser(ctx.params.id)
    if (!u) throw fail(404, 'NOT_FOUND', 'User not found.')
    checks([['status', ['ACTIVE', 'INACTIVE'].includes(ctx.body.status), 'Status must be ACTIVE or INACTIVE.']])
    if (ctx.body.status === 'INACTIVE') {
      if (u.id === ctx.user.id) throw fail(409, 'CONFLICT', 'You cannot deactivate your own account.')
      if (u.role === 'ADMIN' && u.status === 'ACTIVE' && activeAdmins().length <= 1) throw fail(409, 'CONFLICT', 'At least one active administrator is required.')
      revokeUser(u.id)
    }
    u.status = ctx.body.status
    record(ctx.user, u.status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'USER', u.id, u.email, ctx.body.reason ?? '', 'SUCCESS', ctx.ip)
    return { status: 200, body: userJson(u) }
  })

  // ---- cases
  route('GET', '/cases', (ctx) => {
    need(ctx, 'cases.view')
    const { q, status, type, priority, investigator_id: inv } = ctx.query
    const all = visibleCases(ctx.user).filter((c) =>
      matches(q, c.display_id, c.title, findUser(c.lead_id)?.name) && (!status || c.status === status) &&
      (!type || c.type === type) && (!priority || c.priority === priority) && (!inv || c.lead_id === inv))
    const page = paginate(all, ctx.query)
    return { status: 200, body: { ...page, items: page.items.map((c) => caseJson(c, false)) } }
  })
  route('POST', '/cases', (ctx) => {
    need(ctx, 'cases.create')
    onlyFields(ctx.body, ['title', 'type', 'priority', 'description'])
    const b = { title: str(ctx.body.title), type: str(ctx.body.type), priority: ctx.body.priority, description: str(ctx.body.description) }
    checks([
      ['title', len(b.title, 3, 200), 'Title must be 3–200 characters.'],
      ['type', len(b.type, 1, 80), 'Type is required (1–80 characters).'],
      ['priority', PRIORITY.includes(b.priority), 'Select a valid priority.'],
      ['description', len(b.description, 1, 4000), 'Description is required (1–4000 characters).'],
    ])
    const t = nowIso()
    const c = { id: uuid(`case-${seq.case}-${Date.now()}`), display_id: nextDisplay('case', 'TRC', 4), title: b.title, type: b.type, status: 'OPEN', priority: b.priority, description: b.description,
      lead_id: ctx.user.id, organization: ctx.user.organization, opened_at: t, assignments: [{ user_id: ctx.user.id, role: ctx.user.role, assigned_at: t }], documents: [], created_at: t, updated_at: t }
    cases.unshift(c)
    record(ctx.user, 'CASE_CREATED', 'CASE', c.id, c.display_id, c.title, 'SUCCESS', ctx.ip)
    return { status: 201, body: caseJson(c, true) }
  })
  route('GET', '/cases/:id', (ctx) => {
    need(ctx, 'cases.view')
    return { status: 200, body: caseJson(caseFor(ctx, ctx.params.id), true) }
  })
  route('PATCH', '/cases/:id', (ctx) => {
    need(ctx, 'cases.update')
    onlyFields(ctx.body, ['title', 'status', 'priority', 'description'])
    const c = caseFor(ctx, ctx.params.id)
    const b = ctx.body
    const rules = []
    if ('title' in b) rules.push(['title', len(str(b.title), 3, 200), 'Title must be 3–200 characters.'])
    if ('status' in b) rules.push(['status', CASE_STATUS.includes(b.status), 'Select a valid status.'])
    if ('priority' in b) rules.push(['priority', PRIORITY.includes(b.priority), 'Select a valid priority.'])
    if ('description' in b) rules.push(['description', len(str(b.description), 1, 4000), 'Description is required (1–4000 characters).'])
    checks(rules)
    if (c.status === 'ARCHIVED' && 'status' in b && b.status !== 'ARCHIVED') throw fail(409, 'CONFLICT', 'An archived case cannot be reopened.')
    for (const k of ['title', 'description']) if (k in b) c[k] = str(b[k])
    for (const k of ['status', 'priority']) if (k in b) c[k] = b[k]
    c.updated_at = nowIso()
    record(ctx.user, 'CASE_UPDATED', 'CASE', c.id, c.display_id, '', 'SUCCESS', ctx.ip)
    return { status: 200, body: caseJson(c, true) }
  })
  route('PUT', '/cases/:id/assignments', (ctx) => {
    need(ctx, 'cases.assign')
    onlyFields(ctx.body, ['user_ids'])
    const c = findCase(ctx.params.id)
    if (!c) throw fail(404, 'NOT_FOUND', 'Case not found.')
    const ids = ctx.body.user_ids
    checks([
      ['user_ids', Array.isArray(ids) && ids.every((i) => findUser(i)), 'user_ids must be a list of existing user ids.'],
    ])
    if (!ids.includes(c.lead_id)) throw invalid([{ field: 'user_ids', message: 'The lead investigator must stay assigned.' }])
    const t = nowIso()
    c.assignments = [...new Set(ids)].map((id) => ({ user_id: id, role: findUser(id).role, assigned_at: c.assignments.find((a) => a.user_id === id)?.assigned_at ?? t }))
    c.updated_at = t
    record(ctx.user, 'CASE_ASSIGNMENTS_CHANGED', 'CASE', c.id, c.display_id, `${ids.length} assigned`, 'SUCCESS', ctx.ip)
    return { status: 200, body: caseJson(c, true) }
  })
  route('GET', '/cases/:id/evidence', (ctx) => {
    need(ctx, 'evidence.view')
    const c = caseFor(ctx, ctx.params.id)
    const page = paginate(evidence.filter((e) => e.case_id === c.id), ctx.query)
    return { status: 200, body: { ...page, items: page.items.map(evidenceJson) } }
  })
  route('GET', '/cases/:id/reports', (ctx) => {
    need(ctx, 'reports.view')
    const c = caseFor(ctx, ctx.params.id)
    const page = paginate(reports.filter((r) => r.case_id === c.id), ctx.query)
    return { status: 200, body: { ...page, items: page.items.map(reportJson) } }
  })
  route('GET', '/cases/:id/documents', (ctx) => {
    need(ctx, 'cases.view')
    const c = caseFor(ctx, ctx.params.id)
    return { status: 200, body: { items: c.documents.map((d) => docJson(d, c.id)), page: 1, page_size: 100, total: c.documents.length } }
  })
  route('POST', '/cases/:id/documents', (ctx) => {
    need(ctx, 'documents.manage')
    onlyFields(ctx.body, ['title', 'note'])
    const c = caseFor(ctx, ctx.params.id)
    const title = str(ctx.body.title)
    checks([['title', len(title, 1, 200), 'Document title is required.']])
    const d = { id: uuid(`doc-${seq.doc++}-${Date.now()}`), title, note: str(ctx.body.note) ?? '', added_by: ctx.user.id, added_at: nowIso() }
    c.documents.unshift(d)
    record(ctx.user, 'CASE_DOCUMENT_REGISTERED', 'CASE', c.id, c.display_id, title, 'SUCCESS', ctx.ip)
    return { status: 201, body: docJson(d, c.id) }
  })
  route('DELETE', '/cases/:id/documents/:doc_id', (ctx) => {
    need(ctx, 'documents.manage')
    const c = caseFor(ctx, ctx.params.id)
    const before = c.documents.length
    c.documents = c.documents.filter((d) => d.id !== ctx.params.doc_id)
    if (c.documents.length === before) throw fail(404, 'NOT_FOUND', 'Document not found.')
    record(ctx.user, 'CASE_DOCUMENT_REMOVED', 'CASE', c.id, c.display_id, ctx.params.doc_id, 'SUCCESS', ctx.ip)
    return { status: 204 }
  })
  route('POST', '/cases/:id/reports', (ctx) => {
    need(ctx, 'reports.create')
    onlyFields(ctx.body, ['title', 'summary'])
    const c = caseFor(ctx, ctx.params.id)
    const title = str(ctx.body.title)
    const summary = str(ctx.body.summary ?? '')
    checks([
      ['title', len(title, 3, 200), 'Title must be 3–200 characters.'],
      ['summary', typeof summary === 'string' && summary.length <= 8000, 'Summary must be at most 8000 characters.'],
    ])
    const t = nowIso()
    const r = { id: uuid(`report-${seq.report}-${Date.now()}`), display_id: nextDisplay('report', 'RPT', 4), case_id: c.id, title, summary, status: 'DRAFT', author_id: ctx.user.id, created_at: t, updated_at: t, ai_assisted: false, content: null }
    reports.unshift(r)
    record(ctx.user, 'REPORT_DRAFT_CREATED', 'REPORT', r.id, r.display_id, title, 'SUCCESS', ctx.ip)
    return { status: 201, body: reportJson(r) }
  })
  route('POST', '/cases/:id/evidence', (ctx) => {
    need(ctx, 'evidence.upload')
    const c = caseFor(ctx, ctx.params.id)
    const mp = parseMultipart(ctx.raw, ctx.req.headers['content-type'])
    if (!mp) throw fail(400, 'BAD_REQUEST', 'Expected multipart/form-data.')
    const { fields, file } = mp
    const unknown = Object.keys(fields).filter((k) => !['evidence_type', 'description', 'client_sha256'].includes(k))
    if (unknown.length) throw invalid(unknown.map((f) => ({ field: f, message: 'Unknown field.' })))
    const description = str(fields.description)
    checks([
      ['file', Boolean(file) && file.data.length > 0, 'Select a non-empty file.'],
      ['evidence_type', EVIDENCE_TYPES.includes(fields.evidence_type), 'Select a valid evidence type.'],
      ['description', len(description, 1, 2000), 'Description is required (1–2000 characters).'],
      ['client_sha256', fields.client_sha256 === undefined || HEX64.test(fields.client_sha256), 'client_sha256 must be 64 hex characters.'],
    ])
    if (file.data.length > MAX_UPLOAD_BYTES) throw fail(413, 'PAYLOAD_TOO_LARGE', 'File exceeds the 100 MB limit.')
    const ext = file.filename.includes('.') ? file.filename.split('.').pop().toLowerCase() : ''
    if (!ALLOWED_EXT[fields.evidence_type].includes(ext)) {
      throw fail(415, 'UNSUPPORTED_MEDIA_TYPE', `".${ext || '?'}" files are not accepted for ${fields.evidence_type}. Allowed: ${ALLOWED_EXT[fields.evidence_type].map((x) => `.${x}`).join(', ')}.`)
    }
    const hash = sha256(file.data)
    const t = nowIso()
    const e = {
      id: uuid(`evidence-${seq.evidence}-${Date.now()}`), display_id: nextDisplay('evidence', 'EVD', 5), case_id: c.id,
      filename: file.filename, evidence_type: fields.evidence_type, mime_type: MIME[ext] ?? 'application/octet-stream',
      size_bytes: file.data.length, description, uploaded_by: ctx.user.id, registered_at: t, custodian_id: ctx.user.id,
      integrity_status: 'PENDING_LEDGER', sha256: hash, hash_at: t, data: file.data,
      ledger: { status: 'PENDING', tx_ref: null, recorded_sha256: null, recorded_at: null, last_checked_at: null },
      created_at: t, updated_at: t,
    }
    evidence.unshift(e)
    addEvent(e, 'REGISTERED', ctx.user, 'Evidence registered; SHA-256 calculated by the backend.')
    settleEvidence(e)
    const clientHashMatched = fields.client_sha256 === undefined ? null : fields.client_sha256.toLowerCase() === hash
    record(ctx.user, 'EVIDENCE_REGISTERED', 'EVIDENCE', e.id, e.display_id, e.filename, 'SUCCESS', ctx.ip)
    if (clientHashMatched === false) record(ctx.user, 'CLIENT_HASH_MISMATCH', 'EVIDENCE', e.id, e.display_id, 'Browser hash differed from server hash', 'FAILED', ctx.ip)
    return { status: 201, body: { ...evidenceJson(e), client_hash_matched: clientHashMatched } }
  }, { rawBody: true })

  // ---- evidence
  route('GET', '/evidence', (ctx) => {
    need(ctx, 'evidence.view')
    const ids = visibleCaseIds(ctx.user)
    const { q, case_id: caseId, integrity_status: st, evidence_type: type } = ctx.query
    const all = evidence.filter((e) => ids.has(e.case_id) && matches(q, e.display_id, e.filename, e.description) &&
      (!caseId || e.case_id === caseId) && (!st || e.integrity_status === st) && (!type || e.evidence_type === type))
    const page = paginate(all, ctx.query)
    return { status: 200, body: { ...page, items: page.items.map(evidenceJson) } }
  })
  route('GET', '/evidence/:id', (ctx) => {
    need(ctx, 'evidence.view')
    return { status: 200, body: evidenceJson(evidenceFor(ctx, ctx.params.id)) }
  })
  route('GET', '/evidence/:id/custody', (ctx) => {
    need(ctx, 'custody.view')
    const e = evidenceFor(ctx, ctx.params.id)
    const all = events.filter((x) => x.evidence_id === e.id).sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))
    return { status: 200, body: paginate(all, ctx.query) }
  })
  route('GET', '/evidence/:id/ledger', (ctx) => {
    need(ctx, 'custody.view')
    const e = evidenceFor(ctx, ctx.params.id)
    const entries = events.filter((x) => x.evidence_id === e.id && x.ledger?.status !== 'NOT_SUBMITTED').map((x, i) => ({
      event_type: x.event_type, sha256: e.sha256, tx_ref: x.ledger.tx_ref, block: 1000 + i,
      recorded_at: x.ledger.recorded_at, status: x.ledger.status === 'RECORDED' ? 'CONFIRMED' : 'SUBMITTED', explorer_url: null,
    }))
    return { status: 200, body: { evidence_id: e.id, network: 'MOCK_LEDGER', entries, last_synced_at: nowIso() } }
  })
  route('GET', '/evidence/:id/verifications', (ctx) => {
    need(ctx, 'verification.view')
    const e = evidenceFor(ctx, ctx.params.id)
    const all = verifications.filter((v) => v.evidence_id === e.id).sort((a, b) => new Date(b.verified_at) - new Date(a.verified_at))
    return { status: 200, body: paginate(all, ctx.query) }
  })
  route('POST', '/evidence/:id/verifications', (ctx) => {
    need(ctx, 'verification.run')
    onlyFields(ctx.body ?? {}, ['kind'])
    const e = evidenceFor(ctx, ctx.params.id)
    // Re-hash the stored bytes when we have them (uploaded evidence); seed items have no bytes, so
    // their outcome follows the seeded integrity state.
    const recalculated = e.data ? sha256(e.data) : (e.integrity_status === 'MISMATCH' ? TAMPERED_HASH : e.sha256)
    const ledgerOk = e.ledger.status === 'RECORDED'
    const result = recalculated !== e.sha256 ? 'MISMATCH' : ledgerOk ? 'MATCH' : 'LEDGER_UNAVAILABLE'
    const v = {
      id: uuid(`verif-${seq.verification++}-${Date.now()}`), evidence_id: e.id, kind: 'BACKEND', result,
      recalculated_sha256: recalculated, persisted_sha256: e.sha256, ledger_sha256: ledgerOk ? e.ledger.recorded_sha256 : null,
      ledger_tx_ref: ledgerOk ? e.ledger.tx_ref : null, verified_by: uref(ctx.user), verified_at: nowIso(), notes: null,
    }
    verifications.push(v)
    // Verification never changes the persisted hash — only the status label.
    if (result === 'MATCH') e.integrity_status = 'VERIFIED'
    if (result === 'MISMATCH') e.integrity_status = 'MISMATCH'
    addEvent(e, 'INTEGRITY_VERIFIED', ctx.user, `Backend verification: ${result}.`)
    record(ctx.user, 'VERIFICATION_RUN', 'EVIDENCE', e.id, e.display_id, result, 'SUCCESS', ctx.ip)
    return { status: 202, body: v }
  })
  route('GET', '/evidence/:id/analysis', (ctx) => {
    need(ctx, 'ai.view')
    const e = evidenceFor(ctx, ctx.params.id)
    return { status: 200, body: {
      id: uuid(`job-${e.id}`), evidence_id: e.id, status: 'COMPLETED', requested_by: uref(ctx.user), requested_at: nowIso(), completed_at: nowIso(),
      service: { name: 'trace-ai-stub', version: '0.0.0', model: 'STUB — no model connected' }, is_draft: true,
      disclaimer: 'AI-generated draft. Does not establish authenticity. Requires investigator review.',
      result: { summary: `Placeholder analysis for ${e.filename}. No AI service is connected to this stub.`, entities: [], timeline: [], classification: { label: 'UNCLASSIFIED', confidence: 0 } },
      error: null,
    } }
  })

  // ---- custody / transfers
  route('GET', '/custody/events', (ctx) => {
    need(ctx, 'custody.view')
    const limit = Number(ctx.query.limit ?? 10)
    checks([['limit', Number.isInteger(limit) && limit >= 1 && limit <= 100, 'limit must be 1–100.']])
    const ids = visibleCaseIds(ctx.user)
    const visibleEvidence = new Set(evidence.filter((e) => ids.has(e.case_id)).map((e) => e.id))
    const all = events.filter((x) => visibleEvidence.has(x.evidence_id)).sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)).slice(0, limit)
    return { status: 200, body: { items: all, page: 1, page_size: limit, total: all.length } }
  })
  const eligibleRecipients = (e) => {
    const c = findCase(e.case_id)
    return users.filter((u) => u.status === 'ACTIVE' && can(u, 'custody.hold') && assigned(u, c) && u.id !== e.custodian_id)
  }
  route('GET', '/evidence/:id/transfer-recipients', (ctx) => {
    need(ctx, 'custody.transfer')
    const e = evidenceFor(ctx, ctx.params.id)
    return { status: 200, body: { items: eligibleRecipients(e).map((u) => ({ ...uref(u), role: u.role })) } }
  })
  route('POST', '/evidence/:id/transfers', (ctx) => {
    need(ctx, 'custody.transfer')
    onlyFields(ctx.body, ['to_user_id', 'reason'])
    const e = evidenceFor(ctx, ctx.params.id)
    const c = findCase(e.case_id)
    if (e.custodian_id !== ctx.user.id && c.lead_id !== ctx.user.id) {
      record(ctx.user, 'PERMISSION_DENIED', 'EVIDENCE', e.id, e.display_id, 'Not custodian or lead investigator', 'DENIED', ctx.ip)
      throw fail(403, 'FORBIDDEN', 'Only the current custodian or the lead investigator can transfer this evidence.')
    }
    const reason = str(ctx.body.reason)
    const to = findUser(ctx.body.to_user_id)
    checks([
      ['reason', len(reason, 1, 1000), 'A reason for the transfer is required (1–1000 characters).'],
      ['to_user_id', Boolean(to), 'Select a recipient.'],
    ])
    if (to.id === e.custodian_id) throw fail(409, 'CONFLICT', 'Evidence is already held by this user.')
    if (!eligibleRecipients(e).some((u) => u.id === to.id)) throw invalid([{ field: 'to_user_id', message: 'The recipient cannot hold custody of this evidence.' }])
    if (transfers.some((t) => t.evidence_id === e.id && t.status === 'PENDING')) throw fail(409, 'CONFLICT', 'Another transfer is already pending for this evidence.')
    const base = { id: uuid(`transfer-${seq.transfer++}-${Date.now()}`), evidence_id: e.id, from_user: uref(findUser(e.custodian_id)), to_user: uref(to), reason }
    if (transferMode === 'two-step') {
      const tr = { ...base, status: 'PENDING', requested_at: nowIso() }
      transfers.push(tr)
      const ev = addEvent(e, 'CUSTODY_TRANSFER_REQUESTED', ctx.user, reason, { status: 'PENDING', from_user: tr.from_user, to_user: tr.to_user })
      record(ctx.user, 'CUSTODY_TRANSFER_REQUESTED', 'EVIDENCE', e.id, e.display_id, `-> ${to.name}`, 'SUCCESS', ctx.ip)
      return { status: 201, body: { transfer: tr, event: ev } }
    }
    const tr = { ...base, status: 'COMPLETED', requested_at: nowIso() }
    transfers.push(tr)
    e.custodian_id = to.id
    e.updated_at = nowIso()
    const ev = addEvent(e, 'CUSTODY_TRANSFERRED', ctx.user, `${reason} (To: ${to.name}.)`, { from_user: tr.from_user, to_user: tr.to_user })
    record(ctx.user, 'CUSTODY_TRANSFERRED', 'EVIDENCE', e.id, e.display_id, `-> ${to.name}`, 'SUCCESS', ctx.ip)
    return { status: 201, body: { transfer: tr, event: ev } }
  })
  route('GET', '/transfers', (ctx) => {
    need(ctx, 'custody.view')
    const { status, direction } = ctx.query
    const all = transfers.filter((t) => (!status || t.status === status) &&
      (direction === 'incoming' ? t.to_user.id === ctx.user.id : direction === 'outgoing' ? t.from_user.id === ctx.user.id : true))
    return { status: 200, body: paginate(all, ctx.query) }
  })
  const decide = (accept) => (ctx) => {
    need(ctx, 'custody.hold')
    const tr = transfers.find((t) => t.id === ctx.params.id)
    if (!tr || tr.to_user.id !== ctx.user.id) throw fail(404, 'NOT_FOUND', 'Transfer not found.')
    if (tr.status !== 'PENDING') throw fail(409, 'CONFLICT', 'This transfer has already been decided.')
    const e = findEvidence(tr.evidence_id)
    tr.status = accept ? 'COMPLETED' : 'REJECTED'
    if (accept) { e.custodian_id = ctx.user.id; e.updated_at = nowIso() }
    const ev = addEvent(e, accept ? 'CUSTODY_TRANSFERRED' : 'CUSTODY_TRANSFER_REJECTED', ctx.user, accept ? 'Transfer accepted.' : 'Transfer rejected.', { from_user: tr.from_user, to_user: tr.to_user, status: accept ? 'COMPLETED' : 'REJECTED' })
    record(ctx.user, accept ? 'TRANSFER_ACCEPTED' : 'TRANSFER_REJECTED', 'EVIDENCE', e.id, e.display_id, '', 'SUCCESS', ctx.ip)
    return { status: 200, body: { transfer: tr, event: ev } }
  }
  route('POST', '/transfers/:id/accept', decide(true))
  route('POST', '/transfers/:id/reject', decide(false))

  // ---- reports & audit
  route('GET', '/reports', (ctx) => {
    need(ctx, 'reports.view')
    const ids = visibleCaseIds(ctx.user)
    const { case_id: caseId, status } = ctx.query
    const all = reports.filter((r) => ids.has(r.case_id) && (!caseId || r.case_id === caseId) && (!status || r.status === status))
    const page = paginate(all, ctx.query)
    return { status: 200, body: { ...page, items: page.items.map(reportJson) } }
  })
  route('GET', '/reports/:id', (ctx) => {
    need(ctx, 'reports.view')
    const r = reports.find((x) => x.id === ctx.params.id)
    if (!r || !assigned(ctx.user, findCase(r.case_id))) throw fail(404, 'NOT_FOUND', 'Report not found.')
    return { status: 200, body: reportJson(r) }
  })
  route('GET', '/audit', (ctx) => {
    need(ctx, 'audit.view')
    const { actor_id: actor, action, target_type: tt, target_id: tid, outcome } = ctx.query
    // The audit array is append-only, so newest-first is simply the reverse of insertion order.
    const all = audit.filter((a) => (!actor || a.actor?.id === actor) && (!action || a.action === action) &&
      (!tt || a.target_type === tt) && (!tid || a.target_id === tid) && (!outcome || a.outcome === outcome))
    return { status: 200, body: paginate([...all].reverse(), ctx.query) }
  })

  // ------------------------------------------------------------ server
  const allowedOrigins = new Set([
    'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://localhost:3000', ...corsOrigins,
  ])

  const readBody = (req, limit) => new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(fail(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.')); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

  const send = (res, status, body) => {
    if (status === 204 || body === undefined) { res.writeHead(status); res.end(); return }
    const json = JSON.stringify(body)
    res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) })
    res.end(json)
  }

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Idempotency-Key')
      res.setHeader('Access-Control-Expose-Headers', 'X-TRACE-SHA256')
    }
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    const url = new URL(req.url, 'http://stub.local')
    const path = url.pathname.replace(/^\/api\/v1/, '') || '/'
    const ip = req.socket.remoteAddress ?? '127.0.0.1'
    try {
      if (!url.pathname.startsWith('/api/v1')) throw fail(404, 'NOT_FOUND', 'Not found. The API lives under /api/v1.')
      const match = routes.map((r) => ({ r, m: r.method === req.method ? r.re.exec(path) : null })).find((x) => x.m)
      if (!match) {
        const pathExists = routes.some((r) => r.re.test(path))
        throw pathExists ? fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.') : fail(404, 'NOT_FOUND', 'No such endpoint in the stub (it may be a contract endpoint the stub does not implement yet).')
      }
      const ctx = { req, res, method: req.method, path, ip, query: Object.fromEntries(url.searchParams), params: {}, body: undefined, raw: undefined, user: null }
      match.r.keys.forEach((k, i) => { ctx.params[k] = decodeURIComponent(match.m[i + 1]) })
      if (!match.r.public) ctx.user = authenticate(req)
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const raw = await readBody(req, MAX_UPLOAD_BYTES + 1024 * 1024)
        if (match.r.rawBody) ctx.raw = raw
        else if (raw.length) {
          try { ctx.body = JSON.parse(raw.toString('utf8')) } catch { throw fail(400, 'BAD_REQUEST', 'Request body is not valid JSON.') }
        } else ctx.body = {}
      }
      const out = match.r.handler(ctx)
      send(res, out.status, out.body)
    } catch (err) {
      if (err instanceof HttpError) {
        const body = { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}), ...(err.extra ?? {}) } }
        send(res, err.status, body)
      } else {
        console.error(err)
        send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Unexpected stub error.' } })
      }
    }
  })

  const close = () => { for (const t of timers) clearTimeout(t); return new Promise((r) => server.close(r)) }
  return { server, close, state: { users, cases, evidence, events, reports, audit, transfers, verifications } }
}
