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
import { codeOf, named, statusOf } from '../../utils/ids'

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
      return { status: statusOf(err), message: err.message, evidenceItem: null, events: [] }
    }
  }, [evidenceId])
  const { state } = useAsyncState(load, LOADING)

  if (state.status === 'loading') {
    return <LoadingState label="Loading chain of custody…" />
  }

  if (state.status === 'denied') {
    return <AccessDenied message="You are not authorized to access this evidence item." />
  }

  if (state.status === 'notfound') {
    return <EmptyState message={`${named('Evidence', evidenceId)} could not be found, or you do not have access to it.`} />
  }

  if (state.status === 'error' || !state.evidenceItem) {
    return <EmptyState message={`Could not load the chain of custody${state.message ? `: ${state.message}` : '.'}`} />
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
        description={`${state.evidenceItem.filename} · ${codeOf(state.evidenceItem)}`}
      />

      <Card>
        <CustodyTimeline events={state.events} />
      </Card>
    </div>
  )
}
