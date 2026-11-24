// Facade for verification. The implementation is chosen once by ./mode.js (default: mock).
// Exported names and return shapes are identical in both modes so pages never change.
// HTTP paths follow docs/API_CONTRACT_V1.md and have NOT been tested against a live backend.
import { useMock } from './mode'
import * as mock from './mock/verification'
import { http } from './http'
import * as A from './adapters'

import { computeFileSha256 } from '../utils/hash'

const real = {
  getVerification: async (evidenceId) => {
    const list = A.items(await http.get(`/evidence/${evidenceId}/verifications`, { page_size: 1 }))
    if (list.length > 0) return A.toVerification(list[0])
    // No verification yet: present the persisted hash with no result claimed.
    const ev = A.toEvidence(await http.get(`/evidence/${evidenceId}`))
    return {
      id: null, evidence_id: evidenceId, source: 'NONE', result: null, match: false,
      recorded_sha256: ev.sha256, current_sha256: null, ledger_sha256: ev.ledger?.recorded_sha256 ?? null,
      placeholder_reference: ev.transaction_id, verified_timestamp: null, checked_at: null,
      checked_by: null, checked_filename: null, notes: null,
    }
  },
  // With a file: purely client-side comparison against the persisted hash (never POSTed, never a
  // backend/blockchain verification). Without a file: ask the backend to re-hash the stored object.
  runVerification: async (evidenceId, file = null) => {
    if (file) {
      const ev = A.toEvidence(await http.get(`/evidence/${evidenceId}`))
      const calculated = await computeFileSha256(file)
      return {
        id: null, evidence_id: evidenceId, source: 'LOCAL_CALCULATED', result: calculated === ev.sha256 ? 'MATCH' : 'MISMATCH',
        match: calculated === ev.sha256, recorded_sha256: ev.sha256, current_sha256: calculated,
        ledger_sha256: ev.ledger?.recorded_sha256 ?? null, placeholder_reference: ev.transaction_id,
        verified_timestamp: null, checked_at: new Date().toISOString(), checked_by: null,
        checked_filename: file.name, notes: null,
      }
    }
    return A.toVerification(await http.post(`/evidence/${evidenceId}/verifications`, {}))
  },
}

const impl = useMock ? mock : real

export const getVerification = impl.getVerification
export const runVerification = impl.runVerification
