import { Link } from 'react-router-dom'
import { EmptyState } from '../common/EmptyState'

export const RecentActivityList = ({ items, emptyMessage = 'No recent activity.' }) => {
  if (!items || items.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id}>
          <Link to={item.to} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-1 px-1 rounded">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
              <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
            </div>
            <span className="shrink-0 text-xs text-slate-400 whitespace-nowrap">{item.meta}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
