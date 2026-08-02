import { useMemo } from 'react'
import { EventCard } from '../components/EventCard'
import { LiveIndicator } from '../components/LiveIndicator'
import { SidebarToggleIcon } from '../components/icons'
import { useCompetitionContext } from '../state/competitionContext'
import type { StatusColour } from '../domain/status'
import type { FinalEvent } from '../domain/model'

/**
 * Home screen (plan §5): the not-started rail across the top, then the four
 * sections — PINK | GREEN over ORANGE | YELLOW.
 */
export function HomeScreen() {
  const { competition, meetingId, sidebarOpen, setSidebarOpen } =
    useCompetitionContext()
  const { finals, colours, loading, stale, lastUpdated, details, promote, demote } =
    competition

  const byColour = useMemo(() => {
    const groups: Record<StatusColour, FinalEvent[]> = {
      red: [],
      orange: [],
      yellow: [],
      green: [],
      pink: [],
    }
    for (const f of finals) {
      groups[colours.get(f.meId) ?? 'red'].push(f)
    }
    return groups
  }, [finals, colours])

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
          <span className="pill num">
            {loading ? 'Loading…' : `${finals.length} finals`}
          </span>
          <LiveIndicator lastUpdated={lastUpdated} stale={stale} />
        </div>
      </header>

      <section className="rail">
        <div className="rail__head">
          <span className="sect__dot" />
          <h2 className="sect__title">Not started</h2>
          <span className="sect__count">{byColour.red.length}</span>
        </div>
        {byColour.red.length === 0 ? (
          <p className="rail__empty">
            {loading ? 'Loading finals…' : 'No finals waiting to start'}
          </p>
        ) : (
          <div className="rail__cards">
            {byColour.red.map((f) => (
              <EventCard key={f.meId} event={f} colour="red" />
            ))}
          </div>
        )}
      </section>

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
