import { useCallback, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { getEvidence } from '../../api/evidence'
import { getCases } from '../../api/cases'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { Alert } from '../../components/common/Alert'
import { EvidenceTable } from '../../components/evidence/EvidenceTable'
import { EvidenceUploadForm } from '../../components/evidence/EvidenceUploadForm'
import { useAuth } from '../../hooks/useAuth'
import { useAsyncState } from '../../hooks/useAsyncState'
import { hasPermission, P } from '../../utils/permissions'

const LOADING = { status: 'loading', items: [], cases: [] }

export const EvidenceList = () => {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(null)

  const load = useCallback(async () => {
    try {
      const [items, cases] = await Promise.all([getEvidence(), getCases()])
      return { status: 'ready', items, cases }
    } catch (err) {
      return { status: 'error', items: [], cases: [], message: err.message }
    }
  }, [])
  const { state, setState } = useAsyncState(load, LOADING)

  const filteredEvidence = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return state.items
    return state.items.filter((e) =>
      `${e.id} ${e.filename} ${e.case_id}`.toLowerCase().includes(q),
    )
  }, [state.items, search])

  const handleUploaded = (newItem) => {
    setState({ ...state, items: [newItem, ...state.items] })
    setIsUploadOpen(false)
    setUploadSuccess(newItem)
  }

  return (
    <div>
      <PageHeader
        title="Evidence"
        description="All evidence items across cases."
        action={
          hasPermission(user, P.EVIDENCE_UPLOAD) && (
            <Button icon={Plus} onClick={() => setIsUploadOpen(true)}>
              Upload Evidence
            </Button>
          )
        }
      />

      {uploadSuccess && (
        <div className="mb-4">
          <Alert variant="success" title="Evidence registered (mock environment)">
            {uploadSuccess.filename} was registered as {uploadSuccess.id} in the in-memory mock data.
            Its SHA-256 was calculated locally in your browser; the file was not uploaded, stored or
            recorded on a blockchain, and this record will be lost on page reload. Integrity status is
            pending verification.
          </Alert>
        </div>
      )}

      {state.status === 'error' && (
        <div className="mb-4">
          <Alert variant="danger">Could not load evidence: {state.message}</Alert>
        </div>
      )}

      <Card>
        <div className="relative mb-4 max-w-sm">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, filename, or case…"
            className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-sm text-slate-700 focus:border-ink-700 focus:outline-none"
          />
        </div>
        <EvidenceTable evidenceItems={filteredEvidence} isLoading={state.status === 'loading'} />
      </Card>

      <Modal title="Upload Evidence" isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)}>
        <EvidenceUploadForm cases={state.cases} onUploaded={handleUploaded} onCancel={() => setIsUploadOpen(false)} />
      </Modal>
    </div>
  )
}
