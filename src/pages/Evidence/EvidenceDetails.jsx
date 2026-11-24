import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, ArrowRightLeft } from 'lucide-react'
import { getEvidenceById } from '../../api/evidence'
import { getCaseById } from '../../api/cases'
import { getCustodyEvents, transferCustody, getTransferRecipients } from '../../api/custody'
import { getAiAnalysis } from '../../api/ai'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { Alert } from '../../components/common/Alert'
import { LoadingState } from '../../components/common/LoadingState'
import { EmptyState } from '../../components/common/EmptyState'
import { EvidenceDetailPanel } from '../../components/evidence/EvidenceDetailPanel'
import { CustodyTimeline } from '../../components/custody/CustodyTimeline'
import { AccessDenied } from '../AccessDenied/AccessDenied'
import { useAuth } from '../../hooks/useAuth'
import { hasPermission, P } from '../../utils/permissions'
import { useAsyncState } from '../../hooks/useAsyncState'
import { codeOf, named, statusOf } from '../../utils/ids'
import { errorMessage } from '../../utils/errors'
import { useMock } from '../../api/mode'

const LOADING = { status: 'loading' }

// Transfers are two-step against the API: an offer stays pending until the recipient accepts or
// rejects. The newest transfer-related event tells us where things stand (events are oldest first).
const TRANSFER_EVENTS = ['CUSTODY_TRANSFER_REQUESTED', 'CUSTODY_TRANSFERRED', 'CUSTODY_TRANSFER_REJECTED']
const pendingTransferOf = (events) => {
  const latest = [...events].reverse().find((e) => TRANSFER_EVENTS.includes(e.event_type))
  return latest && latest.event_type === 'CUSTODY_TRANSFER_REQUESTED' && latest.status === 'PENDING' ? latest : null
}

