import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { hasPermission } from '../utils/permissions'
import { AccessDenied } from '../pages/AccessDenied/AccessDenied'
import { LoadingState } from '../components/common/LoadingState'

// Requires a signed-in session. With `permission`, also requires that permission and shows
// an access-denied page otherwise. UI-level gating only — not a security boundary.
export const ProtectedRoute = ({ permission }) => {
  const { isAuthenticated, isRestoring, user } = useAuth()
  const location = useLocation()

  // Don't bounce to /login while the session is still being restored after a page reload.
  if (isRestoring) {
    return <LoadingState label="Restoring session…" />
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (permission && !hasPermission(user, permission)) {
    return <AccessDenied />
  }
  return <Outlet />
}
