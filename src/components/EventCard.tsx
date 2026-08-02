import { useNavigate } from 'react-router-dom'
import type { FinalEvent } from '../domain/model'
import type { StatusColour } from '../domain/status'

interface Props {
  event: FinalEvent
  colour: StatusColour
  onPromote?: () => void
  onDemote?: () => void
}

/**
 * Event card (plan §5): the event name worded as Roster words it, with the
 * gender and age group underneath. The quadrant already carries the colour,
 * so the card doesn't repeat it.
 */
export function EventCard({ event, colour, onPromote, onDemote }: Props) {
  const navigate = useNavigate()
  const open = () => navigate(`/c/${event.meetingId}/event/${event.meId}`)
  return (
    <div
      className={`event-card event-card--${colour}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
    >
      <div className="event-card__name">{event.name} · Final</div>
      <div className="event-card__meta">
        {[event.gender, event.ageGroup].filter(Boolean).join(' · ')}
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
