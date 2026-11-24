import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { useMock } from '../api/mode'
import { AUTH_EXPIRED_EVENT } from '../api/http'
import { AuthContext } from './authContextValue'

// In API mode the session comes back from the refresh cookie (POST /auth/refresh, then GET
// /auth/me). React StrictMode runs effects twice in development, and some backends rotate refresh
// tokens, so the in-flight restore is shared rather than started twice.
let restoreInFlight = null
const restoreOnce = () => {
  restoreInFlight ??= authApi.restoreSessionAsync().finally(() => {
    restoreInFlight = null
  })
  return restoreInFlight
}

export const AuthProvider = ({ children }) => {
  // Mock session restore: sessionStorage holds only the signed-in user's id (cleared when the tab
  // closes). It is not a token and proves nothing — see README "Mock authentication limitations".
  const [user, setUser] = useState(() => authApi.restoreSession())
  const [isLoading, setIsLoading] = useState(false)
  // True until the cookie-based restore has answered, so a reload doesn't flash the login page.
  const [isRestoring, setIsRestoring] = useState(!useMock)

  useEffect(() => {
    if (useMock) return undefined
    let cancelled = false
    restoreOnce()
      .then((restored) => {
        if (!cancelled && restored) setUser(restored)
      })
      .catch(() => {}) // unreachable backend or no session → stay signed out
      .finally(() => {
        if (!cancelled) setIsRestoring(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The HTTP client fires this when a token can't be refreshed any more.
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  const login = useCallback(async (email, password) => {
    setIsLoading(true)
    try {
      const loggedInUser = await authApi.login(email, password)
      setUser(loggedInUser)
      return loggedInUser
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, isRestoring, login, logout }),
    [user, isLoading, isRestoring, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
