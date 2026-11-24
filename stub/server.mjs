// Starts the TRACE contract stub.   npm run stub
//
//   STUB_PORT           default 8000
//   STUB_TRANSFER_MODE  immediate (default, matches today's UI) | two-step (contract decision D5)
//   STUB_LEDGER_DELAY_MS  how long a mock "ledger write" stays PENDING (default 1500)
//   STUB_MIN_PASSWORD   minimum temporary-password length (default 12, per contract D4)
//   STUB_CORS_ORIGINS   extra allowed browser origins, comma separated
//
// Binds to 127.0.0.1 only. Data is in memory and resets on restart.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSeed } from './seed.mjs'
import { createStub } from './app.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.STUB_PORT ?? 8000)
const transferMode = process.env.STUB_TRANSFER_MODE ?? 'immediate'
if (!['immediate', 'two-step'].includes(transferMode)) {
  console.error(`STUB_TRANSFER_MODE must be "immediate" or "two-step" (got "${transferMode}")`)
  process.exit(1)
}

const seed = await loadSeed(root)
const stub = createStub({
  seed,
  transferMode,
  ledgerDelayMs: Number(process.env.STUB_LEDGER_DELAY_MS ?? 1500),
  minPassword: Number(process.env.STUB_MIN_PASSWORD ?? 12),
  corsOrigins: (process.env.STUB_CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
})

stub.server.listen(port, '127.0.0.1', () => {
  console.log(`TRACE contract stub listening on http://127.0.0.1:${port}/api/v1  (transfer mode: ${transferMode})`)
  console.log('Frontend:  VITE_API_MODE=http VITE_API_BASE_URL=http://localhost:' + port + '/api/v1 npm run dev')
  console.log('Demo logins: admin@trace.local / Admin@123 · officer@trace.local / Officer@123 · clerk@trace.local / Clerk@123 · reviewer@trace.local / Reviewer@123')
  console.log('In-memory only, resets on restart. Not a real backend.')
})
const stop = async () => { await stub.close(); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
