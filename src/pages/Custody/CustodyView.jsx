import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { getEvidenceById } from '../../api/evidence'
import { getCustodyEvents } from '../../api/custody'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { LoadingState } from '../../components/common/LoadingState'
import { EmptyState } from '../../components/common/EmptyState'
import { AccessDenied } from '../AccessDenied/AccessDenied'
import { CustodyTimeline } from '../../components/custody/CustodyTimeline'
import { useAsyncState } from '../../hooks/useAsyncState'

const LOADING = { status: 'loading', evidenceItem: null, events: [] }

export const CustodyView = () => {
  const { evidenceId } = useParams()
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const evidenceItem = await getEvidenceById(evidenceId)
      const events = await getCustodyEvents(evidenceId)
      return { status: 'ready', evidenceItem, events }
    } catch (err) {
      return { status: err.status === 403 ? 'denied' : 'error', evidenceItem: null, events: [] }
    }
  }, [evidenceId])
  const { state } = useAsyncState(load, LOADING)

  if (state.status === 'loading') {
    return <LoadingState label="Loading chain of custody…" />
  }

  if (state.status === 'denied') {
    return <AccessDenied message="You are not authorized to access this evidence item." />
  }

  if (state.status === 'error' || !state.evidenceItem) {
    return <EmptyState message={`Evidence ${evidenceId} could not be found.`} />
  }

  return (
    <div>
      <button
        onClick={() => navigate('/custody')}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3"
      >
        <ChevronLeft size={14} /> Back to Chain of Custody
      </button>

      <PageHeader
        title="Chain of Custody"
        description={`${state.evidenceItem.filename} · ${state.evidenceItem.id}`}
      />

      <Card>
        <CustodyTimeline events={state.events} />
      </Card>
    </div>
  )
}
