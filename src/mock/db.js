// Single in-memory mock database. All api/*.js modules read and write through this object so
// changes (new evidence, users, cases, audit entries) are visible everywhere for the rest of the
// session. Nothing is persisted: a full page reload resets everything to the seed data.
import { seedUsers } from './users'
import { cases as seedCases } from './cases'
import { evidence as seedEvidence } from './evidence'
import { custodyEvents as seedCustody } from './custody'
import { reports as seedReports } from './reports'

const clone = (list) => list.map((item) => ({ ...item }))

export const db = {
  users: clone(seedUsers),
  cases: clone(seedCases),
  evidence: clone(seedEvidence),
  custodyEvents: clone(seedCustody),
  reports: clone(seedReports),
  verifications: [], // locally-run mock verifications, newest first
  auditLog: [],
}

let counter = 1000
const nextSequence = () => (counter += 1)

export const newId = (prefix, pad = 5) => `${prefix}-${String(nextSequence()).padStart(pad, '0')}`

export const recordAudit = (actor, action, target, detail = '') => {
  db.auditLog.unshift({
    id: newId('AUD', 6),
    timestamp: new Date().toISOString(),
    actor_id: actor?.id ?? null,
    actor_name: actor?.name ?? 'Anonymous',
    action,
    target,
    detail,
  })
}

// Clearly-labelled synthetic AI output. Not produced by any model.
export const mockAiAnalysis = (evidenceItem) => ({
  evidence_id: evidenceItem.id,
  synthetic: true,
  model: 'Placeholder — no AI model is connected (pending Jijo)',
  summary: `Synthetic placeholder analysis for a ${String(evidenceItem.file_type).toLowerCase()} item. This text is fabricated for UI demonstration and was not generated from the file.`,
})
