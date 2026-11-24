// Synthetic integrity verification baseline for TRACE seed evidence.
// NOTE: entirely mocked. No real hashing or blockchain lookup happens here.

// A deliberately altered hash used to simulate a detected mismatch for flagged seed items.
export const SYNTHETIC_TAMPERED_HASH =
  'e2f4061829304a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c9'

export const VERIFICATION_SOURCE = {
  SYNTHETIC_DEMO: 'SYNTHETIC_DEMO',
  LOCAL_CALCULATED: 'LOCAL_CALCULATED',
}

export const buildSyntheticVerification = (item, custodyEvents) => {
  const verifiedEvent = custodyEvents
    .filter((e) => e.evidence_id === item.id && e.event_type === 'INTEGRITY_VERIFIED')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]

  const currentHash = item.status === 'FLAGGED' ? SYNTHETIC_TAMPERED_HASH : item.sha256

  return {
    evidence_id: item.id,
    source: VERIFICATION_SOURCE.SYNTHETIC_DEMO,
    recorded_sha256: item.sha256,
    current_sha256: currentHash,
    match: currentHash === item.sha256,
    verified_timestamp: verifiedEvent?.timestamp ?? null,
    placeholder_reference: verifiedEvent?.transaction_id ?? null,
    checked_at: new Date().toISOString(),
    checked_by: null,
  }
}
