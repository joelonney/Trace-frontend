// Centralized role → permission policy for TRACE (frontend).
//
// IMPORTANT: this controls what the UI shows. It is NOT a security boundary. Anyone can bypass
// frontend checks with browser dev tools. Real authorization must be enforced by the FastAPI
// backend and the blockchain/chaincode policies. The mock API layer (src/api) re-checks these same
// rules only so the demo behaves consistently.
import { ROLES } from '../constants/roles'

export const P = {
  DASHBOARD_VIEW: 'dashboard.view',
  CASES_VIEW: 'cases.view', // may open the cases area (scope decided by CASES_VIEW_ALL / assignment)
  CASES_VIEW_ALL: 'cases.view_all',
  CASES_CREATE: 'cases.create',
  CASES_UPDATE: 'cases.update',
  DOCUMENTS_MANAGE: 'documents.manage', // register / organize case documentation
  EVIDENCE_VIEW: 'evidence.view',
  EVIDENCE_VIEW_ALL: 'evidence.view_all',
  EVIDENCE_UPLOAD: 'evidence.upload',
  CUSTODY_VIEW: 'custody.view',
  CUSTODY_TRANSFER: 'custody.transfer',
  CUSTODY_HOLD: 'custody.hold', // may be named as current custodian of an evidence item
  VERIFICATION_VIEW: 'verification.view',
  VERIFICATION_RUN: 'verification.run',
  REPORTS_VIEW: 'reports.view',
  REPORTS_CREATE: 'reports.create',
  AI_VIEW: 'ai.view',
  USERS_MANAGE: 'users.manage',
  AUDIT_VIEW: 'audit.view',
}

// Note what is deliberately absent: no role can edit an evidence file or rewrite a recorded
// integrity hash, and no role can delete evidence. There is no permission for those actions.
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    P.DASHBOARD_VIEW,
    P.CASES_VIEW,
    P.CASES_VIEW_ALL,
    P.EVIDENCE_VIEW,
    P.EVIDENCE_VIEW_ALL,
    P.CUSTODY_VIEW,
    P.CUSTODY_HOLD,
    P.VERIFICATION_VIEW,
    P.REPORTS_VIEW,
    P.USERS_MANAGE,
    P.AUDIT_VIEW,
  ],
  [ROLES.OFFICER]: [
    P.DASHBOARD_VIEW,
    P.CASES_VIEW,
    P.CASES_CREATE,
    P.CASES_UPDATE,
    P.EVIDENCE_VIEW,
    P.EVIDENCE_UPLOAD,
    P.CUSTODY_VIEW,
    P.CUSTODY_TRANSFER,
    P.CUSTODY_HOLD,
    P.VERIFICATION_VIEW,
    P.VERIFICATION_RUN,
    P.REPORTS_VIEW,
    P.REPORTS_CREATE,
    P.AI_VIEW,
  ],
  [ROLES.CLERK]: [
    P.DASHBOARD_VIEW,
    P.CASES_VIEW,
    P.DOCUMENTS_MANAGE,
    P.EVIDENCE_VIEW,
    P.CUSTODY_VIEW,
    P.CUSTODY_HOLD,
    P.VERIFICATION_VIEW,
    P.REPORTS_VIEW,
    P.REPORTS_CREATE,
  ],
  [ROLES.READER]: [
    P.DASHBOARD_VIEW,
    P.CASES_VIEW,
    P.EVIDENCE_VIEW,
    P.CUSTODY_VIEW,
    P.VERIFICATION_VIEW,
    P.REPORTS_VIEW,
  ],
}

export const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'System and user administration. Oversight of all cases, evidence metadata, custody and audit activity — but cannot alter evidence or recorded hashes.',
  [ROLES.OFFICER]: 'Investigation and evidence handling on assigned cases: create cases, upload evidence, transfer custody, run verification and draft reports.',
  [ROLES.CLERK]: 'Case documentation and administrative support on assigned cases. Read access to evidence metadata, custody and verification; prepares reports.',
  [ROLES.READER]: 'Read-only judicial or authorized review of assigned cases, evidence metadata, hashes, verification results, custody history and reports.',
}

export const hasPermission = (user, permission) =>
  Boolean(user && ROLE_PERMISSIONS[user.role]?.includes(permission))

export const hasAnyPermission = (user, permissions) => permissions.some((p) => hasPermission(user, p))

export const canViewCase = (user, caseItem) => {
  if (!user || !caseItem || !hasPermission(user, P.CASES_VIEW)) return false
  if (hasPermission(user, P.CASES_VIEW_ALL)) return true
  return Boolean(caseItem.assigned_user_ids?.includes(user.id))
}

// Evidence visibility follows the parent case. Pass the evidence item's case record.
export const canAccessEvidence = (user, evidenceItem, parentCase) => {
  if (!user || !evidenceItem || !hasPermission(user, P.EVIDENCE_VIEW)) return false
  if (hasPermission(user, P.EVIDENCE_VIEW_ALL)) return true
  return canViewCase(user, parentCase)
}

export const canUpdateCase = (user, caseItem) =>
  hasPermission(user, P.CASES_UPDATE) && canViewCase(user, caseItem)

export const canUploadToCase = (user, caseItem) =>
  hasPermission(user, P.EVIDENCE_UPLOAD) && canViewCase(user, caseItem)

// Matrix rows used by the README and any in-app documentation.
export const PERMISSION_LABELS = {
  [P.DASHBOARD_VIEW]: 'View dashboard',
  [P.CASES_VIEW]: 'View cases (assigned only, unless "all")',
  [P.CASES_VIEW_ALL]: 'View all cases',
  [P.CASES_CREATE]: 'Create cases',
  [P.CASES_UPDATE]: 'Update case details',
  [P.DOCUMENTS_MANAGE]: 'Register case documentation',
  [P.EVIDENCE_VIEW]: 'View evidence metadata and SHA-256',
  [P.EVIDENCE_VIEW_ALL]: 'View all evidence',
  [P.EVIDENCE_UPLOAD]: 'Upload evidence',
  [P.CUSTODY_VIEW]: 'View chain of custody',
  [P.CUSTODY_TRANSFER]: 'Request / simulate custody transfer',
  [P.CUSTODY_HOLD]: 'Can be named as custodian',
  [P.VERIFICATION_VIEW]: 'View verification results',
  [P.VERIFICATION_RUN]: 'Run mock integrity verification',
  [P.REPORTS_VIEW]: 'View reports',
  [P.REPORTS_CREATE]: 'Create draft reports',
  [P.AI_VIEW]: 'View mock AI analysis',
  [P.USERS_MANAGE]: 'Manage mock users and roles',
  [P.AUDIT_VIEW]: 'View audit log',
}
