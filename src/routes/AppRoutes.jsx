import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '../components/layout/AppLayout'
import { P } from '../utils/permissions'

import { Login } from '../pages/Login/Login'
import { Dashboard } from '../pages/Dashboard/Dashboard'
import { CasesList } from '../pages/Cases/CasesList'
import { CaseDetails } from '../pages/Cases/CaseDetails'
import { EvidenceList } from '../pages/Evidence/EvidenceList'
import { EvidenceDetails } from '../pages/Evidence/EvidenceDetails'
import { CustodyIndex } from '../pages/Custody/CustodyIndex'
import { CustodyView } from '../pages/Custody/CustodyView'
import { VerificationIndex } from '../pages/Verification/VerificationIndex'
import { VerificationView } from '../pages/Verification/VerificationView'
import { Reports } from '../pages/Reports/Reports'
import { UserManagement } from '../pages/Users/UserManagement'
import { AuditLog } from '../pages/Audit/AuditLog'
import { NotFound } from '../pages/NotFound/NotFound'

const PAGE_ROUTES = [
  { path: '/dashboard', permission: P.DASHBOARD_VIEW, Page: Dashboard },
  { path: '/cases', permission: P.CASES_VIEW, Page: CasesList },
  { path: '/cases/:caseId', permission: P.CASES_VIEW, Page: CaseDetails },
  { path: '/evidence', permission: P.EVIDENCE_VIEW, Page: EvidenceList },
  { path: '/evidence/:evidenceId', permission: P.EVIDENCE_VIEW, Page: EvidenceDetails },
  { path: '/custody', permission: P.CUSTODY_VIEW, Page: CustodyIndex },
  { path: '/custody/:evidenceId', permission: P.CUSTODY_VIEW, Page: CustodyView },
  { path: '/verification', permission: P.VERIFICATION_VIEW, Page: VerificationIndex },
  { path: '/verification/:evidenceId', permission: P.VERIFICATION_VIEW, Page: VerificationView },
  { path: '/reports', permission: P.REPORTS_VIEW, Page: Reports },
  { path: '/users', permission: P.USERS_MANAGE, Page: UserManagement },
  { path: '/audit', permission: P.AUDIT_VIEW, Page: AuditLog },
]

export const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<Navigate to="/dashboard" replace />} />

    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        {PAGE_ROUTES.map(({ path, permission, Page }) => (
          <Route key={path} element={<ProtectedRoute permission={permission} />}>
            <Route path={path} element={<Page />} />
          </Route>
        ))}
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
)
