import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileBarChart2 } from 'lucide-react'
import { Plus } from 'lucide-react'
import { getReports, createDraftReport } from '../../api/reports'
import { getCases } from '../../api/cases'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { Alert } from '../../components/common/Alert'
import { useAuth } from '../../hooks/useAuth'
import { hasPermission, P } from '../../utils/permissions'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/common/LoadingState'
import { EmptyState } from '../../components/common/EmptyState'
import { formatDateTime } from '../../utils/formatters'

const field = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-ink-700 focus:outline-none'

const DraftForm = ({ cases, onCancel, onCreated }) => {
  const [form, setForm] = useState({ caseId: cases[0]?.id ?? '', title: '', summary: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await createDraftReport(form)
      onCreated()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert variant="info">Creates a draft report record only — no document is generated.</Alert>
      {error && <Alert variant="danger">{error}</Alert>}
      <div>
        <label htmlFor="r-case" className="block text-xs font-medium text-slate-600 mb-1">Case</label>
        <select id="r-case" className={field} value={form.caseId} onChange={set('caseId')}>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>{c.id} — {c.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="r-title" className="block text-xs font-medium text-slate-600 mb-1">Title</label>
        <input id="r-title" className={field} value={form.title} onChange={set('title')} />
      </div>
      <div>
        <label htmlFor="r-sum" className="block text-xs font-medium text-slate-600 mb-1">Summary</label>
        <textarea id="r-sum" rows={3} className={field} value={form.summary} onChange={set('summary')} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create draft'}</Button>
      </div>
    </form>
  )
}

export const Reports = () => {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [isDraftOpen, setIsDraftOpen] = useState(false)
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const load = () =>
    getReports().then((data) => {
      setReports(data)
      setIsLoading(false)
    })
  const canCreate = hasPermission(user, P.REPORTS_CREATE)

  useEffect(() => {
    load()
    if (canCreate) getCases().then(setCases)
  }, [canCreate])

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Case reports for cases you can access."
        action={
          canCreate && (
            <Button icon={Plus} onClick={() => setIsDraftOpen(true)} disabled={cases.length === 0}>
              New draft report
            </Button>
          )
        }
      />
      <Modal title="New draft report" isOpen={isDraftOpen} onClose={() => setIsDraftOpen(false)}>
        {isDraftOpen && (
          <DraftForm
            cases={cases}
            onCancel={() => setIsDraftOpen(false)}
            onCreated={() => {
              setIsDraftOpen(false)
              load()
            }}
          />
        )}
      </Modal>
      <Card>
        {isLoading ? (
          <LoadingState label="Loading reports…" />
        ) : reports.length === 0 ? (
          <EmptyState message="No reports have been generated yet." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {reports.map((report) => (
              <li key={report.id}>
                <Link
                  to={`/cases/${report.case_id}`}
                  className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-1 px-1 rounded"
                >
                  <FileBarChart2 size={18} className="text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{report.title}</p>
                    <p className="text-xs text-slate-500">
                      {report.case_id} · {report.author} · {formatDateTime(report.generated_at)}
                    </p>
                  </div>
                  <StatusBadge value={report.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
