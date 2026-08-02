import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventCard } from '../components/EventCard'
import type { CompetitionState } from '../state/useCompetition'
import type { StatusColour } from '../domain/status'
import type { FinalEvent } from '../domain/model'

interface Props {
  competition: CompetitionState
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  meetingId: number
}

const REFERENCE_COMPETITIONS = [
  { id: 27550, name: '2026 Australian Athletics Championships' },
  { id: 27236, name: '2026 Maurie Plant Meet Melbourne' },
  { id: 27351, name: '2025 WA All Schools Championships' },
]

/**
 * Home screen (plan §5): red header strip with the not-started finals and the
 * sidebar button, then four quadrants — PINK | GREEN over ORANGE | YELLOW.
 */
export function HomeScreen({
  competition,
  sidebarOpen,
  setSidebarOpen,
  meetingId,
}: Props) {
  const navigate = useNavigate()
  const { finals, colours, loading, error, details, promote, demote } = competition

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
    <div className="home">
      <header className="home__header">
        <div className="home__header-bar">
          <button
            className="sidebar-button"
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1>{details?.meetingName ?? `Competition ${meetingId}`}</h1>
          <span className="home__header-count">
            {loading ? 'Loading…' : `${finals.length} finals`}
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

      {sidebarOpen && (
        <aside className="sidebar">
          <h2>Competitions</h2>
          {REFERENCE_COMPETITIONS.map((c) => (
            <button
              key={c.id}
              className={c.id === meetingId ? 'sidebar__item sidebar__item--active' : 'sidebar__item'}
              onClick={() => {
                navigate(`/?comp=${c.id}`)
                setSidebarOpen(false)
              }}
            >
              {c.name}
            </button>
          ))}
          <form
            className="sidebar__custom"
            onSubmit={(e) => {
              e.preventDefault()
              const input = new FormData(e.currentTarget).get('comp')
              const id = Number(input)
              if (Number.isFinite(id) && id > 0) {
                navigate(`/?comp=${id}`)
                setSidebarOpen(false)
              }
            }}
          >
            <input name="comp" inputMode="numeric" placeholder="Roster competition id" />
            <button type="submit">Open</button>
          </form>
          <button className="sidebar__close" onClick={() => setSidebarOpen(false)}>
            Close
          </button>
        </aside>
      )}

      {error && <div className="home__error">Failed to load: {error}</div>}

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
