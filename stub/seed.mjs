// Loads the frontend's existing synthetic mock data (src/mock/*.js) through Vite's SSR loader so
// the stub and the mock mode always start from the same cast of users, cases and evidence.
// The stub converts these into API_CONTRACT_V1 shapes itself (see app.mjs).
import { createServer } from 'vite'

export const loadSeed = async (root) => {
  const vite = await createServer({
    root,
    configFile: false,
    logLevel: 'error',
    server: { middlewareMode: true },
    appType: 'custom',
  })
  try {
    const load = (name) => vite.ssrLoadModule(`/src/mock/${name}.js`)
    const [users, cases, evidence, custody, reports] = await Promise.all(
      ['users', 'cases', 'evidence', 'custody', 'reports'].map(load),
    )
    return structuredClone({
      users: users.seedUsers,
      cases: cases.cases,
      evidence: evidence.evidence,
      custody: custody.custodyEvents,
      reports: reports.reports,
    })
  } finally {
    await vite.close()
  }
}
