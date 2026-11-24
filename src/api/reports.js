// Facade for reports. The implementation is chosen once by ./mode.js (default: mock).
// Exported names and return shapes are identical in both modes so pages never change.
// HTTP paths follow docs/API_CONTRACT_V1.md and have NOT been tested against a live backend.
import { useMock } from './mode'
import * as mock from './mock/reports'
import { http } from './http'
import * as A from './adapters'

const real = {
  getReports: async () => A.items(await http.get('/reports', { page_size: 100 })).map(A.toReport),
  getReportsByCaseId: async (caseId) =>
    A.items(await http.get(`/cases/${caseId}/reports`, { page_size: 100 })).map(A.toReport),
  createDraftReport: async ({ caseId, title, summary }) =>
    A.toReport(await http.post(`/cases/${caseId}/reports`, { title, summary })),
}

const impl = useMock ? mock : real

export const getReports = impl.getReports
export const getReportsByCaseId = impl.getReportsByCaseId
export const createDraftReport = impl.createDraftReport
