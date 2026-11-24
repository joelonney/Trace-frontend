// Facade for ai. The implementation is chosen once by ./mode.js (default: mock).
// Exported names and return shapes are identical in both modes so pages never change.
// HTTP paths follow docs/API_CONTRACT_V1.md and have NOT been tested against a live backend.
import { useMock } from './mode'
import * as mock from './mock/ai'
import { http } from './http'
import * as A from './adapters'

const real = {
  getAiAnalysis: async (evidenceId) => A.toAnalysis(await http.get(`/evidence/${evidenceId}/analysis`)),
}

const impl = useMock ? mock : real

export const getAiAnalysis = impl.getAiAnalysis
