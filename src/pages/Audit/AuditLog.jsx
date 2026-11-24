import { useEffect, useState } from 'react'
import { getAuditLog } from '../../api/auth'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Alert } from '../../components/common/Alert'
import { Table } from '../../components/common/Table'
import { formatDateTime, titleCase } from '../../utils/formatters'
import { useMock } from '../../api/mode'

const COLUMNS = [
  { key: 'timestamp', header: 'Time', render: (r) => formatDateTime(r.timestamp) },
  { key: 'actor_name', header: 'Actor' },
  { key: 'action', header: 'Action', render: (r) => titleCase(r.action) },
  { key: 'target', header: 'Target' },
  { key: 'detail', header: 'Detail' },
]

export const AuditLog = () => {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getAuditLog().then((d) => { setRows(d); setIsLoading(false) })
  }, [])

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description={useMock ? 'System activity recorded during this demo session.' : 'System activity recorded by the backend, newest first.'}
      />
      {useMock && (
        <div className="mb-4">
          <Alert variant="info" title="Session-only mock audit trail">
            Entries are held in browser memory and cleared on reload. This is not the tamper-evident,
            on-chain audit trail the production system will provide.
          </Alert>
        </div>
      )}
      <Card>
        <Table columns={COLUMNS} rows={rows} rowKey="id" isLoading={isLoading} emptyMessage={useMock ? 'No activity recorded yet this session.' : 'No activity recorded yet.'} />
      </Card>
    </div>
  )
}
