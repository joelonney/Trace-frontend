// Mock "session" visible to the API layer. In the real system this is a bearer token that the
// FastAPI backend validates; here it is just the current user object, set by api/auth.js.
import { ApiError } from '../client'

let currentUser = null

export const setSessionUser = (user) => {
  currentUser = user
}

export const requireUser = () => {
  if (!currentUser) throw new ApiError('Authentication required', 401)
  return currentUser
}
