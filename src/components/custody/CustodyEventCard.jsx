import { StatusBadge } from '../common/StatusBadge'
import { formatDateTime, titleCase } from '../../utils/formatters'

export const CustodyEventCard = ({ event, isLast }) => (
  <div className="relative pl-8 pb-6">
    {!isLast && <span className="absolute left-[7px] top-3 bottom-0 w-px bg-slate-200" />}
    <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-ink-900 bg-white" />

    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-slate-900">{titleCase(event.event_type)}</p>
      <StatusBadge value={event.status} />
    </div>
    <p className="text-xs text-slate-500 mt-0.5">
      {event.actor} · {event.organization}
    </p>
    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(event.timestamp)}</p>
    {event.reason && <p className="text-sm text-slate-600 mt-1.5">{event.reason}</p>}
    {event.transaction_id && (
      <p className="text-xs font-mono text-slate-400 mt-1.5">Ref: {event.transaction_id}</p>
    )}
  </div>
)
