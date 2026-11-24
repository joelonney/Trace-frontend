import { useCallback, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { getCaseById, updateCase, registerCaseDocument, removeCaseDocument } from '../../api/cases'
import { getEvidenceByCaseId } from '../../api/evidence'
import { getCustodyEvents } from '../../api/custody'
import { getReportsByCaseId } from '../../api/reports'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Tabs } from '../../components/common/Tabs'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/common/LoadingState'
import { EmptyState } from '../../components/common/EmptyState'
import { Alert } from '../../components/common/Alert'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { AccessDenied } from '../AccessDenied/AccessDenied'
import { useAuth } from '../../hooks/useAuth'
import { hasPermission, canUpdateCase, P } from '../../utils/permissions'
import { CASE_STATUS, CASE_PRIORITY } from '../../constants/cases'
import { EvidenceTable } from '../../components/evidence/EvidenceTable'
import { CustodyTimeline } from '../../components/custody/CustodyTimeline'
import { formatDate, formatDateTime } from '../../utils/formatters'
import { useAsyncState } from '../../hooks/useAsyncState'

const LOADING = { status: 'loading', data: null }

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'custody', label: 'Chain of Custody' },
  { key: 'documents', label: 'Documents' },
  { key: 'reports', label: 'Reports' },
]

const field = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-ink-700 focus:outline-none'

