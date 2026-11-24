import { ApiError } from '../client'
import { mockDelay } from './delay'
import { db, recordAudit, newId } from '../../mock/db'
import { checkDemoPassword, registerDemoPassword } from '../../mock/demoAuth'
import { USER_STATUS, ROLES } from '../../mock/users'
import { P } from '../../utils/permissions'
import { authorize } from './guard'
import { setSessionUser, requireUser } from './session'

// MOCK authentication only. Credentials are checked against demo-only digests (mock/demoAuth.js)
// and the "session" is just the user id kept in sessionStorage. Replace this module with calls to
// Mathew's FastAPI authentication endpoint; keep the exported function names.

const SESSION_KEY = 'trace.mockSessionUserId'
const normalizeEmail = (v) => v.trim().toLowerCase()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const publicUser = (u) => ({ ...u })

export const login = async (identifier, password) => {
  const email = normalizeEmail(identifier ?? '')
  if (!email || !password) throw new ApiError('Enter both your email and password.', 400)

  const user = db.users.find((u) => normalizeEmail(u.email) === email)
  const ok = user ? await checkDemoPassword(user.id, password) : false
  await mockDelay(null, 400)
  // Same message for unknown user and wrong password so the form doesn't reveal which accounts exist.
  if (!user || !ok) throw new ApiError('Invalid email or password.', 401)
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError('This account has been deactivated. Contact an administrator.', 403)
  }

  setSessionUser(user)
  try {
    sessionStorage.setItem(SESSION_KEY, user.id)
  } catch {
    // sessionStorage unavailable — session lasts until reload.
  }
  recordAudit(user, 'LOGIN', user.id, 'Mock sign-in')
  return publicUser(user)
}

// Rebuilds the session after a page refresh. The user store is in memory, so a stored id is only
// valid if that user exists in the (re-seeded) data; users created at runtime must sign in again
// and will no longer exist after a reload.
export const restoreSession = () => {
  try {
    const id = sessionStorage.getItem(SESSION_KEY)
    const user = id && db.users.find((u) => u.id === id && u.status === USER_STATUS.ACTIVE)
    if (user) {
      setSessionUser(user)
      return publicUser(user)
    }
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // fall through to signed-out
  }
  setSessionUser(null)
  return null
}

export const logout = async () => {
  setSessionUser(null)
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
  return mockDelay(true, 100)
}

// ---- User management (ADMIN only) ----

export const getUsers = async () => {
  authorize(P.USERS_MANAGE)
  return mockDelay(db.users.map(publicUser), 150)
}

const validateProfile = ({ name, email, role, organization }, ignoreId) => {
  if (!name?.trim() || !email?.trim() || !organization?.trim() || !role) {
    throw new ApiError('Name, email, role and organization are required.', 400)
  }
  if (!EMAIL_RE.test(email.trim())) throw new ApiError('Enter a valid email address.', 400)
  if (!Object.values(ROLES).includes(role)) throw new ApiError('Select a valid role.', 400)
  const dup = db.users.find((u) => normalizeEmail(u.email) === normalizeEmail(email) && u.id !== ignoreId)
  if (dup) throw new ApiError('A user with this email already exists.', 409)
}

// Creates an in-memory demo user. The admin must supply a temporary password; none is invented.
// The account works only until the page is reloaded.
export const createUser = async ({ name, email, role, organization, temporaryPassword }) => {
  const actor = authorize(P.USERS_MANAGE)
  validateProfile({ name, email, role, organization })
  if (!temporaryPassword || temporaryPassword.length < 8) {
    throw new ApiError('Set a temporary demo password of at least 8 characters.', 400)
  }
  const user = {
    id: newId('USR', 3),
    name: name.trim(),
    email: normalizeEmail(email),
    role,
    organization: organization.trim(),
    status: USER_STATUS.ACTIVE,
  }
  await registerDemoPassword(user.id, temporaryPassword)
  db.users.push(user)
  recordAudit(actor, 'USER_CREATED', user.id, `${user.email} as ${user.role} (mock)`)
  return mockDelay(publicUser(user), 300)
}

export const updateUser = async (id, changes) => {
  const actor = authorize(P.USERS_MANAGE)
  const user = db.users.find((u) => u.id === id)
  if (!user) throw new ApiError('User not found', 404)
  const next = { ...user, ...changes }
  validateProfile(next, id)
  if (id === actor.id && next.role !== ROLES.ADMIN) {
    throw new ApiError('You cannot remove your own administrator role.', 400)
  }
  if (user.role === ROLES.ADMIN && next.role !== ROLES.ADMIN && user.status === USER_STATUS.ACTIVE) {
    const others = db.users.filter(
      (u) => u.id !== id && u.role === ROLES.ADMIN && u.status === USER_STATUS.ACTIVE,
    )
    if (others.length === 0) throw new ApiError('At least one active administrator is required.', 400)
  }
  Object.assign(user, {
    name: next.name.trim(),
    email: normalizeEmail(next.email),
    role: next.role,
    organization: next.organization.trim(),
  })
  recordAudit(actor, 'USER_UPDATED', id, `${user.email} as ${user.role} (mock)`)
  return mockDelay(publicUser(user), 250)
}

export const setUserStatus = async (id, status) => {
  const actor = authorize(P.USERS_MANAGE)
  const user = db.users.find((u) => u.id === id)
  if (!user) throw new ApiError('User not found', 404)
  if (id === actor.id && status !== USER_STATUS.ACTIVE) {
    throw new ApiError('You cannot deactivate your own account — it would lock you out.', 400)
  }
  if (status !== USER_STATUS.ACTIVE && user.role === ROLES.ADMIN) {
    const others = db.users.filter(
      (u) => u.id !== id && u.role === ROLES.ADMIN && u.status === USER_STATUS.ACTIVE,
    )
    if (others.length === 0) throw new ApiError('At least one active administrator is required.', 400)
  }
  user.status = status
  recordAudit(
    actor,
    status === USER_STATUS.ACTIVE ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    id,
    user.email,
  )
  return mockDelay(publicUser(user), 200)
}

export const getAuditLog = async () => {
  authorize(P.AUDIT_VIEW)
  return mockDelay([...db.auditLog], 200)
}

// Name-only directory so any signed-in user can see who a custodian/uploader is without being
// able to list accounts, emails or statuses (those stay ADMIN-only via getUsers).
export const getUserDirectory = async () => {
  requireUser()
  return mockDelay(Object.fromEntries(db.users.map((u) => [u.id, u.name])), 100)
}
