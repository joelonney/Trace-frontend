import { useNavigate } from 'react-router-dom'
import { Table } from '../common/Table'
import { StatusBadge } from '../common/StatusBadge'
import { formatDate } from '../../utils/formatters'

const COLUMNS = [
  { key: 'id', header: 'Case ID' },
  { key: 'title', header: 'Title' },
  { key: 'type', header: 'Type' },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
  { key: 'priority', header: 'Priority', render: (row) => <StatusBadge value={row.priority} /> },
  { key: 'investigator', header: 'Investigator' },
  { key: 'opened_date', header: 'Opened', render: (row) => formatDate(row.opened_date) },
]

export const CaseTable = ({ cases, isLoading }) => {
  const navigate = useNavigate()

  return (
    <Table
      columns={COLUMNS}
      rows={cases}
      rowKey="id"
      isLoading={isLoading}
      emptyMessage="No cases match your filters."
      onRowClick={(row) => navigate(`/cases/${row.id}`)}
    />
  )
}
