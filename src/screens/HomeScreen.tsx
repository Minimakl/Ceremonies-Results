import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventCard } from '../components/EventCard'
import { DateFilter } from '../components/DateFilter'
import { LiveIndicator } from '../components/LiveIndicator'
import { ChevronRightIcon, SidebarToggleIcon } from '../components/icons'
import { useCompetitionContext } from '../state/competitionContext'
import type { StatusColour } from '../domain/status'
import type { FinalEvent } from '../domain/model'

/**
 * Home screen (plan §5): the four sections — PINK | GREEN over ORANGE |
 * YELLOW. Not-started finals live behind a header button on their own page
 * so the board only carries what the operator is actively working through.
 */
export function HomeScreen() {
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
  const { colours, loading, stale, lastUpdated, details, promote, demote } =
    competition

  const byColour = useMemo(() => {
    const groups: Record<StatusColour, FinalEvent[]> = {
      red: [],
      orange: [],
      yellow: [],
      green: [],
      pink: [],
    }
    for (const f of visibleFinals) {
      groups[colours.get(f.meId) ?? 'red'].push(f)
    }
    return groups
  }, [visibleFinals, colours])

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
        <h1 className="topbar__title">
          {details?.meetingName ?? `Competition ${meetingId}`}
        </h1>
        <div className="topbar__right">
          <button
            className="chip chip--red"
            onClick={() => navigate(`/c/${meetingId}/not-started`)}
          >
            <span className="sect__dot" style={{ background: 'currentColor' }} />
            Not started
            <span className="chip__count num">{byColour.red.length}</span>
            <ChevronRightIcon size={14} />
          </button>
          <DateFilter
            days={days}
            selected={selectedDays}
            onToggle={toggleDay}
            onClear={clearDays}
          />
          <LiveIndicator lastUpdated={lastUpdated} stale={stale} />
        </div>
      </header>

      {loading && <div className="notice">Loading finals…</div>}

      <main className="board">
        <Panel
          title="In ceremonies"
          tone="pink"
          events={byColour.pink}
          colours={colours}
          onDemote={demote}
          emptyText="Events you send from Ready to present appear here"
        />
        <Panel
          title="Ready to present"
          tone="green"
          events={byColour.green}
          colours={colours}
          onPromote={promote}
          emptyText="No finals are finalised yet"
        />
        <Panel
          title="In progress"
          tone="orange"
          events={byColour.orange}
          colours={colours}
          emptyText="Nothing under way"
        />
        <Panel
          title="Awaiting final results"
          tone="yellow"
          events={byColour.yellow}
          colours={colours}
          emptyText="Nothing waiting on official results"
        />
      </main>
    </div>
  )
}

function Panel({
  title,
  tone,
  events,
  colours,
  onPromote,
  onDemote,
  emptyText,
}: {
  title: string
  tone: StatusColour
  events: FinalEvent[]
  colours: Map<number, StatusColour>
  onPromote?: (meId: number) => void
  onDemote?: (meId: number) => void
  emptyText: string
}) {
  return (
    <section className={`panel panel--${tone}`}>
      <div className="panel__head">
        <span className="sect__dot" />
        <h2 className="sect__title">{title}</h2>
        <span className="sect__count">{events.length}</span>
      </div>
      <div className="panel__body">
        {events.length === 0 && <div className="empty">{emptyText}</div>}
        {events.map((f) => (
          <EventCard
            key={f.meId}
            event={f}
            colour={colours.get(f.meId) ?? 'red'}
            onPromote={onPromote ? () => onPromote(f.meId) : undefined}
            onDemote={onDemote ? () => onDemote(f.meId) : undefined}
          />
        ))}
      </div>
    </section>
  )
}
