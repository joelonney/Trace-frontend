// Synthetic user records for TRACE. All names and organizations are fictional demonstration
// identities. This is the single source of truth for mock users — nothing else hardcodes them.
//
// NOTE: no passwords live here. Demo-only credential checking is isolated in ./demoAuth.js so it
// can be deleted when Mathew's FastAPI authentication replaces it.
import { ROLES, USER_STATUS } from '../constants/roles'

export { ROLES, ROLE_LABELS, USER_STATUS, ORGANIZATIONS } from '../constants/roles'

export const seedUsers = [
  {
    id: 'USR-001',
    name: 'Alex Morgan',
    email: 'admin@trace.local',
    role: ROLES.ADMIN,
    organization: 'TRACE System Administration',
    status: USER_STATUS.ACTIVE,
  },
  {
    id: 'USR-002',
    name: 'Sarah Thomas',
    email: 'officer@trace.local',
    role: ROLES.OFFICER,
    organization: 'Cybercrime Investigation Unit',
    status: USER_STATUS.ACTIVE,
  },
  {
    id: 'USR-003',
    name: 'Daniel Mathew',
    email: 'clerk@trace.local',
    role: ROLES.CLERK,
    organization: 'Digital Forensic Laboratory',
    status: USER_STATUS.ACTIVE,
  },
  {
    id: 'USR-004',
    name: 'Priya Nair',
    email: 'reviewer@trace.local',
    role: ROLES.READER,
    organization: 'Judicial Review Division',
    status: USER_STATUS.ACTIVE,
  },
]
