// Shared API client scaffolding.
//
// Which implementation a feature module uses is decided once in ./mode.js:
//   mock → src/api/mock/*.js (in-memory, default)
//   http → real requests through ./http.js to BASE_URL (contract: docs/API_CONTRACT_V1.md)
// Components never import from src/mock/*.js for data, so switching modes needs no UI changes.

export const BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export class ApiError extends Error {
  constructor(message, status, code = null, details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}
