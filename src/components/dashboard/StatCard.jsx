import { Link } from 'react-router-dom'

// `to` makes the whole tile a link (e.g. the pending-transfers tile → the Transfers inbox).
export const StatCard = ({ label, value, icon: Icon, tone = 'default', to }) => {
  const toneClasses = {
    default: 'bg-accent-50 text-accent-600',
    warning: 'bg-status-warningBg text-status-warning',
  }[tone]

  const card = (
    <div
      className={`bg-white border border-slate-200 rounded-lg shadow-card px-5 py-4 flex items-center gap-4 transition-shadow hover:shadow-md ${
        to ? 'cursor-pointer' : ''
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClasses}`}>
        <Icon size={21} />
      </span>
      <div>
        <p className="text-2xl font-semibold text-slate-900 leading-tight tabular-nums">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )

  return to ? <Link to={to}>{card}</Link> : card
}
