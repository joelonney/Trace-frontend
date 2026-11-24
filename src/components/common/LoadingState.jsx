import { Loader2 } from 'lucide-react'

export const LoadingState = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
    <Loader2 size={16} className="animate-spin" />
    {label}
  </div>
)
