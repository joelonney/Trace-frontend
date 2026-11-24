// Shared role/user enums. Safe to import from UI code (no mock data here).
export const ROLES = {
  ADMIN: 'ADMIN',
  OFFICER: 'OFFICER',
  CLERK: 'CLERK',
  READER: 'READER',
}

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  OFFICER: 'Investigating Officer',
  CLERK: 'Forensic Clerk',
  READER: 'Judicial Reader',
}

export const USER_STATUS = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' }

export const ORGANIZATIONS = [
  'TRACE System Administration',
  'Cybercrime Investigation Unit',
  'Digital Forensic Laboratory',
  'Judicial Review Division',
]
