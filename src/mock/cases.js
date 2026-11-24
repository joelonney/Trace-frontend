// Synthetic case records for TRACE. Fictional case data for frontend development only.
import { CASE_STATUS, CASE_PRIORITY } from '../constants/cases'

export { CASE_STATUS, CASE_PRIORITY } from '../constants/cases'

export const cases = [
  {
    id: 'TRC-2026-0114',
    assigned_user_ids: ['USR-002', 'USR-003', 'USR-004'],
    title: 'Riverside Warehouse Break-In',
    type: 'Burglary',
    status: CASE_STATUS.OPEN,
    priority: CASE_PRIORITY.HIGH,
    investigator: 'Sarah Thomas',
    investigator_id: 'USR-002',
    organization: 'Cybercrime Investigation Unit',
    opened_date: '2026-06-02',
    description:
      'Forced entry reported at a commercial warehouse on Dockside Ave. Digital CCTV footage and door access logs recovered for analysis.',
  },
  {
    id: 'TRC-2026-0129',
    assigned_user_ids: ['USR-002', 'USR-003', 'USR-004'],
    title: 'Corporate Network Intrusion — Halden Finance',
    type: 'Cybercrime',
    status: CASE_STATUS.OPEN,
    priority: CASE_PRIORITY.HIGH,
    investigator: 'Sarah Thomas',
    investigator_id: 'USR-002',
    organization: 'Cybercrime Investigation Unit',
    opened_date: '2026-06-18',
    description:
      'Unauthorized access to internal financial systems detected. Server disk images and network logs seized for forensic imaging.',
  },
  {
    id: 'TRC-2026-0142',
    assigned_user_ids: ['USR-002', 'USR-003'],
    title: 'Vehicular Hit-and-Run, Route 9',
    type: 'Traffic Incident',
    status: CASE_STATUS.UNDER_REVIEW,
    priority: CASE_PRIORITY.MEDIUM,
    investigator: 'Sarah Thomas',
    investigator_id: 'USR-002',
    organization: 'Cybercrime Investigation Unit',
    opened_date: '2026-07-01',
    description:
      'Dashcam footage submitted by a witness and traffic camera captures under review to identify the vehicle involved.',
  },
  {
    id: 'TRC-2026-0151',
    assigned_user_ids: ['USR-002', 'USR-003'],
    title: 'Counterfeit Currency Distribution Ring',
    type: 'Fraud',
    status: CASE_STATUS.OPEN,
    priority: CASE_PRIORITY.MEDIUM,
    investigator: 'Sarah Thomas',
    investigator_id: 'USR-002',
    organization: 'Cybercrime Investigation Unit',
    opened_date: '2026-07-14',
    description:
      'Seized financial records and communications related to suspected distribution of counterfeit banknotes across three districts.',
  },
  {
    id: 'TRC-2026-0088',
    assigned_user_ids: ['USR-002', 'USR-003', 'USR-004'],
    title: 'Residential Arson Investigation, Elm Street',
    type: 'Arson',
    status: CASE_STATUS.CLOSED,
    priority: CASE_PRIORITY.LOW,
    investigator: 'Sarah Thomas',
    investigator_id: 'USR-002',
    organization: 'Cybercrime Investigation Unit',
    opened_date: '2026-04-22',
    description:
      'Fire scene photographs and accelerant lab report archived following prosecution. Case closed after conviction.',
  },
  {
    id: 'TRC-2025-0967',
    assigned_user_ids: ['USR-002', 'USR-004'],
    title: 'Identity Theft — Coastal Credit Union',
    type: 'Fraud',
    status: CASE_STATUS.ARCHIVED,
    priority: CASE_PRIORITY.LOW,
    investigator: 'Sarah Thomas',
    investigator_id: 'USR-002',
    organization: 'Cybercrime Investigation Unit',
    opened_date: '2025-11-09',
    description:
      'Historical case archived after resolution. Retained for audit and reference purposes only.',
  },
]

export const getCaseById = (id) => cases.find((c) => c.id === id)
