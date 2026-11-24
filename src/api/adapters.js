// Pure mappers: API_CONTRACT_V1 response shapes → the field names the current UI reads.
// No imports, no side effects, so these can be unit-tested with plain Node.
// Remove this layer in step I-7 once UI fields are renamed to the contract names.

export const EVIDENCE_TYPE_LABELS = {
  VIDEO: 'Video',
  AUDIO: 'Audio',
  DOCUMENT: 'Document',
  IMAGE_ARCHIVE: 'Image Archive',
  DISK_IMAGE: 'Disk Image',
  LOG_FILE: 'Log File',
}
const LABEL_TO_TYPE = Object.fromEntries(Object.entries(EVIDENCE_TYPE_LABELS).map(([k, v]) => [v, k]))

export const evidenceTypeToLabel = (t) => EVIDENCE_TYPE_LABELS[t] ?? t ?? null
export const evidenceLabelToType = (label) => LABEL_TO_TYPE[label] ?? label ?? null

const name = (ref) => ref?.name ?? null
const id = (ref) => ref?.id ?? null

export const toUserRef = (ref) =>
  ref ? { id: ref.id, name: ref.name ?? null, organization: ref.organization ?? null } : null

export const toUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  organization: u.organization ?? null,
  status: u.status,
  created_at: u.created_at ?? null,
  last_login_at: u.last_login_at ?? null,
  permissions: Array.isArray(u.permissions) ? u.permissions : undefined,
})

export const toCase = (c) => ({
  id: c.id,
  display_id: c.display_id ?? c.id,
  title: c.title,
  type: c.type,
  status: c.status,
  priority: c.priority,
  description: c.description ?? '',
  investigator: name(c.lead_investigator),
  investigator_id: id(c.lead_investigator),
  organization: c.organization ?? c.lead_investigator?.organization ?? null,
  opened_date: c.opened_at ?? null,
  assigned_user_ids: Array.isArray(c.assignments) ? c.assignments.map((a) => a.user?.id).filter(Boolean) : [],
  assignments: Array.isArray(c.assignments) ? c.assignments.map((a) => ({ ...a, user: toUserRef(a.user) })) : null,
  documents: Array.isArray(c.documents) ? c.documents.map(toCaseDocument) : [],
  evidence_count: c.evidence_count ?? null,
})

export const toCaseDocument = (d) => ({
  id: d.id,
  case_id: d.case_id ?? null,
  title: d.title,
  note: d.note ?? '',
  added_by: name(d.added_by),
  added_at: d.added_at ?? null,
})

// Only a CONFIRMED/RECORDED ledger entry counts as a real transaction reference.
const recordedTxRef = (ledger) =>
  ledger && (ledger.status === 'RECORDED' || ledger.status === 'CONFIRMED') ? (ledger.tx_ref ?? null) : null

export const toEvidence = (e) => ({
  id: e.id,
  display_id: e.display_id ?? e.id,
  case_id: e.case_id,
  case_display_id: e.case_display_id ?? e.case_id,
  filename: e.filename,
  file_type: evidenceTypeToLabel(e.evidence_type),
  mime_type: e.mime_type ?? null,
  description: e.description ?? '',
  size: e.size_bytes ?? null,
  sha256: e.hash?.persisted_sha256 ?? null,
  hash_source: e.hash?.calculated_by ?? null, // 'BACKEND' under the contract
  hash_calculated_at: e.hash?.calculated_at ?? null,
  // `cid` is only meaningful when the provider really is IPFS; otherwise the UI shows storage.
  cid: e.storage?.provider === 'IPFS' ? (e.storage.reference ?? null) : null,
  storage: e.storage ?? null,
  uploaded_by: id(e.uploaded_by),
  uploaded_by_name: name(e.uploaded_by),
  upload_timestamp: e.registered_at ?? null,
  current_custodian: id(e.current_custodian),
  current_custodian_name: name(e.current_custodian),
  status: e.integrity_status,
  ledger: e.ledger ?? null,
  transaction_id: recordedTxRef(e.ledger),
  is_mock_registration: false,
})

export const toCustodyEvent = (ev) => ({
  id: ev.id,
  evidence_id: ev.evidence_id,
  event_type: ev.event_type,
  status: ev.status,
  actor: name(ev.actor),
  actor_id: id(ev.actor),
  organization: ev.actor?.organization ?? null,
  from_user: toUserRef(ev.from_user),
  to_user: toUserRef(ev.to_user),
  reason: ev.reason ?? '',
  timestamp: ev.occurred_at ?? null,
  transaction_id: recordedTxRef(ev.ledger),
  ledger: ev.ledger ?? null,
})

export const toVerification = (v) => ({
  id: v.id ?? null,
  evidence_id: v.evidence_id,
  source: v.kind ?? 'BACKEND',
  result: v.result,
  // MATCH is the only result that may ever render as a match.
  match: v.result === 'MATCH',
  recorded_sha256: v.persisted_sha256 ?? null,
  current_sha256: v.recalculated_sha256 ?? null,
  ledger_sha256: v.ledger_sha256 ?? null,
  placeholder_reference: v.ledger_tx_ref ?? null,
  verified_timestamp: v.verified_at ?? null,
  checked_at: v.verified_at ?? null,
  checked_by: name(v.verified_by),
  checked_filename: null,
  notes: v.notes ?? null,
})

export const toReport = (r) => ({
  id: r.id,
  display_id: r.display_id ?? r.id,
  case_id: r.case_id,
  title: r.title,
  summary: r.summary ?? '',
  status: r.status,
  author: name(r.author),
  author_id: id(r.author),
  generated_at: r.created_at ?? null,
  ai_assisted: Boolean(r.ai_assisted),
})

// A custody transfer request (two-step: the recipient must accept before custody changes).
export const toTransfer = (t) => ({
  id: t.id,
  evidence_id: t.evidence_id,
  status: t.status,
  reason: t.reason ?? '',
  from_user: toUserRef(t.from_user),
  to_user: toUserRef(t.to_user),
  requested_at: t.requested_at ?? null,
})
export const toAuditEvent = (a) => ({
  id: a.id,
  timestamp: a.occurred_at ?? null,
  actor_id: id(a.actor),
  actor_name: name(a.actor) ?? 'System',
  action: a.action,
  target: a.target_display ?? a.target_id ?? '',
  target_type: a.target_type ?? null,
  target_id: a.target_id ?? null,
  detail: a.detail ?? '',
  outcome: a.outcome ?? null,
})

export const toAnalysis = (j) => ({
  evidence_id: j.evidence_id,
  job_id: j.id ?? null,
  status: j.status ?? null,
  synthetic: false,
  is_draft: j.is_draft !== false,
  model: j.service?.model ?? j.service?.name ?? 'Unknown model',
  summary: j.result?.summary ?? null,
  entities: j.result?.entities ?? [],
  timeline: j.result?.timeline ?? [],
  classification: j.result?.classification ?? null,
  disclaimer: j.disclaimer ?? 'AI-generated draft. Requires investigator review.',
  error: j.error ?? null,
})

// Unwraps `{ items, page, page_size, total }` or a bare array.
export const items = (page) => (Array.isArray(page) ? page : (page?.items ?? []))
