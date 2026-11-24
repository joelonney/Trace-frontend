import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

const LABELS = {
  dashboard: 'Dashboard',
  cases: 'Cases',
  evidence: 'Evidence',
  custody: 'Chain of Custody',
  verification: 'Verification',
  reports: 'Reports',
  users: 'User Management',
  audit: 'Audit Log',
}

export const Breadcrumbs = () => {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`
    const label = LABELS[segment] ?? decodeURIComponent(segment)
    const isLast = index === segments.length - 1
    return { href, label, isLast }
  })

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {crumb.isLast ? (
            <span className="font-medium text-slate-700">{crumb.label}</span>
          ) : (
            <Link to={crumb.href} className="hover:text-slate-700">
              {crumb.label}
            </Link>
          )}
          {!crumb.isLast && <ChevronRight size={12} />}
        </span>
      ))}
    </nav>
  )
}
