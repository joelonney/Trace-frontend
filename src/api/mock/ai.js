import { ApiError } from '../client'
import { mockDelay } from './delay'
import { db, mockAiAnalysis } from '../../mock/db'
import { authorize } from './guard'
import { P, canAccessEvidence } from '../../utils/permissions'

// Placeholder only — no AI model is connected. Returns clearly-labelled synthetic text.
export const getAiAnalysis = async (evidenceId) => {
  const user = authorize(P.AI_VIEW)
  const item = db.evidence.find((e) => e.id === evidenceId)
  if (!item) throw new ApiError(`Evidence ${evidenceId} not found`, 404)
  const parent = db.cases.find((c) => c.id === item.case_id)
  if (!canAccessEvidence(user, item, parent)) throw new ApiError('Not authorized', 403)
  return mockDelay(mockAiAnalysis(item), 300)
}
