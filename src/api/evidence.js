// Facade for evidence. The implementation is chosen once by ./mode.js (default: mock).
// Exported names and return shapes are identical in both modes so pages never change.
// HTTP paths follow docs/API_CONTRACT_V1.md and have NOT been tested against a live backend.
import { useMock } from './mode'
import * as mock from './mock/evidence'
import { http } from './http'
import * as A from './adapters'

import { computeFileSha256 } from '../utils/hash'

const real = {
  getEvidence: async () => A.items(await http.get('/evidence', { page_size: 100 })).map(A.toEvidence),
  getEvidenceById: async (id) => A.toEvidence(await http.get(`/evidence/${id}`)),
  getEvidenceByCaseId: async (caseId) =>
    A.items(await http.get(`/cases/${caseId}/evidence`, { page_size: 100 })).map(A.toEvidence),
  // The backend hash is authoritative; the browser hash is sent only as an advisory cross-check.
  uploadEvidence: async ({ caseId, file, fileType, description }) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('evidence_type', A.evidenceLabelToType(fileType))
    fd.append('description', description ?? '')
    try {
      fd.append('client_sha256', await computeFileSha256(file))
    } catch {
      // too large or crypto unavailable — server hash still applies
    }
    return A.toEvidence(await http.upload(`/cases/${caseId}/evidence`, fd))
  },
}

const impl = useMock ? mock : real

export { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, EVIDENCE_TYPES, validateEvidenceFile } from '../constants/evidence'
export const getEvidence = impl.getEvidence
export const getEvidenceById = impl.getEvidenceById
export const getEvidenceByCaseId = impl.getEvidenceByCaseId
export const uploadEvidence = impl.uploadEvidence
