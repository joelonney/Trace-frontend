import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { getCases, createCase } from '../../api/cases'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { Alert } from '../../components/common/Alert'
import { useAuth } from '../../hooks/useAuth'
import { hasPermission, P } from '../../utils/permissions'
import { CASE_PRIORITY } from '../../constants/cases'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { CaseFilters } from '../../components/cases/CaseFilters'
import { CaseTable } from '../../components/cases/CaseTable'
import { useMock } from '../../api/mode'
import { codeOf } from '../../utils/ids'
import { errorMessage } from '../../utils/errors'

const EMPTY_FILTERS = { search: '', status: '', type: '', priority: '', investigator: '' }

const field = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-ink-700 focus:outline-none'

const NewCaseForm = ({ onCancel, onCreated }) => {
  const [form, setForm] = useState({ title: '', type: '', priority: 'MEDIUM', description: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      onCreated(await createCase(form))
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert variant="danger">{error}</Alert>}
      <div>
        <label htmlFor="n-title" className="block text-xs font-medium text-slate-600 mb-1">Title</label>
        <input id="n-title" className={field} value={form.title} onChange={set('title')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="n-type" className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <input id="n-type" className={field} value={form.type} onChange={set('type')} placeholder="e.g. Cybercrime" />
        </div>
        <div>
          <label htmlFor="n-pri" className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
          <select id="n-pri" className={field} value={form.priority} onChange={set('priority')}>
            {Object.values(CASE_PRIORITY).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="n-desc" className="block text-xs font-medium text-slate-600 mb-1">Description</label>
        <textarea id="n-desc" rows={3} className={field} value={form.description} onChange={set('description')} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create case'}</Button>
      </div>
    </form>
  )
}

export const CasesList = () => {
  const { user } = useAuth()
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [notice, setNotice] = useState(null)
  const [cases, setCases] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  useEffect(() => {
    getCases().then((data) => {
      setCases(data)
      setIsLoading(false)
    })
  }, [])

  const filterOptions = useMemo(
    () => ({
      statuses: [...new Set(cases.map((c) => c.status))],
      types: [...new Set(cases.map((c) => c.type))],
      priorities: [...new Set(cases.map((c) => c.priority))],
      investigators: [...new Set(cases.map((c) => c.investigator))],
    }),
    [cases],
  )

  const filteredCases = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return cases.filter((c) => {
      if (search) {
        const haystack = `${c.id} ${c.display_id ?? ''} ${c.title} ${c.investigator}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      if (filters.status && c.status !== filters.status) return false
      if (filters.type && c.type !== filters.type) return false
      if (filters.priority && c.priority !== filters.priority) return false
      if (filters.investigator && c.investigator !== filters.investigator) return false
      return true
    })
  }, [cases, filters])

  return (
    <div>
      <PageHeader
        title="Cases"
        description={
          hasPermission(user, P.CASES_VIEW_ALL) ? 'Browse and search all forensic cases.' : 'Cases assigned to you.'
        }
        action={
          hasPermission(user, P.CASES_CREATE) && (
            <Button icon={Plus} onClick={() => setIsNewOpen(true)}>New case</Button>
          )
        }
      />
      {notice && (
        <div className="mb-4">
          <Alert variant="success">{notice}</Alert>
        </div>
      )}
      <Modal title={useMock ? 'Create case (mock)' : 'Create case'} isOpen={isNewOpen} onClose={() => setIsNewOpen(false)}>
        {isNewOpen && (
          <NewCaseForm
            onCancel={() => setIsNewOpen(false)}
            onCreated={(created) => {
              setIsNewOpen(false)
              setNotice(
                useMock
                  ? `Case ${codeOf(created)} created in the mock environment (lost on reload).`
                  : `Case ${codeOf(created)} created.`,
              )
              getCases().then(setCases)
            }}
          />
        )}
      </Modal>
      <Card>
        <CaseFilters filters={filters} onChange={setFilters} options={filterOptions} />
        <CaseTable cases={filteredCases} isLoading={isLoading} />
      </Card>
    </div>
  )
}
