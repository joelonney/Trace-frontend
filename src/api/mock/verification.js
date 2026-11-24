import { ApiError } from '../client'
import { mockDelay } from './delay'
import { db, recordAudit } from '../../mock/db'
import { authorize } from './guard'
import { P, canAccessEvidence } from '../../utils/permissions'
import { buildSyntheticVerification, VERIFICATION_SOURCE } from '../../mock/verification'
import { computeFileSha256 } from '../../utils/hash'

const load = (evidenceId, permission) => {
  const user = authorize(permission)
  const item = db.evidence.find((e) => e.id === evidenceId)
  if (!item) throw new ApiError(`Evidence ${evidenceId} not found`, 404)
  const parent = db.cases.find((c) => c.id === item.case_id)
  if (!canAccessEvidence(user, item, parent)) {
    throw new ApiError('You are not authorized to access this evidence', 403)
  }
  return { user, item }
}

// Returns the latest verification record. Seed evidence gets a SYNTHETIC_DEMO record; items that
// were verified locally in this session return that local record instead.
export const getVerification = async (evidenceId) => {
  const { item } = load(evidenceId, P.VERIFICATION_VIEW)
  const local = db.verifications.find((v) => v.evidence_id === evidenceId)
  const record = local ?? buildSyntheticVerification(item, db.custodyEvents)
  return mockDelay({ ...record }, 400)
}

// Mock integrity check. If a file is supplied, its SHA-256 is genuinely calculated in the browser
// and compared with the hash held in the mock record (LOCAL_CALCULATED). Without a file the result
// is a synthetic demo outcome. Neither path contacts a backend or a blockchain, and neither can
// change the recorded hash.
export const runVerification = async (evidenceId, file = null) => {
  const { user, item } = load(evidenceId, P.VERIFICATION_RUN)
  let record
  if (file) {
    const calculated = await computeFileSha256(file)
    record = {
      evidence_id: item.id,
      source: VERIFICATION_SOURCE.LOCAL_CALCULATED,
      recorded_sha256: item.sha256,
      current_sha256: calculated,
      match: calculated === item.sha256,
      verified_timestamp: null,
      placeholder_reference: null,
      checked_at: new Date().toISOString(),
      checked_by: user.name,
      checked_filename: file.name,
    }
  } else {
    record = {
      ...buildSyntheticVerification(item, db.custodyEvents),
      checked_at: new Date().toISOString(),
      checked_by: user.name,
    }
  }
  db.verifications.unshift(record)
  db.custodyEvents.push({
    id: `CST-V-${db.verifications.length}-${Date.now()}`,
    evidence_id: item.id,
    event_type: 'INTEGRITY_VERIFIED',
    actor: user.name,
    organization: user.organization,
    timestamp: record.checked_at,
    reason:
      record.source === VERIFICATION_SOURCE.LOCAL_CALCULATED
        ? `Local hash comparison ${record.match ? 'matched' : 'did NOT match'} (calculated in browser; not blockchain-verified).`
        : 'Synthetic demonstration verification (no real check performed).',
    status: 'COMPLETED',
    transaction_id: null,
  })
  recordAudit(user, 'VERIFICATION_RUN_MOCK', item.id, record.source)
  return mockDelay({ ...record }, 600)
}
