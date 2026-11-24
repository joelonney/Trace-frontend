import { EmptyState } from '../common/EmptyState'
import { CustodyEventCard } from './CustodyEventCard'

export const CustodyTimeline = ({ events }) => {
  if (!events || events.length === 0) {
    return <EmptyState message="No custody events recorded for this evidence yet." />
  }

  return (
    <div>
      {events.map((event, index) => (
        <CustodyEventCard key={event.id} event={event} isLast={index === events.length - 1} />
      ))}
    </div>
  )
}
