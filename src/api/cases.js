// Facade for cases. The implementation is chosen once by ./mode.js (default: mock).
// Exported names and return shapes are identical in both modes so pages never change.
// HTTP paths follow docs/API_CONTRACT_V1.md and have NOT been tested against a live backend.
import { useMock } from './mode'
import * as mock from './mock/cases'
import { http } from './http'
import * as A from './adapters'

import { hasPermission, P } from '../utils/permissions'

const withDocuments = async (c) => {
  // Documents are a separate resource under the contract; the UI expects them embedded.
  try {
    const docs = A.items(await http.get(`/cases/${c.id}/documents`))
    return { ...c, documents: docs.map(A.toCaseDocument) }
  } catch {
    return c
  }
}

const real = {
  getCases: async () => A.items(await http.get('/cases', { page_size: 100 })).map(A.toCase),
  getCaseById: async (id) => withDocuments(A.toCase(await http.get(`/cases/${id}`))),
  createCase: async ({ title, type, priority, description }) =>
    A.toCase(await http.post('/cases', { title, type, priority, description })),
  updateCase: async (id, { title, status, priority, description }) =>
    A.toCase(await http.patch(`/cases/${id}`, { title, status, priority, description })),
  registerCaseDocument: async (caseId, { title, note }) =>
    A.toCaseDocument(await http.post(`/cases/${caseId}/documents`, { title, note })),
  removeCaseDocument: async (caseId, docId) => {
    await http.del(`/cases/${caseId}/documents/${docId}`)
    return true
  },
  visibleCases: undefined, // mock-only helper; server does the scoping in http mode
}

const impl = useMock ? mock : real

export const getCases = impl.getCases
export const getCaseById = impl.getCaseById
export const createCase = impl.createCase
export const updateCase = impl.updateCase
export const registerCaseDocument = impl.registerCaseDocument
export const removeCaseDocument = impl.removeCaseDocument
export const visibleCases = impl.visibleCases
export const canManageDocuments = (user) => hasPermission(user, P.DOCUMENTS_MANAGE)
