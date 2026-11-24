import { LoadingState } from './LoadingState'
import { EmptyState } from './EmptyState'

export const Table = ({ columns, rows, rowKey, isLoading, emptyMessage = 'No records found.', onRowClick }) => {
  if (isLoading) {
    return <LoadingState label="Loading records…" />
  }

  if (!rows || rows.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="overflow-x-auto -mx-5">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {columns.map((col) => (
              <th key={col.key} className="px-5 py-2 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={row[rowKey]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-5 py-3 align-middle text-slate-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
