import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { getIncomingTransfers, acceptTransfer, rejectTransfer } from '../../api/custody'
import { getEvidence } from '../../api/evidence'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Table } from '../../components/common/Table'
import { Button } from '../../components/common/Button'
import { Alert } from '../../components/common/Alert'
import { useAsyncState } from '../../hooks/useAsyncState'
import { useMock } from '../../api/mode'
import { formatDateTime } from '../../utils/formatters'
import { codeOf } from '../../utils/ids'
import { errorMessage } from '../../utils/errors'

const LOADING = { status: 'loading', transfers: [], evidenceById: {} }

// Custody transfers are two-step: the current custodian offers, and the recipient must accept
// before custody changes (and the ledger is written). This page is the recipient's inbox.
export const Transfers = () => {
  const [notice, setNotice] = useState(null) // { variant, text }
  const [busyId, setBusyId] = useState(null)
  const [confirmRejectId, setConfirmRejectId] = useState(null)

  const load = useCallback(async () => {
    try {
      const [transfers, evidenceItems] = await Promise.all([getIncomingTransfers(), getEvidence()])
      return {
        status: 'ready',
        transfers,
        evidenceById: Object.fromEntries(evidenceItems.map((e) => [e.id, e])),
      }
    } catch (err) {
      return { status: 'error', message: errorMessage(err), transfers: [], evidenceById: {} }
    }
  }, [])
  const { state, refresh } = useAsyncState(load, LOADING)

  const decide = async (transfer, accept) => {
    setNotice(null)
    setBusyId(transfer.id)
    try {
      await (accept ? acceptTransfer(transfer.id) : rejectTransfer(transfer.id))
      const evidenceItem = state.evidenceById[transfer.evidence_id]
      const label = evidenceItem ? codeOf(evidenceItem) : 'the evidence'
      setNotice({
        variant: 'success',
        text: accept ? `You now hold ${label}. The custody change was recorded.` : `Transfer of ${label} rejected.`,
      })
      await refresh()
    } catch (err) {
      setNotice({ variant: 'danger', text: errorMessage(err) })
    } finally {
      setBusyId(null)
      setConfirmRejectId(null)
    }
  }

  const columns = [
    {
      key: 'evidence',
      header: 'Evidence',
      render: (t) => {
        const e = state.evidenceById[t.evidence_id]
        return (
          <Link to={`/evidence/${t.evidence_id}`} className="text-ink-900 hover:underline">
            <span className="font-mono text-xs">{e ? codeOf(e) : t.evidence_id}</span>
            {e ? <span className="block text-xs text-slate-500">{e.filename}</span> : null}
          </Link>
        )
      },
    },
    { key: 'from', header: 'From (custodian)', nowrap: true, render: (t) => t.from_user?.name ?? '—' },
    { key: 'reason', header: 'Reason' },
    { key: 'requested_at', header: 'Requested', nowrap: true, render: (t) => formatDateTime(t.requested_at) },
    {
      key: 'actions',
      header: 'Actions',
      nowrap: true,
      render: (t) =>
        confirmRejectId === t.id ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Reject this transfer?</span>
            <Button size="sm" variant="danger" disabled={busyId === t.id} onClick={() => decide(t, false)}>
              Confirm reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmRejectId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Button size="sm" icon={Check} disabled={busyId === t.id} onClick={() => decide(t, true)}>
              Accept
            </Button>
            <Button size="sm" variant="secondary" icon={X} disabled={busyId === t.id} onClick={() => setConfirmRejectId(t.id)}>
              Reject
            </Button>
          </div>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Incoming transfers"
        description="Custody transfers offered to you. Custody only changes when you accept."
      />

      {useMock && (
        <div className="mb-4">
          <Alert variant="info" title="Not used in mock mode">
            Mock transfers are immediate, so nothing ever waits for approval. This page lists real
            offers when the app runs against the API.
          </Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Alert variant={notice.variant}>{notice.text}</Alert>
        </div>
      )}
      {state.status === 'error' && (
        <div className="mb-4">
          <Alert variant="danger">Could not load transfers: {state.message}</Alert>
        </div>
      )}

      <Card>
        <Table
          columns={columns}
          rows={state.transfers}
          rowKey="id"
          isLoading={state.status === 'loading'}
          emptyMessage="No transfers are waiting for you."
        />
      </Card>
    </div>
  )
}
