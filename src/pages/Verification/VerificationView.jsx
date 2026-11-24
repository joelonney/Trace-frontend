import { useCallback, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, XCircle, PlayCircle, FileSearch } from 'lucide-react'
import { getEvidenceById } from '../../api/evidence'
import { getVerification, runVerification } from '../../api/verification'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Alert } from '../../components/common/Alert'
import { Button } from '../../components/common/Button'
import { LoadingState } from '../../components/common/LoadingState'
import { EmptyState } from '../../components/common/EmptyState'
import { AccessDenied } from '../AccessDenied/AccessDenied'
import { formatDateTime } from '../../utils/formatters'
import { useAuth } from '../../hooks/useAuth'
import { hasPermission, P } from '../../utils/permissions'
import { useAsyncState } from '../../hooks/useAsyncState'
import { codeOf, named, statusOf } from '../../utils/ids'
import { errorMessage } from '../../utils/errors'
import { useMock } from '../../api/mode'

const LOADING = { status: 'loading' }

const SOURCE_COPY = {
  SYNTHETIC_DEMO: {
    variant: 'warning',
    title: 'Synthetic demonstration result',
    text: 'Generated from local mock data. No file was hashed and no backend or blockchain was consulted.',
  },
  BACKEND: {
    variant: 'info',
    title: 'Backend verification',
    text: 'The backend re-hashed the stored object and compared it with the persisted hash and the ledger record. "Hashes match" here does not by itself prove blockchain confirmation — see the ledger reference below.',
  },
  NONE: {
    variant: 'warning',
    title: 'No verification recorded yet',
    text: 'Only the persisted hash is known. Run a verification to compare it with the stored object.',
  },
  LOCAL_CALCULATED: {
    variant: 'info',
    title: 'Locally calculated file hash',
    text: `The SHA-256 below was calculated in your browser from a file you selected and compared with the hash in the ${
      useMock ? 'mock' : 'persisted'
    } record. It is not confirmed by a backend and is not a blockchain verification.`,
  },
}

// What the result box says. Only a real MATCH is ever green; "couldn't check" is not a mismatch,
// and "nothing checked yet" is neither.
const OUTCOMES = {
  MATCH: { title: 'Hashes match', tone: 'ok' },
  MISMATCH: { title: 'Hash mismatch', tone: 'bad' },
  LEDGER_UNAVAILABLE: { title: 'Ledger unavailable — integrity not confirmed', tone: 'warn' },
  STORAGE_UNAVAILABLE: { title: 'Storage unavailable — integrity not confirmed', tone: 'warn' },
  PENDING: { title: 'Verification in progress', tone: 'warn' },
  NONE: { title: 'Not verified yet', tone: 'warn' },
}
const TONE_CLASS = {
  ok: 'bg-status-successBg text-status-success',
  bad: 'bg-status-dangerBg text-status-danger',
  warn: 'bg-status-warningBg text-status-warning',
}
const SOURCE_SUFFIX = { SYNTHETIC_DEMO: ' (synthetic)', BACKEND: ' (backend)', LOCAL_CALCULATED: ' (local comparison)' }

