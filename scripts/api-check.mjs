// API-layer verification harness. Runs the real src/api modules under Node via Vite's SSR loader.
// No browser: this checks logic, not rendering.
import { createServer } from 'vite'

const root = process.argv[2]
const server = await createServer({
  root,
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
})

let pass = 0
let fail = 0
const ok = (cond, label) => {
  if (cond) pass += 1
  else fail += 1
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
}
const rejects = async (fn, label, status) => {
  try {
    await fn()
    ok(false, `${label} (did not throw)`)
  } catch (e) {
    ok(status ? e.status === status : true, `${label} → ${e.status ?? '-'} ${e.message}`)
  }
}

try {
  const mode = await server.ssrLoadModule('/src/api/mode.js')
  console.log('\n--- mode')
  ok(mode.useMock === true && mode.API_MODE === 'mock', 'VITE_API_MODE unset → mock mode is the default')

  const auth = await server.ssrLoadModule('/src/api/auth.js')
  const cases = await server.ssrLoadModule('/src/api/cases.js')
  const evidence = await server.ssrLoadModule('/src/api/evidence.js')
  const custody = await server.ssrLoadModule('/src/api/custody.js')
  const verification = await server.ssrLoadModule('/src/api/verification.js')
  const reports = await server.ssrLoadModule('/src/api/reports.js')
  const { db } = await server.ssrLoadModule('/src/mock/db.js')

  console.log('\n--- auth')
  await rejects(() => auth.login('', ''), 'empty credentials rejected', 400)
  await rejects(() => auth.login('nobody@trace.local', 'x'), 'unknown user rejected', 401)
  await rejects(() => auth.login('officer@trace.local', 'wrong'), 'wrong password rejected', 401)
  const officer = await auth.login('OFFICER@trace.local ', 'Officer@123')
  ok(officer.role === 'OFFICER', 'login is case/whitespace-insensitive on email')
  await auth.logout()
  await rejects(() => cases.getCases(), 'unauthenticated API call rejected', 401)

  console.log('\n--- scoping')
  await auth.login('reviewer@trace.local', 'Reviewer@123')
  const readerCases = await cases.getCases()
  ok(readerCases.length === 4, `reader sees 4 assigned cases (${readerCases.length})`)
  await rejects(() => cases.getCaseById('TRC-2026-0142'), 'reader denied unassigned case', 403)
  await rejects(() => evidence.getEvidenceById('EVD-2026-00279'), 'reader denied evidence on unassigned case', 403)
  await rejects(() => cases.createCase({ title: 'x', type: 'y', description: 'z' }), 'reader cannot create case', 403)
  await rejects(() => auth.getUsers(), 'reader cannot list users', 403)
  await rejects(() => verification.runVerification('EVD-2026-00231'), 'reader cannot run verification', 403)
  const readerEv = await evidence.getEvidence()
  ok(readerEv.every((e) => readerCases.some((c) => c.id === e.case_id)), 'reader evidence list is limited to visible cases')

  console.log('\n--- clerk')
  await auth.login('clerk@trace.local', 'Clerk@123')
  const f = new File(['hello'], 'a.pdf', { type: 'application/pdf' })
  await rejects(() => evidence.uploadEvidence({ caseId: 'TRC-2026-0114', file: f, fileType: 'Document', description: 'd' }), 'clerk cannot upload', 403)
  await rejects(() => custody.transferCustody({ evidenceId: 'EVD-2026-00231', toUserId: 'USR-002', reason: 'r' }), 'clerk cannot transfer', 403)
  const doc = await cases.registerCaseDocument('TRC-2026-0114', { title: 'Intake form' })
  ok(Boolean(doc.id), 'clerk can register case document')
  const draft = await reports.createDraftReport({ caseId: 'TRC-2026-0114', title: 'Draft' })
  ok(draft.status === 'DRAFT', 'clerk can create draft report')

  console.log('\n--- officer upload')
  await auth.login('officer@trace.local', 'Officer@123')
  const empty = new File([], 'empty.pdf')
  ok(evidence.validateEvidenceFile(empty, 'Document')?.includes('empty'), 'empty file rejected')
  ok(evidence.validateEvidenceFile(new File(['x'], 'noext'), 'Document')?.includes('not accepted'), 'file without extension rejected')
  ok(evidence.validateEvidenceFile(new File(['x'], 'virus.exe'), 'Document')?.includes('not accepted'), 'disallowed extension rejected')
  ok(evidence.validateEvidenceFile(new File(['x'], 'SCAN.PDF'), 'Document') === null, 'uppercase extension accepted')
  ok(evidence.validateEvidenceFile(new File(['x'], 'a.pdf'), 'Video')?.includes('not accepted'), 'extension must match selected type')
  const big = { name: 'big.mp4', size: 100 * 1024 * 1024 + 1 }
  ok(evidence.validateEvidenceFile(big, 'Video')?.includes('100 MB'), '>100 MB rejected')
  ok(evidence.validateEvidenceFile({ name: 'ok.mp4', size: 100 * 1024 * 1024 }, 'Video') === null, 'exactly 100 MB accepted')
  await rejects(() => evidence.uploadEvidence({ caseId: 'TRC-2026-0114', file: f, fileType: 'Document', description: '' }), 'missing description rejected', 400)
  await rejects(() => evidence.uploadEvidence({ caseId: 'NOPE', file: f, fileType: 'Document', description: 'd' }), 'unknown case rejected', 400)

  const before = db.evidence.length
  const item = await evidence.uploadEvidence({ caseId: 'TRC-2026-0114', file: f, fileType: 'Document', description: 'test' })
  ok(db.evidence.length === before + 1, 'upload adds exactly one in-memory record')
  ok(item.sha256 === '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', 'SHA-256 of "hello" is correct (real Web Crypto)')
  ok(item.hash_source === 'LOCAL_CALCULATED' && item.cid === null && item.is_mock_registration, 'new record labelled local, no CID')
  ok(/^EVD-\d{4}-\d{5}$/.test(item.id) && !db.evidence.some((e) => e !== db.evidence[0] && e.id === item.id), `new evidence id unique (${item.id})`)
  const ev = await custody.getCustodyEvents(item.id)
  ok(ev.length === 1 && ev[0].event_type === 'REGISTERED' && ev[0].transaction_id === null, 'REGISTERED custody event without tx ref')

  console.log('\n--- verification')
  const v0 = await verification.getVerification(item.id)
  ok(v0.source === 'SYNTHETIC_DEMO', 'default record is synthetic')
  const v1 = await verification.runVerification(item.id, new File(['hello'], 'a.pdf'))
  ok(v1.source === 'LOCAL_CALCULATED' && v1.match === true, 'same bytes → local MATCH')
  const v2 = await verification.runVerification(item.id, new File(['hellO'], 'a.pdf'))
  ok(v2.source === 'LOCAL_CALCULATED' && v2.match === false, 'different bytes → local MISMATCH')
  ok(v2.recorded_sha256 === item.sha256 && db.evidence[0].sha256 === item.sha256, 'recorded hash unchanged by verification')
  ok((await verification.getVerification(item.id)).match === false, 'latest verification is returned')
  const flagged = await verification.getVerification('EVD-2026-00258')
  ok(flagged.match === false && flagged.source === 'SYNTHETIC_DEMO', 'flagged seed item shows synthetic mismatch')
  ok(!JSON.stringify(v1).includes('transaction_id'), 'verification record has no blockchain tx field')

  console.log('\n--- custody transfer')
  const recips = await custody.getTransferRecipients(item.id)
  ok(recips.every((r) => r.role !== 'READER' && r.id !== 'USR-002'), 'recipients exclude readers and current custodian')
  await rejects(() => custody.transferCustody({ evidenceId: item.id, toUserId: 'USR-004', reason: 'r' }), 'cannot transfer to reader', 400)
  await rejects(() => custody.transferCustody({ evidenceId: item.id, toUserId: 'USR-003', reason: '' }), 'reason required', 400)
  const t = await custody.transferCustody({ evidenceId: item.id, toUserId: 'USR-003', reason: 'lab' })
  ok(t.transaction_id === null && db.evidence[0].current_custodian === 'USR-003', 'transfer updates custodian, no tx ref')
  await rejects(() => custody.transferCustody({ evidenceId: item.id, toUserId: 'USR-003', reason: 'again' }), 'cannot transfer to current custodian', 400)

  console.log('\n--- cases')
  const c = await cases.createCase({ title: 'New', type: 'Fraud', priority: 'HIGH', description: 'desc' })
  ok(c.assigned_user_ids.includes('USR-002') && (await cases.getCases()).some((x) => x.id === c.id), 'officer creates case and is assigned')
  ok(!db.cases.some((x) => x !== db.cases[0] && x.id === c.id), 'new case id unique')
  await rejects(() => cases.updateCase('TRC-2026-0114', { title: 'x', status: 'BOGUS', priority: 'HIGH', description: 'd' }), 'invalid status rejected', 400)

  console.log('\n--- admin / users')
  await auth.login('admin@trace.local', 'Admin@123')
  await rejects(() => evidence.uploadEvidence({ caseId: 'TRC-2026-0114', file: f, fileType: 'Document', description: 'd' }), 'admin cannot upload', 403)
  await rejects(() => auth.createUser({ name: 'A', email: 'bad', role: 'OFFICER', organization: 'o', temporaryPassword: 'longenough' }), 'invalid email rejected', 400)
  await rejects(() => auth.createUser({ name: 'A', email: 'Officer@Trace.local', role: 'OFFICER', organization: 'o', temporaryPassword: 'longenough' }), 'duplicate email (case-insensitive) rejected', 409)
  await rejects(() => auth.createUser({ name: 'A', email: 'new@trace.local', role: 'OFFICER', organization: 'o', temporaryPassword: 'short' }), 'short temp password rejected', 400)
  await rejects(() => auth.createUser({ name: 'A', email: 'new@trace.local', role: 'GOD', organization: 'o', temporaryPassword: 'longenough' }), 'invalid role rejected', 400)
  const nu = await auth.createUser({ name: 'New Person', email: 'new@trace.local', role: 'CLERK', organization: 'Lab', temporaryPassword: 'Temp#1234' })
  ok(nu.status === 'ACTIVE' && (await auth.getUsers()).length === 5, 'user created')
  await rejects(() => auth.setUserStatus('USR-001', 'INACTIVE'), 'admin cannot deactivate self', 400)
  await rejects(() => auth.updateUser('USR-001', { role: 'READER' }), 'admin cannot demote self', 400)
  await auth.setUserStatus(nu.id, 'INACTIVE')
  await auth.logout()
  await rejects(() => auth.login('new@trace.local', 'Temp#1234'), 'deactivated user cannot log in', 403)
  await auth.login('admin@trace.local', 'Admin@123')
  await auth.setUserStatus(nu.id, 'ACTIVE')
  await auth.logout()
  const back = await auth.login('new@trace.local', 'Temp#1234')
  ok(back.id === nu.id, 'created user can log in with the temp password after reactivation')
  const dir = await auth.getUserDirectory()
  ok(dir['USR-001'] === 'Alex Morgan' && !JSON.stringify(dir).includes('@'), 'directory exposes names only')
  await auth.login('admin@trace.local', 'Admin@123')
  const log = await auth.getAuditLog()
  ok(log.length > 10 && log[0].timestamp >= log[log.length - 1].timestamp, `audit log populated, newest first (${log.length})`)
} finally {
  await server.close()
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
