import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventCard } from '../components/EventCard'
import { DateFilter } from '../components/DateFilter'
import { LiveIndicator } from '../components/LiveIndicator'
import { ArrowLeftIcon, SidebarToggleIcon } from '../components/icons'
import { useCompetitionContext } from '../state/competitionContext'
import { dayHeading, groupByDay } from '../domain/dates'

/**
 * The finals that have not started yet, on their own page rather than as a
 * strip across the board — it is a look-ahead list, not something the operator
 * acts on while presenting.
 */
export function NotStartedScreen() {
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
  const { colours, loading, stale, lastUpdated, details } = competition

  const notStarted = useMemo(
    () => visibleFinals.filter((f) => colours.get(f.meId) === 'red'),
    [visibleFinals, colours],
  )

  // Grouped by competition day so a multi-day meet reads as a running order.
  const byDay = useMemo(
    () => groupByDay(notStarted, details?.tz),
    [notStarted, details?.tz],
  )

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
          <h1 className="event__name">Not started</h1>
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
          <span className="pill num">{notStarted.length} finals</span>
          <LiveIndicator lastUpdated={lastUpdated} stale={stale} />
        </div>
      </header>

      <div className="page">
        {notStarted.length === 0 && (
          <div className="notice">
            {loading
              ? 'Loading finals…'
              : selectedDays.size > 0
                ? 'No finals waiting to start on the selected dates'
                : 'No finals waiting to start'}
          </div>
        )}

        {byDay.map(([day, events]) => (
          <section className="daygroup" key={day}>
            <div className="daygroup__head">
              <span className="sect__dot" style={{ background: 'var(--red)' }} />
              <h2 className="sect__title num">
                {dayHeading(day)}
              </h2>
              <span className="sect__count">{events.length}</span>
            </div>
            <div className="daygroup__cards">
              {events.map((f) => (
                <EventCard tz={details?.tz} key={f.meId} event={f} colour="red" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