const TransferForm = ({ evidenceId, onDone, onCancel }) => {
  const [recipients, setRecipients] = useState(null)
  const [toUserId, setToUserId] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getTransferRecipients(evidenceId).then((r) => {
      setRecipients(r)
      setToUserId(r[0]?.id ?? '')
    })
  }, [evidenceId])

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      const event = await transferCustody({ evidenceId, toUserId, reason })
      onDone(event)
    } catch (err) {
      setError(errorMessage(err))
      setIsSaving(false)
    }
  }

  if (!recipients) return <LoadingState label="Loading recipients…" />

  return (
    <form onSubmit={submit} className="space-y-4">
      {useMock ? (
        <Alert variant="info" title="Simulated transfer">
          Updates the in-memory custodian and appends a custody event. No blockchain transaction is made.
        </Alert>
      ) : (
        <Alert variant="info" title="Custody transfer">
          Offers custody to the selected user. If the backend requires approval, custody changes only
          when they accept.
        </Alert>
      )}
      {error && <Alert variant="danger">{error}</Alert>}
      {recipients.length === 0 ? (
        <Alert variant="warning">No eligible recipients are assigned to this case.</Alert>
      ) : (
        <>
          <div>
            <label htmlFor="t-to" className="block text-xs font-medium text-slate-600 mb-1">Transfer to</label>
            <select id="t-to" value={toUserId} onChange={(e) => setToUserId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>{r.name} — {r.organization}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="t-reason" className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <textarea id="t-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button>
        <Button type="submit" disabled={isSaving || recipients.length === 0}>{isSaving ? 'Transferring…' : useMock ? 'Simulate transfer' : 'Transfer custody'}</Button>
      </div>
    </form>
  )
}

export const EvidenceDetails = () => {
  const { evidenceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    try {
      const evidenceItem = await getEvidenceById(evidenceId)
      const [custodyEvents, relatedCase, ai] = await Promise.all([
        getCustodyEvents(evidenceId),
        getCaseById(evidenceItem.case_id).catch(() => null),
        hasPermission(user, P.AI_VIEW) ? getAiAnalysis(evidenceId).catch(() => null) : null,
      ])
      return { status: 'ready', evidenceItem, custodyEvents, relatedCase, ai }
    } catch (err) {
      return { status: statusOf(err), message: err.message }
    }
  }, [evidenceId, user])
  const { state, refresh } = useAsyncState(load, LOADING)

  if (state.status === 'loading') return <LoadingState label="Loading evidence…" />
  if (state.status === 'denied') {
    return <AccessDenied message="You are not authorized to access this evidence item." />
  }
  if (state.status === 'notfound') {
    return <EmptyState message={`${named('Evidence', evidenceId)} could not be found, or you do not have access to it.`} />
  }
  if (state.status === 'error') {
    return <EmptyState message={`Could not load this evidence item${state.message ? `: ${state.message}` : '.'}`} />
  }

  const { evidenceItem, custodyEvents, relatedCase, ai } = state
  const pendingTransfer = pendingTransferOf(custodyEvents)
  const canTransfer = hasPermission(user, P.CUSTODY_TRANSFER) && !pendingTransfer

  return (
    <div>
      <button
        onClick={() => navigate('/evidence')}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3"
      >
        <ChevronLeft size={14} /> Back to Evidence
      </button>

      <PageHeader
        title={evidenceItem.filename}
        description={codeOf(evidenceItem)}
        action={
          <div className="flex gap-2">
            {canTransfer && (
              <Button variant="secondary" icon={ArrowRightLeft} onClick={() => setIsTransferOpen(true)}>
                Transfer Custody
              </Button>
            )}
            <Link to={`/verification/${evidenceItem.id}`}>
              <Button variant="secondary" icon={ShieldCheck}>View Verification</Button>
            </Link>
          </div>
        }
      />

      {notice && (
        <div className="mb-4">
          <Alert variant="success">{notice}</Alert>
        </div>
      )}

      {pendingTransfer && (
        <div className="mb-4">
          <Alert variant="warning" title="Custody transfer pending">
            Offered to {pendingTransfer.to_user?.name ?? 'the recipient'}
            {pendingTransfer.actor ? ` by ${pendingTransfer.actor}` : ''}. Custody changes only when they accept.
            {pendingTransfer.to_user?.id === user.id && (
              <>
                {' '}
                <Link to="/transfers" className="font-medium underline">Review it in Incoming transfers</Link>.
              </>
            )}
          </Alert>
        </div>
      )}

      {evidenceItem.is_mock_registration && (
        <div className="mb-4">
          <Alert variant="warning" title="Mock registration">
            Registered in this browser session only. The file was not stored and nothing was written to
            a blockchain.
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Evidence Information" className="lg:col-span-2">
          <EvidenceDetailPanel evidenceItem={evidenceItem} relatedCase={relatedCase} />
        </Card>

        <Card title="Custody History" description="Chain of custody for this evidence item." className="lg:col-span-1">
          <CustodyTimeline events={custodyEvents} />
        </Card>
      </div>

      {ai && (
        <div className="mt-4">
          <Card title="AI Analysis (placeholder)" description={ai.model}>
            <p className="text-sm text-slate-600">{ai.summary}</p>
          </Card>
        </div>
      )}

      <Modal title={useMock ? 'Transfer custody (simulated)' : 'Transfer custody'} isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)}>
        {isTransferOpen && (
          <TransferForm
            evidenceId={evidenceItem.id}
            onCancel={() => setIsTransferOpen(false)}
            onDone={(event) => {
              setIsTransferOpen(false)
              setNotice(
                event?.event_type === 'CUSTODY_TRANSFER_REQUESTED'
                  ? `Transfer requested. Custody changes when ${event.to_user?.name ?? 'the recipient'} accepts.`
                  : useMock
                    ? 'Custody transfer simulated. A new event was added at the bottom of Custody History (no blockchain transaction was made).'
                    : 'Custody transferred. A new event was added at the bottom of Custody History.',
              )
              refresh()
            }}
          />
        )}
      </Modal>
    </div>
  )
}
