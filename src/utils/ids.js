// Human-readable record codes.
//
// Under the API contract every record has a UUID `id` (used in URLs and API calls) and a separate
// `display_id` (`TRC-2026-0114`, `EVD-2026-00231`) meant for people. In mock mode the data only has
// the readable code as its `id`, so these helpers fall back to it — one code path for both modes.
export const codeOf = (item) => item?.display_id ?? item?.id ?? ''

// An evidence item's case, as a human-readable code.
export const caseCodeOf = (evidenceItem) => evidenceItem?.case_display_id ?? evidenceItem?.case_id ?? ''

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value) => UUID_RE.test(String(value ?? ''))

// How a detail page should react to a failed load. The API contract returns 403 when an action is
// forbidden and 404 for a record that is missing *or hidden from you* (so existence isn't leaked);
// anything else (network down, 500) is a genuine load failure, not "not found".
export const statusOf = (err) => (err?.status === 403 ? 'denied' : err?.status === 404 ? 'notfound' : 'error')

// "Case TRC-2026-0114" for a readable code, "This case" when the URL holds a UUID.
export const named = (kind, id) => (isUuid(id) ? `This ${kind.toLowerCase()}` : `${kind} ${id}`)