const CaseEditForm = ({ caseItem, onCancel, onSaved }) => {
  const [form, setForm] = useState({
    title: caseItem.title,
    status: caseItem.status,
    priority: caseItem.priority,
    description: caseItem.description,
  })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateCase(caseItem.id, form)
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert variant="danger">{error}</Alert>}
      <div>
        <label htmlFor="c-title" className="block text-xs font-medium text-slate-600 mb-1">Title</label>
        <input id="c-title" className={field} value={form.title} onChange={set('title')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="c-status" className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select id="c-status" className={field} value={form.status} onChange={set('status')}>
            {Object.values(CASE_STATUS).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="c-pri" className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
          <select id="c-pri" className={field} value={form.priority} onChange={set('priority')}>
            {Object.values(CASE_PRIORITY).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="c-desc" className="block text-xs font-medium text-slate-600 mb-1">Description</label>
        <textarea id="c-desc" rows={4} className={field} value={form.description} onChange={set('description')} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  )
}

const DocumentForm = ({ caseId, onCancel, onSaved }) => {
  const [form, setForm] = useState({ title: '', note: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await registerCaseDocument(caseId, form)
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert variant="info">
        Registers document metadata only. No file is uploaded, and this is not evidence registration.
      </Alert>
      {error && <Alert variant="danger">{error}</Alert>}
      <div>
        <label htmlFor="d-title" className="block text-xs font-medium text-slate-600 mb-1">Document title</label>
        <input id="d-title" className={field} value={form.title} onChange={set('title')} />
      </div>
      <div>
        <label htmlFor="d-note" className="block text-xs font-medium text-slate-600 mb-1">Note (optional)</label>
        <input id="d-note" className={field} value={form.note} onChange={set('note')} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Register'}</Button>
      </div>
    </form>
  )
}

export const CaseDetails = () => {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const { user } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [docOpen, setDocOpen] = useState(false)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(async () => {
    try {
      const caseItem = await getCaseById(caseId)
      const [evidenceItems, reports] = await Promise.all([
        getEvidenceByCaseId(caseId),
        getReportsByCaseId(caseId),
      ])
      const custodyLists = await Promise.all(evidenceItems.map((e) => getCustodyEvents(e.id)))
      return {
        status: 'ready',
        data: { caseItem, evidenceItems, reports, custodyEvents: custodyLists.flat() },
      }
    } catch (err) {
      return { status: err.status === 403 ? 'denied' : 'error', data: null }
    }
  }, [caseId])

  const { state, refresh } = useAsyncState(load, LOADING)

  const timelineItems = useMemo(() => {
    if (!state.data) return []
    const { caseItem, custodyEvents, reports } = state.data

    const caseOpenedEvent = {
      id: `${caseItem.id}-opened`,
      event_type: 'CASE_OPENED',
      actor: caseItem.investigator,
      organization: caseItem.organization,
      timestamp: `${caseItem.opened_date}T00:00:00Z`,
      reason: caseItem.description,
      status: 'COMPLETED',
      transaction_id: null,
    }

    const reportEvents = reports.map((r) => ({
      id: r.id,
      event_type: 'REPORT_GENERATED',
      actor: r.author,
      organization: caseItem.organization,
      timestamp: r.generated_at,
      reason: r.title,
      status: r.status,
      transaction_id: null,
    }))

    return [caseOpenedEvent, ...custodyEvents, ...reportEvents].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    )
  }, [state.data])

  if (state.status === 'loading') {
    return <LoadingState label="Loading case…" />
  }

  if (state.status === 'denied') {
    return <AccessDenied message="You are not assigned to this case." />
  }

  if (state.status === 'error' || !state.data) {
    return <EmptyState message={`Case ${caseId} could not be found.`} />
  }

  const { caseItem, evidenceItems, reports, custodyEvents } = state.data
  const documents = evidenceItems.filter((e) => e.file_type === 'Document')

  return (
    <div>
      <button
        onClick={() => navigate('/cases')}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3"
      >
        <ChevronLeft size={14} /> Back to Cases
      </button>

      <PageHeader
        title={caseItem.title}
        description={`${caseItem.id} · ${caseItem.type}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge value={caseItem.status} />
            <StatusBadge value={caseItem.priority} />
            {canUpdateCase(user, caseItem) && (
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>
                Edit case
              </Button>
            )}
          </div>
        }
      />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <Card title="Case Overview">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Investigator</dt>
              <dd className="text-slate-800">{caseItem.investigator}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Organization</dt>
              <dd className="text-slate-800">{caseItem.organization}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Opened</dt>
              <dd className="text-slate-800">{formatDate(caseItem.opened_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Evidence Items</dt>
              <dd className="text-slate-800">{evidenceItems.length}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Description</dt>
              <dd className="text-slate-800 mt-0.5">{caseItem.description}</dd>
            </div>
          </dl>
        </Card>
      )}

      {activeTab === 'evidence' && (
        <Card title="Case Evidence">
          <EvidenceTable evidenceItems={evidenceItems} hideCaseColumn />
        </Card>
      )}

      {activeTab === 'timeline' && (
        <Card title="Case Timeline">
          <CustodyTimeline events={timelineItems} />
        </Card>
      )}

      {activeTab === 'custody' && (
        <Card title="Chain of Custody" description="Custody events across all evidence in this case.">
          <CustodyTimeline events={custodyEvents} />
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card
          title="Documents"
          action={
            hasPermission(user, P.DOCUMENTS_MANAGE) && (
              <Button size="sm" icon={Plus} onClick={() => setDocOpen(true)}>
                Register document
              </Button>
            )
          }
        >
          {actionError && (
            <div className="mb-3">
              <Alert variant="danger">{actionError}</Alert>
            </div>
          )}
          {(caseItem.documents ?? []).length > 0 && (
            <ul className="divide-y divide-slate-100 mb-4">
              {caseItem.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <FileText size={16} className="text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{d.title}</p>
                    <p className="text-xs text-slate-500">
                      {d.added_by} · {formatDateTime(d.added_at)}
                      {d.note ? ` · ${d.note}` : ''} · metadata only (mock)
                    </p>
                  </div>
                  {hasPermission(user, P.DOCUMENTS_MANAGE) && (
                    <button
                      aria-label={`Remove ${d.title}`}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      onClick={async () => {
                        try {
                          await removeCaseDocument(caseItem.id, d.id)
                          refresh()
                        } catch (err) {
                          setActionError(err.message)
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {documents.length === 0 && (caseItem.documents ?? []).length === 0 && (
            <EmptyState message="No documents attached to this case." />
          )}
          {documents.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <Link
                    to={`/evidence/${doc.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-1 px-1 rounded"
                  >
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.filename}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(doc.upload_timestamp)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card title="Reports">
          {reports.length === 0 ? (
            <EmptyState message="No reports have been generated for this case yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {reports.map((report) => (
                <li key={report.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{report.title}</p>
                    <p className="text-xs text-slate-500">
                      {report.author} · {formatDateTime(report.generated_at)}
                    </p>
                  </div>
                  <StatusBadge value={report.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Modal title="Edit case" isOpen={editOpen} onClose={() => setEditOpen(false)}>
        {editOpen && (
          <CaseEditForm
            caseItem={caseItem}
            onCancel={() => setEditOpen(false)}
            onSaved={() => {
              setEditOpen(false)
              refresh()
            }}
          />
        )}
      </Modal>
      <Modal title="Register case document" isOpen={docOpen} onClose={() => setDocOpen(false)}>
        {docOpen && (
          <DocumentForm
            caseId={caseItem.id}
            onCancel={() => setDocOpen(false)}
            onSaved={() => {
              setDocOpen(false)
              refresh()
            }}
          />
        )}
      </Modal>

      {activeTab === 'overview' && (
        <div className="mt-4">
          <Alert variant="info">
            Case data shown here is synthetic and served from local mock data. Documents and Reports
            reflect the mocked evidence/report records above — real report generation is not yet
            implemented.
          </Alert>
        </div>
      )}
    </div>
  )
}
