import { useNavigate } from 'react-router-dom'
import type { FinalEvent } from '../domain/model'
import type { StatusColour } from '../domain/status'

const DOTS: Record<StatusColour, string> = {
  red: '🔴',
  orange: '🟠',
  yellow: '🟡',
  green: '🟢',
  pink: '🩷',
}

interface Props {
  event: FinalEvent
  colour: StatusColour
  onPromote?: () => void
  onDemote?: () => void
}

/**
 * Event card (plan §5): the event name worded exactly as Roster words it —
 * "Discus Throw (2kg) · Final" with the label/gender/age-group line under it.
 */
export function EventCard({ event, colour, onPromote, onDemote }: Props) {
  const navigate = useNavigate()
  return (
    <div
      className={`event-card event-card--${colour}`}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/event/${event.meId}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/event/${event.meId}`)}
    >
      <div className="event-card__name">
        {event.name} · Final
      </div>
      <div className="event-card__meta">
        {DOTS[colour]}{' '}
        {[event.label, event.gender, event.ageGroup].filter(Boolean).join(' · ')}
      </div>
      {colour === 'green' && onPromote && (
        <button
          className="event-card__action"
          onClick={(e) => {
            e.stopPropagation()
            onPromote()
          }}
        >
          Send to ceremonies →
        </button>
      )}
      {colour === 'pink' && onDemote && (
        <button
          className="event-card__action event-card__action--undo"
          onClick={(e) => {
            e.stopPropagation()
            onDemote()
          }}
        >
          ← Return to ready
        </button>
      )}
    </div>
  )
}
