import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventCard } from '../components/EventCard'
import { DateFilter } from '../components/DateFilter'
import { LiveIndicator } from '../components/LiveIndicator'
import { ArrowLeftIcon, SidebarToggleIcon } from '../components/icons'
import { useCompetitionContext } from '../state/competitionContext'
import { eventDayKey, formatDayLabel } from '../domain/dates'
import type { FinalEvent } from '../domain/model'

/**
 * The finals whose medals have been handed out (plan §5.3). They are off the
 * board entirely, so the In ceremonies section only ever holds what is still
 * to be presented. Every card carries Return to ceremonies, because the whole
 * risk of a one-tap "done" button is tapping it on the wrong event.
 */
export function PresentedScreen() {
  const navigate = useNavigate()
  const {
    competition,
    meetingId,
    sidebarOpen,
    setSidebarOpen,
    days,
    selectedDays,
    toggleDay,
    clearDays,
    visibleFinals,
  } = useCompetitionContext()
  const { colours, loading, stale, lastUpdated, details, returnToCeremonies } =
    competition

  const presented = useMemo(
    () => visibleFinals.filter((f) => colours.get(f.meId) === 'blue'),
    [visibleFinals, colours],
  )

  // Grouped by competition day, as the Not started page is.
  const byDay = useMemo(() => {
    const groups = new Map<string, FinalEvent[]>()
    for (const f of presented) {
      const key = eventDayKey(f.startDateTime, details?.tz) ?? 'unscheduled'
      const list = groups.get(key) ?? []
      list.push(f)
      groups.set(key, list)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [presented, details?.tz])

  return (
    <div className="main">
      <header className="topbar">
        <button
          className="icon-button"
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <SidebarToggleIcon />
        </button>
        <button
          className="icon-button"
          aria-label="Back to all finals"
          onClick={() => navigate(`/c/${meetingId}`)}
        >
          <ArrowLeftIcon />
        </button>
        <div className="event__title">
          <h1 className="event__name">Presented</h1>
          <span className="event__meta">
            {details?.meetingName ?? `Competition ${meetingId}`}
          </span>
        </div>
        <div className="topbar__right">
          <DateFilter
            days={days}
            selected={selectedDays}
            onToggle={toggleDay}
            onClear={clearDays}
          />
          <span className="pill num">{presented.length} finals</span>
          <LiveIndicator lastUpdated={lastUpdated} stale={stale} />
        </div>
      </header>

      <div className="page">
        {presented.length === 0 && (
          <div className="notice">
            {loading
              ? 'Loading finals…'
              : selectedDays.size > 0
                ? 'No finals presented on the selected dates'
                : 'Nothing presented yet — finish an event from its own page and it lands here'}
          </div>
        )}

        {byDay.map(([day, events]) => (
          <section className="daygroup daygroup--blue" key={day}>
            <div className="daygroup__head">
              <span className="sect__dot" />
              <h2 className="sect__title num">
                {day === 'unscheduled' ? 'Time to be confirmed' : formatDayLabel(day)}
              </h2>
              <span className="sect__count">{events.length}</span>
            </div>
            <div className="daygroup__cards">
              {events.map((f) => (
                <EventCard
                  key={f.meId}
                  event={f}
                  colour="blue"
                  onReturnToCeremonies={() => returnToCeremonies(f.meId)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
