import { Inbox } from 'lucide-react'

export const EmptyState = ({ message = 'Nothing to show yet.', icon: Icon = Inbox }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-500">
    <Icon size={28} strokeWidth={1.5} />
    <p className="text-sm">{message}</p>
  </div>
)
