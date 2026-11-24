// Synthetic chain-of-custody events for TRACE. Transaction IDs are fabricated placeholders,
// not real blockchain transactions.
export const CUSTODY_EVENT_TYPE = {
  REGISTERED: 'REGISTERED',
  UPLOADED: 'UPLOADED',
  ACCESS_REQUESTED: 'ACCESS_REQUESTED',
  ACCESS_GRANTED: 'ACCESS_GRANTED',
  ACCESSED: 'ACCESSED',
  CUSTODY_TRANSFERRED: 'CUSTODY_TRANSFERRED',
  INTEGRITY_VERIFIED: 'INTEGRITY_VERIFIED',
}

export const CUSTODY_EVENT_STATUS = {
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
  DENIED: 'DENIED',
}

const { REGISTERED, UPLOADED, ACCESS_REQUESTED, ACCESSED, CUSTODY_TRANSFERRED, INTEGRITY_VERIFIED } =
  CUSTODY_EVENT_TYPE
const { COMPLETED, PENDING } = CUSTODY_EVENT_STATUS

export const custodyEvents = [
  // EVD-2026-00231
  { id: 'CST-000001', evidence_id: 'EVD-2026-00231', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-06-02T23:50:02Z', reason: 'Initial evidence registration on collection.', status: COMPLETED, transaction_id: 'TXN-0x8a41f3' },
  { id: 'CST-000002', evidence_id: 'EVD-2026-00231', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-06-02T23:52:11Z', reason: 'Uploaded footage export to evidence storage.', status: COMPLETED, transaction_id: 'TXN-0x8a4203' },
  { id: 'CST-000003', evidence_id: 'EVD-2026-00231', event_type: CUSTODY_TRANSFERRED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2026-06-03T08:10:47Z', reason: 'Transferred to custody division for secure storage.', status: COMPLETED, transaction_id: 'TXN-0x8a45c1' },
  { id: 'CST-000004', evidence_id: 'EVD-2026-00231', event_type: INTEGRITY_VERIFIED, actor: 'System', organization: 'TRACE Platform', timestamp: '2026-06-03T08:11:02Z', reason: 'Automated hash verification on custody transfer.', status: COMPLETED, transaction_id: 'TXN-0x8a45c2' },

  // EVD-2026-00232
  { id: 'CST-000005', evidence_id: 'EVD-2026-00232', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-06-03T09:12:00Z', reason: 'Access log export registered as evidence.', status: COMPLETED, transaction_id: 'TXN-0x8a4711' },
  { id: 'CST-000006', evidence_id: 'EVD-2026-00232', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-06-03T09:14:47Z', reason: 'Uploaded CSV export to evidence storage.', status: COMPLETED, transaction_id: 'TXN-0x8a4718' },
  { id: 'CST-000007', evidence_id: 'EVD-2026-00232', event_type: CUSTODY_TRANSFERRED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2026-06-03T09:30:15Z', reason: 'Transferred to custody division.', status: COMPLETED, transaction_id: 'TXN-0x8a4802' },

  // EVD-2026-00256
  { id: 'CST-000008', evidence_id: 'EVD-2026-00256', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-06-18T13:55:00Z', reason: 'Disk image registered following on-site acquisition.', status: COMPLETED, transaction_id: 'TXN-0x9b1102' },
  { id: 'CST-000009', evidence_id: 'EVD-2026-00256', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-06-18T14:02:33Z', reason: 'Uploaded forensic disk image (E01).', status: COMPLETED, transaction_id: 'TXN-0x9b1119' },
  { id: 'CST-000010', evidence_id: 'EVD-2026-00256', event_type: ACCESS_REQUESTED, actor: 'AI Analysis Service (mock)', organization: 'AI/NLP Forensic Analysis Team', timestamp: '2026-06-20T10:00:00Z', reason: 'Requested access for automated log correlation analysis.', status: PENDING, transaction_id: 'TXN-0x9b1c40' },

  // EVD-2026-00257
  { id: 'CST-000011', evidence_id: 'EVD-2026-00257', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-06-18T14:18:00Z', reason: 'Firewall logs registered as supporting evidence.', status: COMPLETED, transaction_id: 'TXN-0x9b1201' },
  { id: 'CST-000012', evidence_id: 'EVD-2026-00257', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-06-18T14:20:09Z', reason: 'Uploaded exported firewall traffic logs.', status: COMPLETED, transaction_id: 'TXN-0x9b1209' },
  { id: 'CST-000013', evidence_id: 'EVD-2026-00257', event_type: CUSTODY_TRANSFERRED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2026-06-19T09:00:00Z', reason: 'Transferred to custody division for archival.', status: COMPLETED, transaction_id: 'TXN-0x9b1a30' },
  { id: 'CST-000014', evidence_id: 'EVD-2026-00257', event_type: INTEGRITY_VERIFIED, actor: 'System', organization: 'TRACE Platform', timestamp: '2026-06-19T09:00:20Z', reason: 'Automated hash verification on custody transfer.', status: COMPLETED, transaction_id: 'TXN-0x9b1a31' },

  // EVD-2026-00258 (flagged)
  { id: 'CST-000015', evidence_id: 'EVD-2026-00258', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-06-19T08:45:00Z', reason: 'Phishing email sample registered.', status: COMPLETED, transaction_id: 'TXN-0x9b2101' },
  { id: 'CST-000016', evidence_id: 'EVD-2026-00258', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-06-19T08:47:52Z', reason: 'Uploaded original .eml file.', status: COMPLETED, transaction_id: 'TXN-0x9b2107' },
  { id: 'CST-000017', evidence_id: 'EVD-2026-00258', event_type: ACCESSED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2026-06-20T11:20:00Z', reason: 'Routine custody review flagged a hash mismatch for follow-up.', status: COMPLETED, transaction_id: 'TXN-0x9b2211' },

  // EVD-2026-00279
  { id: 'CST-000018', evidence_id: 'EVD-2026-00279', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-07-01T16:30:00Z', reason: 'Witness dashcam clip registered.', status: COMPLETED, transaction_id: 'TXN-0xa10201' },
  { id: 'CST-000019', evidence_id: 'EVD-2026-00279', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-07-01T16:33:20Z', reason: 'Uploaded dashcam footage submitted by witness.', status: COMPLETED, transaction_id: 'TXN-0xa10209' },
  { id: 'CST-000020', evidence_id: 'EVD-2026-00279', event_type: CUSTODY_TRANSFERRED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2026-07-02T09:00:00Z', reason: 'Transferred to custody division.', status: COMPLETED, transaction_id: 'TXN-0xa10c00' },
  { id: 'CST-000021', evidence_id: 'EVD-2026-00279', event_type: INTEGRITY_VERIFIED, actor: 'System', organization: 'TRACE Platform', timestamp: '2026-07-02T09:00:18Z', reason: 'Automated hash verification on custody transfer.', status: COMPLETED, transaction_id: 'TXN-0xa10c01' },

  // EVD-2026-00280 (pending verification)
  { id: 'CST-000022', evidence_id: 'EVD-2026-00280', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-07-02T10:02:00Z', reason: 'Traffic camera capture registered.', status: COMPLETED, transaction_id: 'TXN-0xa11101' },
  { id: 'CST-000023', evidence_id: 'EVD-2026-00280', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-07-02T10:05:41Z', reason: 'Uploaded municipal traffic camera footage.', status: COMPLETED, transaction_id: 'TXN-0xa11109' },
  { id: 'CST-000024', evidence_id: 'EVD-2026-00280', event_type: ACCESS_REQUESTED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2026-07-02T15:00:00Z', reason: 'Custody transfer request pending verification.', status: PENDING, transaction_id: 'TXN-0xa11c10' },

  // EVD-2026-00301
  { id: 'CST-000025', evidence_id: 'EVD-2026-00301', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-07-14T11:10:00Z', reason: 'Ledger scan registered following residence search.', status: COMPLETED, transaction_id: 'TXN-0xb20101' },
  { id: 'CST-000026', evidence_id: 'EVD-2026-00301', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-07-14T11:12:03Z', reason: 'Uploaded scanned ledger PDF.', status: COMPLETED, transaction_id: 'TXN-0xb20109' },

  // EVD-2026-00302
  { id: 'CST-000027', evidence_id: 'EVD-2026-00302', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-07-14T11:38:00Z', reason: 'Banknote sample photographs registered.', status: COMPLETED, transaction_id: 'TXN-0xb20201' },
  { id: 'CST-000028', evidence_id: 'EVD-2026-00302', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-07-14T11:40:19Z', reason: 'Uploaded photo archive of seized banknotes.', status: COMPLETED, transaction_id: 'TXN-0xb20209' },
  { id: 'CST-000029', evidence_id: 'EVD-2026-00302', event_type: CUSTODY_TRANSFERRED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2026-07-15T09:00:00Z', reason: 'Transferred to custody division.', status: COMPLETED, transaction_id: 'TXN-0xb20c00' },

  // EVD-2026-00098
  { id: 'CST-000030', evidence_id: 'EVD-2026-00098', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-04-22T18:55:00Z', reason: 'Fire scene photographs registered.', status: COMPLETED, transaction_id: 'TXN-0xc30101' },
  { id: 'CST-000031', evidence_id: 'EVD-2026-00098', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2026-04-22T19:02:56Z', reason: 'Uploaded photographic documentation archive.', status: COMPLETED, transaction_id: 'TXN-0xc30109' },
  { id: 'CST-000032', evidence_id: 'EVD-2026-00098', event_type: CUSTODY_TRANSFERRED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2026-04-23T09:00:00Z', reason: 'Transferred to custody division for archival ahead of trial.', status: COMPLETED, transaction_id: 'TXN-0xc30c00' },
  { id: 'CST-000033', evidence_id: 'EVD-2026-00098', event_type: ACCESSED, actor: 'Priya Nair', organization: 'Judicial Review Division', timestamp: '2026-05-30T13:00:00Z', reason: 'Reviewed as part of trial proceedings.', status: COMPLETED, transaction_id: 'TXN-0xc31500' },
  { id: 'CST-000034', evidence_id: 'EVD-2026-00098', event_type: INTEGRITY_VERIFIED, actor: 'System', organization: 'TRACE Platform', timestamp: '2026-05-30T13:00:05Z', reason: 'Automated hash verification prior to court review.', status: COMPLETED, transaction_id: 'TXN-0xc31501' },

  // EVD-2026-00099
  { id: 'CST-000035', evidence_id: 'EVD-2026-00099', event_type: REGISTERED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2026-04-25T13:15:00Z', reason: 'Lab report registered as supporting evidence.', status: COMPLETED, transaction_id: 'TXN-0xc31001' },
  { id: 'CST-000036', evidence_id: 'EVD-2026-00099', event_type: UPLOADED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2026-04-25T13:21:44Z', reason: 'Uploaded laboratory analysis report.', status: COMPLETED, transaction_id: 'TXN-0xc31009' },

  // EVD-2025-00812
  { id: 'CST-000037', evidence_id: 'EVD-2025-00812', event_type: REGISTERED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2025-11-09T15:44:00Z', reason: 'Bank statement bundle registered.', status: COMPLETED, transaction_id: 'TXN-0xd40101' },
  { id: 'CST-000038', evidence_id: 'EVD-2025-00812', event_type: UPLOADED, actor: 'Sarah Thomas', organization: 'Cybercrime Investigation Unit', timestamp: '2025-11-09T15:48:12Z', reason: 'Uploaded bundled statements PDF.', status: COMPLETED, transaction_id: 'TXN-0xd40109' },
  { id: 'CST-000039', evidence_id: 'EVD-2025-00812', event_type: CUSTODY_TRANSFERRED, actor: 'Daniel Mathew', organization: 'Digital Forensic Laboratory', timestamp: '2025-11-10T09:00:00Z', reason: 'Transferred to custody division for archival.', status: COMPLETED, transaction_id: 'TXN-0xd40c00' },
]

export const getCustodyEventsByEvidenceId = (evidenceId) =>
  custodyEvents
    .filter((e) => e.evidence_id === evidenceId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
