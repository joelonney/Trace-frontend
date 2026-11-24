import { useCallback, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { AuthContext } from './authContextValue'

export const AuthProvider = ({ children }) => {
  // Mock session restore: sessionStorage holds only the signed-in user's id (cleared when the tab
  // closes). It is not a token and proves nothing — see README "Mock authentication limitations".
  const [user, setUser] = useState(() => authApi.restoreSession())
  const [isLoading, setIsLoading] = useState(false)

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
    await authApi.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, logout }),
    [user, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
