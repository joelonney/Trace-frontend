const STATUS_ORDER = ['VERIFIED', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'FLAGGED']

const STATUS_LABEL = {
  VERIFIED: 'Verified',
  PENDING_VERIFICATION: 'Pending Verification',
  UNDER_REVIEW: 'Under Review',
  FLAGGED: 'Flagged',
}

const STATUS_DOT = {
  VERIFIED: 'bg-status-success',
  PENDING_VERIFICATION: 'bg-status-warning',
  UNDER_REVIEW: 'bg-status-warning',
  FLAGGED: 'bg-status-danger',
}

export const VerificationSummary = ({ evidenceItems }) => {
  const counts = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = evidenceItems.filter((e) => e.status === status).length
    return acc
  }, {})

  return (
    <ul className="space-y-3">
      {STATUS_ORDER.map((status) => (
        <li key={status} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-slate-600">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </span>
          <span className="font-medium text-slate-800">{counts[status]}</span>
        </li>
      ))}
    </ul>
  )
}
