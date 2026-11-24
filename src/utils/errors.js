// Turns an API error into text a person can act on. Validation errors (422) carry per-field
// messages in `details`; prefer those over the generic "Some fields are invalid.".
export const errorMessage = (err, fallback = 'Request failed.') => {
  if (Array.isArray(err?.details) && err.details.length > 0) {
    return err.details.map((d) => d.message).filter(Boolean).join(' ')
  }
  return err?.message || fallback
}
