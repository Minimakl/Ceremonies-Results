import { useNavigate } from 'react-router-dom'
import type { FinalEvent } from '../domain/model'
import type { StatusColour } from '../domain/status'
import { ArrowLeftIcon, ArrowRightIcon } from './icons'
import { GenderMeta } from './GenderMeta'
import { eventWallTime } from '../domain/dates'

interface Props {
  event: FinalEvent
  colour: StatusColour
  /** Venue timezone, for the scheduled start time on the card's left. */
  tz?: string
  onPromote?: () => void
  onDemote?: () => void
  onReturnToCeremonies?: () => void
}

/**
 * Event card (plan §5): the event name worded as Roster words it, with the
 * gender and age group underneath. The panel already carries the colour, so
 * the card states it only as an accent rail.
 */
export function EventCard({
  event,
  colour,
  tz,
  onPromote,
  onDemote,
  onReturnToCeremonies,
}: Props) {
  const navigate = useNavigate()
  const open = () => navigate(`/c/${event.meetingId}/event/${event.meId}`)
  return (
    <div
      className={`card card--${colour}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
    >
      {/* Scheduled start, venue time, as Roster's schedule shows it. Hidden
          when Roster hides the time rather than showing a wrong one. */}
      {event.timePubliclyVisible && (
        <div className="card__time num">
          {eventWallTime(event.startDateTime, tz)}
        </div>
      )}
      <div className="card__body">
        <div className="card__name">{event.name} · {event.stageLabel}</div>
        <div className="card__meta">
          <GenderMeta event={event} />
        </div>

      {colour === 'green' && onPromote && (
        <button
          className="card__action"
          onClick={(e) => {
            e.stopPropagation()
            onPromote()
          }}
        >
          Send to ceremonies
          <ArrowRightIcon size={14} />
        </button>
      )}
      {colour === 'pink' && onDemote && (
        <button
          className="card__action card__action--ghost"
          onClick={(e) => {
            e.stopPropagation()
            onDemote()
          }}
        >
          <ArrowLeftIcon size={14} />
          Return to ready
        </button>
      )}
      {colour === 'blue' && onReturnToCeremonies && (
        <button
          className="card__action card__action--ghost"
          onClick={(e) => {
            e.stopPropagation()
            onReturnToCeremonies()
          }}
        >
          <ArrowLeftIcon size={14} />
          Return to ceremonies
        </button>
      )}
      </div>
    </div>
  )
}
