// DEMO-ONLY credential check for the local mock environment.
//
// This is NOT secure authentication. The salted SHA-256 digests below exist only so the mock user
// records do not carry plaintext passwords; anyone reading this source can still guess them, and a
// fast unsalted-per-user digest is not a password hash. Delete this file when the FastAPI
// authentication endpoint replaces src/api/auth.js.
const PREFIX = 'trace-demo-only'

const toHex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')

const digest = async (userId, password) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure crypto is unavailable in this browser context (use localhost or HTTPS).')
  }
  const bytes = new TextEncoder().encode(`${PREFIX}:${userId}:${password}`)
  return toHex(await globalThis.crypto.subtle.digest('SHA-256', bytes))
}

// userId -> digest. Created users are added at runtime (in memory only).
const digests = new Map([
  ['USR-001', '9c4188c566e4c98c76ba1295c984b19f0b12c68cddb7669bff2fd70e2ea23574'],
  ['USR-002', 'a4ff28487c9110c3dbfe9c5f2fb2645e6b8564394b379253f7f9261958dae5c6'],
  ['USR-003', 'be10cee957103f190e89b5a871061e5f4483fe4eb2d6137818baa93b80370995'],
  ['USR-004', '8b213d53f2d5efab29c18f3c4b0df0854b614de8ea3e477210a295406b14d583'],
])

export const checkDemoPassword = async (userId, password) => {
  const candidate = await digest(userId ?? 'unknown', password)
  const expected = digests.get(userId)
  return Boolean(expected) && expected === candidate
}

export const registerDemoPassword = async (userId, password) => {
  digests.set(userId, await digest(userId, password))
}

export const DEMO_LOGIN_HINTS = [
  { role: 'ADMIN', email: 'admin@trace.local', password: 'Admin@123' },
  { role: 'OFFICER', email: 'officer@trace.local', password: 'Officer@123' },
  { role: 'CLERK', email: 'clerk@trace.local', password: 'Clerk@123' },
  { role: 'READER', email: 'reviewer@trace.local', password: 'Reviewer@123' },
]
