import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { hasPermission } from '../utils/permissions'
import { AccessDenied } from '../pages/AccessDenied/AccessDenied'

// Requires a signed-in mock session. With `permission`, also requires that permission and shows
// an access-denied page otherwise. UI-level gating only — not a security boundary.
export const ProtectedRoute = ({ permission }) => {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (permission && !hasPermission(user, permission)) {
    return <AccessDenied />
  }
  return <Outlet />
}
