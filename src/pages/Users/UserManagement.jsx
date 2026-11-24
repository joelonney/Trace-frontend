import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, UserCheck, UserX } from 'lucide-react'
import { getUsers, createUser, updateUser, setUserStatus } from '../../api/auth'
import { ROLES, ROLE_LABELS, ORGANIZATIONS, USER_STATUS } from '../../constants/roles'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { Alert } from '../../components/common/Alert'
import { Table } from '../../components/common/Table'
import { StatusBadge } from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/useAuth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY_FORM = { name: '', email: '', role: ROLES.OFFICER, organization: ORGANIZATIONS[1], temporaryPassword: '' }
const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-ink-700 focus:outline-none'

const UserForm = ({ initial, isEdit, onSubmit, onCancel }) => {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.email.trim() || !form.organization.trim()) {
      return setError('Name, email and organization are required.')
    }
    if (!EMAIL_RE.test(form.email.trim())) return setError('Enter a valid email address.')
    if (!isEdit && form.temporaryPassword.length < 8) {
      return setError('Set a temporary demo password of at least 8 characters.')
    }
    setIsSaving(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err.message ?? 'Request failed.')
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Alert variant="danger">{error}</Alert>}
      {!isEdit && (
        <Alert variant="warning" title="Demo-only account">
          This creates an in-memory mock user. You must set a temporary password yourself; it is held
          only in browser memory, is not secure, and the account disappears on page reload.
        </Alert>
      )}
      <div>
        <label htmlFor="u-name" className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
        <input id="u-name" className={inputClass} value={form.name} onChange={set('name')} />
      </div>
      <div>
        <label htmlFor="u-email" className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input id="u-email" type="email" className={inputClass} value={form.email} onChange={set('email')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="u-role" className="block text-xs font-medium text-slate-600 mb-1">Role</label>
          <select id="u-role" className={inputClass} value={form.role} onChange={set('role')}>
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]} ({r})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="u-org" className="block text-xs font-medium text-slate-600 mb-1">Organization</label>
          <input id="u-org" list="org-options" className={inputClass} value={form.organization} onChange={set('organization')} />
          <datalist id="org-options">
            {ORGANIZATIONS.map((o) => <option key={o} value={o} />)}
          </datalist>
        </div>
      </div>
      {!isEdit && (
        <div>
          <label htmlFor="u-pass" className="block text-xs font-medium text-slate-600 mb-1">
            Temporary demo password
          </label>
          <input id="u-pass" type="password" autoComplete="new-password" className={inputClass} value={form.temporaryPassword} onChange={set('temporaryPassword')} />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}</Button>
      </div>
    </form>
  )
}

export const UserManagement = () => {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null) // { mode: 'create' } | { mode: 'edit', user }
  const [notice, setNotice] = useState(null) // { variant, text }

  const load = useCallback(() => getUsers().then((d) => { setUsers(d); setIsLoading(false) }), [])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) =>
      (!q || `${u.name} ${u.email} ${u.organization}`.toLowerCase().includes(q)) &&
      (!roleFilter || u.role === roleFilter) &&
      (!statusFilter || u.status === statusFilter),
    )
  }, [users, search, roleFilter, statusFilter])

  const handleSave = async (form) => {
    if (modal.mode === 'create') {
      const created = await createUser(form)
      setNotice({ variant: 'success', text: `Mock user ${created.name} created (in memory only; resets on reload).` })
    } else {
      await updateUser(modal.user.id, form)
      setNotice({ variant: 'success', text: `${form.name} updated.` })
    }
    setModal(null)
    await load()
  }

  const toggleStatus = async (u) => {
    const next = u.status === USER_STATUS.ACTIVE ? USER_STATUS.INACTIVE : USER_STATUS.ACTIVE
    try {
      await setUserStatus(u.id, next)
      setNotice({ variant: 'success', text: `${u.name} ${next === USER_STATUS.ACTIVE ? 'activated' : 'deactivated'}.` })
      await load()
    } catch (err) {
      setNotice({ variant: 'danger', text: err.message })
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (u) => ROLE_LABELS[u.role] },
    { key: 'organization', header: 'Organization' },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge value={u.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setModal({ mode: 'edit', user: u })}>Edit</Button>
          {u.id === me.id ? (
            <span className="self-center text-xs text-slate-400">(you)</span>
          ) : (
            <Button size="sm" variant="ghost" icon={u.status === 'ACTIVE' ? UserX : UserCheck} onClick={() => toggleStatus(u)}>
              {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Mock users for the local demonstration. Changes live in memory only."
        action={<Button icon={Plus} onClick={() => setModal({ mode: 'create' })}>Create user</Button>}
      />

      {notice && (
        <div className="mb-4"><Alert variant={notice.variant}>{notice.text}</Alert></div>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or organization…"
              aria-label="Search users"
              className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-sm focus:border-ink-700 focus:outline-none"
            />
          </div>
          <select aria-label="Filter by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm">
            <option value="">All roles</option>
            {Object.values(ROLES).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <Table columns={columns} rows={filtered} rowKey="id" isLoading={isLoading} emptyMessage="No users match your filters." />
      </Card>

      <Modal title={modal?.mode === 'edit' ? 'Edit user' : 'Create mock user'} isOpen={Boolean(modal)} onClose={() => setModal(null)}>
        {modal && (
          <UserForm
            key={modal.user?.id ?? 'new'}
            isEdit={modal.mode === 'edit'}
            initial={modal.mode === 'edit' ? { ...modal.user, temporaryPassword: '' } : EMPTY_FORM}
            onSubmit={handleSave}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  )
}
