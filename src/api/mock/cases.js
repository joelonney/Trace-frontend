import { ApiError } from '../client'
import { mockDelay } from './delay'
import { db, recordAudit, newId } from '../../mock/db'
import { requireUser } from './session'
import { authorize } from './guard'
import { P, canViewCase, canUpdateCase, hasPermission } from '../../utils/permissions'
import { CASE_STATUS, CASE_PRIORITY } from '../../mock/cases'

// Server-side-style scoping (mock): returns only cases the current user may view.
export const visibleCases = (user = requireUser()) => db.cases.filter((c) => canViewCase(user, c))

export const getCases = async () => {
  authorize(P.CASES_VIEW)
  return mockDelay(visibleCases().map((c) => ({ ...c })), 300)
}

export const getCaseById = async (id) => {
  const user = authorize(P.CASES_VIEW)
  const found = db.cases.find((c) => c.id === id)
  if (!found) throw new ApiError(`Case ${id} not found`, 404)
  if (!canViewCase(user, found)) throw new ApiError('You are not assigned to this case', 403)
  return mockDelay({ ...found, documents: [...(found.documents ?? [])] }, 250)
}

export const createCase = async ({ title, type, priority, description }) => {
  const user = authorize(P.CASES_CREATE)
  if (!title?.trim() || !type?.trim() || !description?.trim()) {
    throw new ApiError('Title, type and description are required.', 400)
  }
  const item = {
    id: `TRC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    assigned_user_ids: [user.id],
    title: title.trim(),
    type: type.trim(),
    status: CASE_STATUS.OPEN,
    priority: priority && CASE_PRIORITY[priority] ? priority : CASE_PRIORITY.MEDIUM,
    investigator: user.name,
    investigator_id: user.id,
    organization: user.organization,
    opened_date: new Date().toISOString().slice(0, 10),
    description: description.trim(),
    documents: [],
  }
  db.cases.unshift(item)
  recordAudit(user, 'CASE_CREATED', item.id, item.title)
  return mockDelay({ ...item }, 300)
}

export const updateCase = async (id, { title, status, priority, description }) => {
  const user = authorize(P.CASES_UPDATE)
  const item = db.cases.find((c) => c.id === id)
  if (!item) throw new ApiError(`Case ${id} not found`, 404)
  if (!canUpdateCase(user, item)) throw new ApiError('You cannot update this case', 403)
  if (!title?.trim() || !description?.trim()) throw new ApiError('Title and description are required.', 400)
  if (!CASE_STATUS[status] || !CASE_PRIORITY[priority]) throw new ApiError('Invalid status or priority.', 400)
  Object.assign(item, { title: title.trim(), status, priority, description: description.trim() })
  recordAudit(user, 'CASE_UPDATED', id, item.title)
  return mockDelay({ ...item }, 250)
}

// Case documentation (metadata only — no file contents).
export const registerCaseDocument = async (caseId, { title, note }) => {
  const user = authorize(P.DOCUMENTS_MANAGE)
  const item = db.cases.find((c) => c.id === caseId)
  if (!item) throw new ApiError(`Case ${caseId} not found`, 404)
  if (!canViewCase(user, item)) throw new ApiError('You are not assigned to this case', 403)
  if (!title?.trim()) throw new ApiError('Document title is required.', 400)
  const doc = {
    id: newId('DOC'),
    title: title.trim(),
    note: note?.trim() ?? '',
    added_by: user.name,
    added_at: new Date().toISOString(),
  }
  item.documents = [doc, ...(item.documents ?? [])]
  recordAudit(user, 'CASE_DOCUMENT_REGISTERED', caseId, doc.title)
  return mockDelay(doc, 250)
}

export const removeCaseDocument = async (caseId, docId) => {
  const user = authorize(P.DOCUMENTS_MANAGE)
  const item = db.cases.find((c) => c.id === caseId)
  if (!item || !canViewCase(user, item)) throw new ApiError('Case not found', 404)
  item.documents = (item.documents ?? []).filter((d) => d.id !== docId)
  recordAudit(user, 'CASE_DOCUMENT_REMOVED', caseId, docId)
  return mockDelay(true, 150)
}

export const canManageDocuments = (user) => hasPermission(user, P.DOCUMENTS_MANAGE)
