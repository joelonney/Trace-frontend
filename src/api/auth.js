// Facade for auth. The implementation is chosen once by ./mode.js (default: mock).
// Exported names and return shapes are identical in both modes so pages never change.
// HTTP paths follow docs/API_CONTRACT_V1.md and have NOT been tested against a live backend.
import { useMock } from './mode'
import * as mock from './mock/auth'
import { http } from './http'
import * as A from './adapters'

const real = {
  login: async (identifier, password) => {
    const data = await http.post('/auth/login', { email: String(identifier ?? '').trim().toLowerCase(), password })
    http.setAccessToken(data.access_token)
    return { ...A.toUser(data.user), permissions: data.permissions ?? [] }
  },
  // Synchronous in the mock; the HTTP flow (refresh cookie → /auth/me) is asynchronous and is
  // wired into AuthContext in step I-3. Until then an http-mode page load starts signed out.
  restoreSession: () => null,
  restoreSessionAsync: async () => {
    const ok = await http.refresh()
    if (!ok) return null
    const me = await http.get('/auth/me')
    return { ...A.toUser(me.user), permissions: me.permissions ?? [] }
  },
  logout: async () => {
    try {
      await http.post('/auth/logout')
    } finally {
      http.setAccessToken(null)
    }
    return true
  },
  getUsers: async () => A.items(await http.get('/users', { page_size: 100 })).map(A.toUser),
  createUser: async ({ name, email, role, organization, temporaryPassword }) =>
    A.toUser(await http.post('/users', { name, email, role, organization, temporary_password: temporaryPassword })),
  updateUser: async (id, changes) => A.toUser(await http.patch(`/users/${id}`, changes)),
  setUserStatus: async (id, status) => A.toUser(await http.post(`/users/${id}/status`, { status })),
  getUserDirectory: async () =>
    Object.fromEntries(A.items(await http.get('/users/directory')).map((u) => [u.id, u.name])),
  getAuditLog: async () => A.items(await http.get('/audit', { page_size: 100 })).map(A.toAuditEvent),
}

const impl = useMock ? mock : real

export const login = impl.login
export const restoreSession = impl.restoreSession
export const restoreSessionAsync = impl.restoreSessionAsync
export const logout = impl.logout
export const getUsers = impl.getUsers
export const createUser = impl.createUser
export const updateUser = impl.updateUser
export const setUserStatus = impl.setUserStatus
export const getUserDirectory = impl.getUserDirectory
export const getAuditLog = impl.getAuditLog
