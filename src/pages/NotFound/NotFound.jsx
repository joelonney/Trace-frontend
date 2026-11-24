import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-center px-4">
    <ShieldAlert size={40} className="text-slate-400" />
    <h1 className="text-lg font-semibold text-slate-900">Page not found</h1>
    <p className="text-sm text-slate-500 max-w-sm">
      The page you're looking for doesn't exist or you don't have access to it.
    </p>
    <Link to="/dashboard" className="text-sm font-medium text-ink-900 hover:underline">
      Back to Dashboard
    </Link>
  </div>
)
