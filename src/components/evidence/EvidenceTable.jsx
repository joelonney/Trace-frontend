import { useNavigate } from 'react-router-dom'
import { Table } from '../common/Table'
import { StatusBadge } from '../common/StatusBadge'
import { formatDate } from '../../utils/formatters'
import { useUserDirectory } from '../../hooks/useUserDirectory'

const buildColumns = (nameOf) => [
  { key: 'id', header: 'Evidence ID' },
  { key: 'filename', header: 'Filename' },
  { key: 'file_type', header: 'Type' },
  { key: 'case_id', header: 'Case' },
  {
    key: 'current_custodian',
    header: 'Current Custodian',
    render: (row) => nameOf(row.current_custodian),
  },
  { key: 'status', header: 'Integrity Status', render: (row) => <StatusBadge value={row.status} /> },
  { key: 'upload_timestamp', header: 'Upload Date', render: (row) => formatDate(row.upload_timestamp) },
]

export const EvidenceTable = ({
  evidenceItems,
  isLoading,
  hideCaseColumn = false,
  getRowLink = (row) => `/evidence/${row.id}`,
}) => {
  const navigate = useNavigate()
  const nameOf = useUserDirectory()
  const all = buildColumns(nameOf)
  const columns = hideCaseColumn ? all.filter((c) => c.key !== 'case_id') : all

  return (
    <Table
      columns={columns}
      rows={evidenceItems}
      rowKey="id"
      isLoading={isLoading}
      emptyMessage="No evidence items found."
      onRowClick={(row) => navigate(getRowLink(row))}
    />
  )
}
