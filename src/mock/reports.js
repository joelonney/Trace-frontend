// Synthetic report summaries for TRACE.
export const reports = [
  {
    id: 'RPT-2026-0041',
    case_id: 'TRC-2026-0114',
    title: 'Preliminary Forensic Summary — Riverside Warehouse Break-In',
    author: 'Sarah Thomas',
    generated_at: '2026-06-10T10:00:00Z',
    status: 'FINAL',
  },
  {
    id: 'RPT-2026-0042',
    case_id: 'TRC-2026-0129',
    title: 'Network Intrusion Timeline — Halden Finance',
    author: 'Sarah Thomas',
    generated_at: '2026-06-25T09:30:00Z',
    status: 'DRAFT',
  },
  {
    id: 'RPT-2026-0043',
    case_id: 'TRC-2026-0142',
    title: 'Traffic Camera Correlation Report — Route 9 Incident',
    author: 'Sarah Thomas',
    generated_at: '2026-07-05T14:15:00Z',
    status: 'DRAFT',
  },
  {
    id: 'RPT-2026-0044',
    case_id: 'TRC-2026-0088',
    title: 'Closing Report — Elm Street Arson Investigation',
    author: 'Daniel Mathew',
    generated_at: '2026-06-01T11:00:00Z',
    status: 'FINAL',
  },
  {
    id: 'RPT-2025-0198',
    case_id: 'TRC-2025-0967',
    title: 'Case Closure Summary — Coastal Credit Union Identity Theft',
    author: 'Sarah Thomas',
    generated_at: '2025-12-02T16:45:00Z',
    status: 'ARCHIVED',
  },
]

export const getReportsByCaseId = (caseId) => reports.filter((r) => r.case_id === caseId)
