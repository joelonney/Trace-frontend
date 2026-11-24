import { ApiError } from '../client'
import { hasPermission } from '../../utils/permissions'
import { requireUser } from './session'

// Mock stand-in for server-side authorization. Re-checks the same policy as the UI so the demo is
// internally consistent. It is NOT real security — the browser can bypass all of this.
export const authorize = (permission) => {
  const user = requireUser()
  if (!hasPermission(user, permission)) {
    throw new ApiError('You do not have permission to perform this action', 403)
  }
  return user
}
