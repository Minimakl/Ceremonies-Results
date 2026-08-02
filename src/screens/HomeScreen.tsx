import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventCard } from '../components/EventCard'
import { LiveIndicator } from '../components/LiveIndicator'
import { SidebarToggleIcon } from '../components/SidebarToggleIcon'
import { useCompetitionContext } from '../state/competitionContext'
import type { StatusColour } from '../domain/status'
import type { FinalEvent } from '../domain/model'

const REFERENCE_COMPETITIONS = [
  { id: 27550, name: '2026 Australian Athletics Championships' },
  { id: 27236, name: '2026 Maurie Plant Meet Melbourne' },
  { id: 27351, name: '2025 WA All Schools Championships' },
]

/**
 * Home screen (plan §5): red header strip with the not-started finals and the
 * sidebar button, then four quadrants — PINK | GREEN over ORANGE | YELLOW.
 */
export function HomeScreen() {
  const navigate = useNavigate()
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

  const openCompetition = (id: number) => {
    navigate(`/c/${id}`)
    setSidebarOpen(false)
  }

  return (
    <div className="home">
      <header className="home__header">
        <div className="home__header-bar">
          <button
            className="sidebar-button"
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <SidebarToggleIcon />
          </button>
          <h1>{details?.meetingName ?? `Competition ${meetingId}`}</h1>
          <span className="home__header-count">
            {loading ? 'Loading…' : `${finals.length} finals`}
            <LiveIndicator lastUpdated={lastUpdated} stale={stale} />
          </span>
        </div>
        <div className="home__header-strip">
          <span className="home__strip-label">🔴 Not started</span>
          <div className="home__strip-cards">
            {byColour.red.length === 0 && !loading && (
              <span className="home__empty">No finals waiting to start</span>
            )}
            {byColour.red.map((f) => (
              <EventCard key={f.meId} event={f} colour="red" />
            ))}
          </div>
        </div>
      </header>

      <div className="home__body">
        {sidebarOpen && (
          <aside className="sidebar">
            <h2>Competitions</h2>
            {REFERENCE_COMPETITIONS.map((c) => (
              <button
                key={c.id}
                className={
                  c.id === meetingId
                    ? 'sidebar__item sidebar__item--active'
                    : 'sidebar__item'
                }
                onClick={() => openCompetition(c.id)}
              >
                {c.name}
              </button>
            ))}
            <form
              className="sidebar__custom"
              onSubmit={(e) => {
                e.preventDefault()
                const id = Number(new FormData(e.currentTarget).get('comp'))
                if (Number.isFinite(id) && id > 0) openCompetition(id)
              }}
            >
              <input
                name="comp"
                inputMode="numeric"
                placeholder="Roster competition id"
              />
              <button type="submit">Open</button>
            </form>
          </aside>
        )}

        <main className="home__quadrants">
          <Quadrant
            title="🩷 In ceremonies"
            className="quadrant--pink"
            events={byColour.pink}
            colours={colours}
            onDemote={demote}
          />
          <Quadrant
            title="🟢 Ready to present"
            className="quadrant--green"
            events={byColour.green}
            colours={colours}
            onPromote={promote}
          />
          <Quadrant
            title="🟠 In progress"
            className="quadrant--orange"
            events={byColour.orange}
            colours={colours}
          />
          <Quadrant
            title="🟡 Awaiting final results"
            className="quadrant--yellow"
            events={byColour.yellow}
            colours={colours}
          />
        </main>
      </div>
    </div>
  )
}

function Quadrant({
  title,
  className,
  events,
  colours,
  onPromote,
  onDemote,
}: {
  title: string
  className: string
  events: FinalEvent[]
  colours: Map<number, StatusColour>
  onPromote?: (meId: number) => void
  onDemote?: (meId: number) => void
}) {
  return (
    <section className={`quadrant ${className}`}>
      <h2>{title}</h2>
      <div className="quadrant__cards">
        {events.length === 0 && <span className="home__empty">No events</span>}
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
