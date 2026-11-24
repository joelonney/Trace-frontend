import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Fingerprint,
  Link2,
  ShieldCheck,
  FileBarChart2,
  ShieldHalf,
  Users,
  ScrollText,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { hasPermission, P } from '../../utils/permissions'
import { ROLE_LABELS } from '../../constants/roles'
import { useMock, API_MODE } from '../../api/mode'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, permission: P.DASHBOARD_VIEW },
  { label: 'Cases', to: '/cases', icon: FolderKanban, permission: P.CASES_VIEW },
  { label: 'Evidence', to: '/evidence', icon: Fingerprint, permission: P.EVIDENCE_VIEW },
  { label: 'Chain of Custody', to: '/custody', icon: Link2, permission: P.CUSTODY_VIEW },
  { label: 'Verification', to: '/verification', icon: ShieldCheck, permission: P.VERIFICATION_VIEW },
  { label: 'Reports', to: '/reports', icon: FileBarChart2, permission: P.REPORTS_VIEW },
  { label: 'User Management', to: '/users', icon: Users, permission: P.USERS_MANAGE },
  { label: 'Audit Log', to: '/audit', icon: ScrollText, permission: P.AUDIT_VIEW },
]

export const Sidebar = () => {
  const { user } = useAuth()

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-100">
        <ShieldHalf size={22} className="text-ink-900" />
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-ink-900">TRACE</p>
          <p className="text-[11px] text-slate-500">{ROLE_LABELS[user?.role]}</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.filter((item) => hasPermission(user, item.permission)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <item.icon size={17} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-100 text-[11px] text-slate-500">
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${useMock ? 'bg-status-warning' : 'bg-status-success'}`}
        />
        {useMock ? 'Mock data mode — no live backend' : `API mode: ${API_MODE} — backend integration in progress`}
      </div>
    </aside>
  )
}
