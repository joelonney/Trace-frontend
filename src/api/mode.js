// Selects the API implementation once, at import time.
//   VITE_API_MODE=mock  (default when unset) → in-memory mock implementations in src/api/mock/
//   VITE_API_MODE=http                       → real HTTP calls to VITE_API_BASE_URL
// Mixing modes within a session is not supported; the choice is fixed for the page lifetime.
const raw = (import.meta.env?.VITE_API_MODE ?? 'mock').toString().trim().toLowerCase()

if (raw !== 'mock' && raw !== 'http') {
  // Fail loudly rather than silently falling back to mock with a typo in .env.
  throw new Error(`VITE_API_MODE must be "mock" or "http" (got "${raw}")`)
}

export const API_MODE = raw
export const useMock = raw === 'mock'
