import { ApiError } from '../client'
import { mockDelay } from './delay'
import { db, recordAudit, newId } from '../../mock/db'
import { authorize } from './guard'
import { P, canViewCase } from '../../utils/permissions'

const visible = (user) => {
  const ids = new Set(db.cases.filter((c) => canViewCase(user, c)).map((c) => c.id))
  return db.reports.filter((r) => ids.has(r.case_id))
}

export const getReports = async () => {
  const user = authorize(P.REPORTS_VIEW)
  return mockDelay(visible(user).map((r) => ({ ...r })), 300)
}

export const getReportsByCaseId = async (caseId) => {
  const user = authorize(P.REPORTS_VIEW)
  return mockDelay(
    visible(user)
      .filter((r) => r.case_id === caseId)
      .map((r) => ({ ...r })),
    250,
  )
}

// Creates a DRAFT report record (title/summary only). No document is generated.
export const createDraftReport = async ({ caseId, title, summary }) => {
  const user = authorize(P.REPORTS_CREATE)
  const parent = db.cases.find((c) => c.id === caseId)
  if (!parent || !canViewCase(user, parent)) throw new ApiError('Select one of your assigned cases.', 400)
  if (!title?.trim()) throw new ApiError('Report title is required.', 400)
  const report = {
    id: newId('RPT', 4),
    case_id: caseId,
    title: title.trim(),
    summary: summary?.trim() ?? '',
    author: user.name,
    generated_at: new Date().toISOString(),
    status: 'DRAFT',
  }
  db.reports.unshift(report)
  recordAudit(user, 'REPORT_DRAFT_CREATED', report.id, report.title)
  return mockDelay({ ...report }, 300)
}
