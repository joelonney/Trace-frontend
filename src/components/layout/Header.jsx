import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABELS } from '../../constants/roles'
import { Breadcrumbs } from './Breadcrumbs'

export const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    // Leave the protected area first, so ProtectedRoute doesn't see a signed-out user and attach
    // the current page as "return to" state. A deliberate logout must not send the next person
    // who signs in (possibly a different role) to this page.
    navigate('/login', { replace: true, state: null })
    await logout()
  }

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-slate-200 bg-white">
      <Breadcrumbs />
      <div className="flex items-center gap-4">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-slate-800">{user?.name}</p>
          <p className="text-xs text-slate-500">
            {ROLE_LABELS[user?.role]} · {user?.organization}
          </p>
        </div>
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </header>
  )
}
