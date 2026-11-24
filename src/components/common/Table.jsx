import { LoadingState } from './LoadingState'
import { EmptyState } from './EmptyState'

// Column options: `nowrap` keeps short values (IDs, badges, dates) on one line; `mono` renders IDs
// in a monospace face so they scan and align better.
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
          <tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
            {columns.map((col) => (
              <th key={col.key} className="px-5 py-2.5 font-semibold whitespace-nowrap">
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
              className={onRowClick ? 'cursor-pointer transition-colors hover:bg-accent-50/60' : ''}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-3 align-middle text-slate-700 ${col.nowrap ? 'whitespace-nowrap' : ''} ${
                    col.mono ? 'font-mono text-xs text-slate-600' : ''
                  }`}
                >
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
