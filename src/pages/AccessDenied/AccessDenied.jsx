import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABELS } from '../../constants/roles'

export const AccessDenied = ({ message }) => {
  const { user } = useAuth()
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <ShieldOff size={40} className="text-slate-400" />
      <h1 className="text-lg font-semibold text-slate-900">Access denied</h1>
      <p className="text-sm text-slate-500 max-w-md">
        {message ??
          `Your role (${ROLE_LABELS[user?.role] ?? 'unknown'}) is not permitted to view this page or record.`}
      </p>
      <Link to="/dashboard" className="text-sm font-medium text-ink-900 hover:underline">
        Back to Dashboard
      </Link>
    </div>
  )
}
