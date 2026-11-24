import { titleCase } from '../../utils/formatters'

// Maps known status/priority values to a semantic tone. Unrecognized values fall back to neutral.
const TONE_BY_VALUE = {
  VERIFIED: 'success',
  CONFIRMED: 'success',
  MATCH: 'success',
  COMPLETED: 'success',
  ACTIVE: 'success',
  GRANTED: 'success',
  FINAL: 'success',
  OPEN: 'info',
  REGISTERED: 'info',
  RECORDED: 'info',
  PENDING_VERIFICATION: 'warning',
  PENDING_LEDGER: 'warning',
  SUBMITTED: 'warning',
  LEDGER_UNAVAILABLE: 'warning',
  PENDING: 'warning',
  UNDER_REVIEW: 'warning',
  DRAFT: 'warning',
  HIGH: 'danger',
  FLAGGED: 'danger',
  MISMATCH: 'danger',
  REJECTED: 'danger',
  FAILED: 'danger',
  DENIED: 'danger',
  SUSPENDED: 'danger',
  INACTIVE: 'danger',
  MEDIUM: 'warning',
  LOW: 'neutral',
  CLOSED: 'neutral',
  ARCHIVED: 'neutral',
}

const TONE_CLASSES = {
  success: 'bg-status-successBg text-status-success',
  warning: 'bg-status-warningBg text-status-warning',
  danger: 'bg-status-dangerBg text-status-danger',
  info: 'bg-status-infoBg text-status-info',
  neutral: 'bg-status-neutralBg text-status-neutral',
}

export const StatusBadge = ({ value, tone }) => {
  const resolvedTone = tone ?? TONE_BY_VALUE[value] ?? 'neutral'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[resolvedTone]}`}
    >
      {titleCase(value)}
    </span>
  )
}
