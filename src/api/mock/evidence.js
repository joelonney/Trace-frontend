import { ApiError } from '../client'
import { mockDelay } from './delay'
import { db, recordAudit, newId } from '../../mock/db'
import { authorize } from './guard'
import { P, canAccessEvidence, canUploadToCase } from '../../utils/permissions'
import { computeFileSha256 } from '../../utils/hash'

import { validateEvidenceFile } from '../../constants/evidence'

export { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, EVIDENCE_TYPES, validateEvidenceFile } from '../../constants/evidence'

const caseOf = (item) => db.cases.find((c) => c.id === item.case_id)

const scoped = (user) => db.evidence.filter((e) => canAccessEvidence(user, e, caseOf(e)))

export const getEvidence = async () => {
  const user = authorize(P.EVIDENCE_VIEW)
  return mockDelay(scoped(user).map((e) => ({ ...e })), 300)
}

export const getEvidenceById = async (id) => {
  const user = authorize(P.EVIDENCE_VIEW)
  const found = db.evidence.find((e) => e.id === id)
  if (!found) throw new ApiError(`Evidence ${id} not found`, 404)
  if (!canAccessEvidence(user, found, caseOf(found))) {
    throw new ApiError('You are not authorized to access this evidence', 403)
  }
  return mockDelay({ ...found }, 250)
}

export const getEvidenceByCaseId = async (caseId) => {
  const user = authorize(P.EVIDENCE_VIEW)
  return mockDelay(
    scoped(user)
      .filter((e) => e.case_id === caseId)
      .map((e) => ({ ...e })),
    250,
  )
}

// Registers a MOCK evidence record for a file the user picked. The file is read locally to compute
// a genuine SHA-256 (Web Crypto) and is then discarded: nothing is uploaded, encrypted, pinned to
// IPFS, or written to a blockchain. The record lives in memory until the page is reloaded.
export const uploadEvidence = async ({ caseId, file, fileType, description }) => {
  const user = authorize(P.EVIDENCE_UPLOAD)
  const parentCase = db.cases.find((c) => c.id === caseId)
  if (!parentCase) throw new ApiError('Select a case.', 400)
  if (!canUploadToCase(user, parentCase)) {
    throw new ApiError('You can only upload evidence to cases assigned to you.', 403)
  }
  if (!description?.trim()) throw new ApiError('Add a short evidence description.', 400)
  const fileError = validateEvidenceFile(file, fileType)
  if (fileError) throw new ApiError(fileError, 400)

  const sha256 = await computeFileSha256(file)
  const now = new Date().toISOString()
  const newItem = {
    id: `EVD-${new Date().getFullYear()}-${String(newId('X')).slice(-5)}`,
    case_id: caseId,
    filename: file.name,
    file_type: fileType,
    description: description.trim(),
    size: file.size,
    sha256,
    hash_source: 'LOCAL_CALCULATED',
    cid: null,
    uploaded_by: user.id,
    upload_timestamp: now,
    current_custodian: user.id,
    status: 'PENDING_VERIFICATION',
    is_mock_registration: true,
  }
  db.evidence.unshift(newItem)
  db.custodyEvents.push({
    id: newId('CST', 6),
    evidence_id: newItem.id,
    event_type: 'REGISTERED',
    actor: user.name,
    organization: user.organization,
    timestamp: now,
    reason: 'Mock registration of a locally selected file. No file was stored or recorded on-chain.',
    status: 'COMPLETED',
    transaction_id: null,
  })
  recordAudit(user, 'EVIDENCE_REGISTERED_MOCK', newItem.id, `${file.name} → ${caseId}`)
  return mockDelay({ ...newItem }, 600)
}
