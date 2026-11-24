import { ApiError } from '../client'
import { mockDelay } from './delay'
import { db, recordAudit, newId } from '../../mock/db'
import { authorize } from './guard'
import { P, canAccessEvidence, canViewCase, hasPermission } from '../../utils/permissions'
import { requireUser } from './session'

const caseOf = (item) => db.cases.find((c) => c.id === item.case_id)

// A custodian must be active, allowed to hold custody, and able to see the case
// (ADMIN sees all cases via CASES_VIEW_ALL, so canViewCase covers that too).
const canHoldCustody = (user, parentCase) =>
  user.status === 'ACTIVE' && hasPermission(user, P.CUSTODY_HOLD) && canViewCase(user, parentCase)

const accessibleEvidenceIds = (user) =>
  new Set(db.evidence.filter((e) => canAccessEvidence(user, e, caseOf(e))).map((e) => e.id))

const loadAccessible = (evidenceId) => {
  const user = authorize(P.CUSTODY_VIEW)
  const item = db.evidence.find((e) => e.id === evidenceId)
  if (!item) throw new ApiError(`Evidence ${evidenceId} not found`, 404)
  if (!canAccessEvidence(user, item, caseOf(item))) {
    throw new ApiError('You are not authorized to access this evidence', 403)
  }
  return { user, item }
}

export const getCustodyEvents = async (evidenceId) => {
  loadAccessible(evidenceId)
  return mockDelay(
    db.custodyEvents
      .filter((e) => e.evidence_id === evidenceId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    300,
  )
}

export const getRecentCustodyEvents = async (limit = 5) => {
  const user = authorize(P.CUSTODY_VIEW)
  const ids = accessibleEvidenceIds(user)
  return mockDelay(
    db.custodyEvents
      .filter((e) => ids.has(e.evidence_id))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit),
    300,
  )
}

export const getPendingAccessRequests = async () => {
  const user = requireUser()
  if (!hasPermission(user, P.CUSTODY_VIEW)) return []
  const ids = accessibleEvidenceIds(user)
  return mockDelay(
    db.custodyEvents.filter(
      (e) => ids.has(e.evidence_id) && e.event_type === 'ACCESS_REQUESTED' && e.status === 'PENDING',
    ),
    250,
  )
}

// Mock transfers are immediate (no approval step), so nothing is ever waiting for acceptance.
export const getIncomingTransfers = async () => {
  authorize(P.CUSTODY_VIEW)
  return mockDelay([], 150)
}
export const acceptTransfer = async () => {
  throw new ApiError('Transfer approval is not available in mock mode (transfers are immediate).', 501)
}
export const rejectTransfer = async () => {
  throw new ApiError('Transfer approval is not available in mock mode (transfers are immediate).', 501)
}

// Simulated custody transfer. No chaincode is invoked: the custodian changes in memory and a
// clearly-labelled event is appended. A real implementation would be an on-chain transaction.
export const transferCustody = async ({ evidenceId, toUserId, reason }) => {
  const actor = authorize(P.CUSTODY_TRANSFER)
  const { item } = loadAccessible(evidenceId)
  const recipient = db.users.find((u) => u.id === toUserId && u.status === 'ACTIVE')
  if (!recipient) throw new ApiError('Select an active recipient.', 400)
  if (recipient.id === item.current_custodian) throw new ApiError('Evidence is already held by this user.', 400)
  if (!reason?.trim()) throw new ApiError('A reason for the transfer is required.', 400)
  if (!canHoldCustody(recipient, caseOf(item))) {
    throw new ApiError('The recipient cannot hold custody of this evidence.', 400)
  }

  item.current_custodian = recipient.id
  const event = {
    id: newId('CST', 6),
    evidence_id: item.id,
    event_type: 'CUSTODY_TRANSFERRED',
    actor: actor.name,
    organization: actor.organization,
    timestamp: new Date().toISOString(),
    reason: `${reason.trim()} (To: ${recipient.name}. Simulated — not recorded on a blockchain.)`,
    status: 'COMPLETED',
    transaction_id: null,
  }
  db.custodyEvents.push(event)
  recordAudit(actor, 'CUSTODY_TRANSFER_SIMULATED', item.id, `→ ${recipient.name}`)
  return mockDelay(event, 400)
}

// Active users that could receive custody. Same rule as transferCustody so the dropdown and the
// server-side check never disagree.
export const getTransferRecipients = async (evidenceId) => {
  const { item } = loadAccessible(evidenceId)
  const parent = caseOf(item)
  return mockDelay(
    db.users
      .filter((u) => u.id !== item.current_custodian && canHoldCustody(u, parent))
      .map((u) => ({ id: u.id, name: u.name, organization: u.organization, role: u.role })),
    150,
  )
}