export const VerificationView = () => {
  const { evidenceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileRef = useRef(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState(null)

  const load = useCallback(async () => {
    try {
      const evidenceItem = await getEvidenceById(evidenceId)
      const record = await getVerification(evidenceId)
      return { status: 'ready', evidenceItem, record }
    } catch (err) {
      return { status: statusOf(err), message: err.message }
    }
  }, [evidenceId])
  const { state, setState } = useAsyncState(load, LOADING)

  const run = async (file) => {
    setRunError(null)
    setIsRunning(true)
    try {
      const record = await runVerification(evidenceId, file)
      setState({ ...state, record })
    } catch (err) {
      setRunError(errorMessage(err))
    } finally {
      setIsRunning(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (state.status === 'loading') return <LoadingState label="Loading verification…" />
  if (state.status === 'denied') return <AccessDenied message="You are not authorized to access this evidence item." />
  if (state.status === 'notfound') {
    return <EmptyState message={`${named('Evidence', evidenceId)} could not be found, or you do not have access to it.`} />
  }
  if (state.status === 'error') {
    return <EmptyState message={`Could not load this verification${state.message ? `: ${state.message}` : '.'}`} />
  }

  const { evidenceItem, record } = state
  const copy = SOURCE_COPY[record.source] ?? SOURCE_COPY.SYNTHETIC_DEMO
  const canRun = hasPermission(user, P.VERIFICATION_RUN)
  const outcomeKey = record.source === 'NONE' ? 'NONE' : (record.result ?? (record.match ? 'MATCH' : 'MISMATCH'))
  const outcome = OUTCOMES[outcomeKey] ?? OUTCOMES.NONE
  const OutcomeIcon = outcome.tone === 'ok' ? CheckCircle2 : outcome.tone === 'bad' ? XCircle : FileSearch

  return (
    <div>
      <button
        onClick={() => navigate('/verification')}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3"
      >
        <ChevronLeft size={14} /> Back to Verification
      </button>

      <PageHeader
        title="Integrity Verification"
        description={`${evidenceItem.filename} · ${codeOf(evidenceItem)}`}
        action={
          canRun && (
            <div className="flex gap-2">
              <Button variant="secondary" icon={PlayCircle} disabled={isRunning} onClick={() => run(null)}>
                {useMock ? 'Run mock verification' : 'Run backend verification'}
              </Button>
              <Button icon={FileSearch} disabled={isRunning} onClick={() => fileRef.current?.click()}>
                Hash a local file…
              </Button>
              <input ref={fileRef} type="file" className="hidden" aria-label="File to hash locally" onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
            </div>
          )
        }
      />

      <div className="mb-4 space-y-3">
        <Alert variant={copy.variant} title={copy.title}>{copy.text}</Alert>
        {runError && <Alert variant="danger">{runError}</Alert>}
        {useMock && (
          <Alert variant="info" title="Not yet available">
            Backend-confirmed verification (FastAPI) and blockchain transaction references (Hyperledger
            Fabric) are not connected. Nothing on this page is a real blockchain confirmation.
          </Alert>
        )}
      </div>

      <Card>
        <div className={`flex items-center gap-3 rounded-md px-4 py-3 mb-5 ${TONE_CLASS[outcome.tone]}`}>
          <OutcomeIcon size={22} />
          <div>
            <p className="text-sm font-semibold">
              {outcome.title}
              {SOURCE_SUFFIX[record.source] ?? ''}
            </p>
            {record.checked_at && (
              <p className="text-xs opacity-80">
                Checked {formatDateTime(record.checked_at)}
                {record.checked_by ? ` by ${record.checked_by}` : ''}
              </p>
            )}
          </div>
        </div>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500">
              {record.source === 'LOCAL_CALCULATED'
                ? `Calculated SHA-256 (local file: ${record.checked_filename})`
                : record.source === 'SYNTHETIC_DEMO'
                  ? 'Current SHA-256 (synthetic)'
                  : 'Recalculated SHA-256 (backend)'}
            </dt>
            <dd className="font-mono text-xs text-slate-800 break-all mt-0.5">
              {record.current_sha256 ?? '— (not verified yet)'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">
              {useMock ? 'Recorded SHA-256 (mock record — read-only)' : 'Persisted SHA-256 (read-only)'}
            </dt>
            <dd className="font-mono text-xs text-slate-800 break-all mt-0.5">{record.recorded_sha256}</dd>
          </div>
          {!useMock && (
            <div>
              <dt className="text-xs text-slate-500">Ledger-recorded SHA-256</dt>
              <dd className="font-mono text-xs text-slate-800 break-all mt-0.5">
                {record.ledger_sha256 ?? 'None — not recorded on the ledger yet'}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-500">
              {useMock
                ? 'Placeholder transaction reference (not a real blockchain transaction)'
                : 'Ledger transaction reference'}
            </dt>
            <dd className="font-mono text-xs text-slate-800 mt-0.5">
              {record.placeholder_reference ?? 'None — no transaction recorded'}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
