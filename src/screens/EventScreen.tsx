import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompetitionContext } from '../state/competitionContext'
import { usePoll } from '../state/usePoll'
import { LiveIndicator } from '../components/LiveIndicator'
import { buildEventRows, startListRows, type EventRow } from '../domain/model'
import { buildCeremoniesList } from '../domain/ceremonies'
import { generateScript, SCRIPT_PLACEHOLDER } from '../domain/script'

/**
 * Results are polled harder than the schedule: this is the screen the operator
 * reads from while an event is being finalised.
 */
const RESULTS_POLL_MS = 5_000

type Tab = 'start-list' | 'results' | 'ceremonies' | 'script'

const TABS: { id: Tab; label: string }[] = [
  { id: 'start-list', label: 'Start List' },
  { id: 'results', label: 'Results' },
  { id: 'ceremonies', label: 'Ceremonies' },
  { id: 'script', label: 'Script' },
]

/**
 * Event screen (plan §6): Back button in the header, then Start List /
 * Results / Ceremonies / Script tabs.
 */
export function EventScreen() {
  const navigate = useNavigate()
  const { competition, meetingId } = useCompetitionContext()
  const { meId: meIdParam } = useParams()
  const meId = Number(meIdParam)
  const { finals, colours, resultsCache, loadResults } = competition
  const event = finals.find((f) => f.meId === meId)
  const [tab, setTab] = useState<Tab>('start-list')
  const [loadError, setLoadError] = useState<string>()
  const [resultsUpdated, setResultsUpdated] = useState<number | null>(null)
  const [resultsStale, setResultsStale] = useState(false)

  const payload = resultsCache.get(meId)

  usePoll(
    async () => {
      if (!Number.isFinite(meId)) return
      try {
        await loadResults(meId)
        setResultsUpdated(Date.now())
        setResultsStale(false)
        setLoadError(undefined)
      } catch (err) {
        // Leave the last good results on screen; flag that they may have moved.
        setResultsStale(true)
        setLoadError(String(err))
      }
    },
    RESULTS_POLL_MS,
    [meId],
  )

  const rows = useMemo(
    () => (event && payload ? buildEventRows(event, payload) : []),
    [event, payload],
  )
  const ceremonies = useMemo(
    () => (event ? buildCeremoniesList(rows, event.isCombined) : []),
    [event, rows],
  )
  const script = useMemo(
    () => (event ? generateScript(event, ceremonies) : null),
    [event, ceremonies],
  )
  const hasPara = rows.some((r) => r.paraPercentage != null)

  if (!event) {
    return (
      <div className="event">
        <header className="event__header">
          <button className="back-button" onClick={() => navigate(`/c/${meetingId}`)}>
            ← Back
          </button>
          <h1>{competition.loading ? 'Loading…' : 'Event not found'}</h1>
        </header>
        <p className="event__loading">
          {competition.loading
            ? 'Loading competition…'
            : `No final with id ${meIdParam} in this competition.`}
        </p>
      </div>
    )
  }

  const colour = colours.get(meId) ?? 'red'

  return (
    <div className="event">
      <header className={`event__header event__header--${colour}`}>
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div>
          <h1>{event.name} · Final</h1>
          <div className="event__meta">
            {[event.gender, event.ageGroup].filter(Boolean).join(' · ')}
            <LiveIndicator lastUpdated={resultsUpdated} stale={resultsStale} />
          </div>
        </div>
      </header>

      <nav className="event__tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab tab--active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loadError && rows.length === 0 && (
        <p className="event__loading">Could not load results: {loadError}</p>
      )}
      {!payload && !loadError && <p className="event__loading">Loading…</p>}

      {tab === 'start-list' && payload && (
        <StartListTab rows={startListRows(rows)} track={event.hasLanes} />
      )}
      {tab === 'results' && payload && <ResultsTab rows={rows} hasPara={hasPara} />}
      {tab === 'ceremonies' && payload && (
        <CeremoniesTab ceremonies={ceremonies} hasPara={hasPara} />
      )}
      {tab === 'script' && payload && (
        <pre className="event__script">{script ?? SCRIPT_PLACEHOLDER}</pre>
      )}
    </div>
  )
}

/**
 * Start List (plan §6.1): Roster's columns plus Country, minus date of birth.
 * Track: Lane, Participant, Country, PB, SB. Field: Participant, Club, PB, SB
 * (Country on field lists is open decision §12.2).
 */
function StartListTab({ rows, track }: { rows: EventRow[]; track: boolean }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {track && <th>Lane</th>}
          <th>Participant</th>
          {track ? <th>Country</th> : <th>Club</th>}
          <th>PB</th>
          <th>SB</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.participantId}>
            {track && <td>{r.lane ?? ''}</td>}
            <td>{r.name}</td>
            {track ? <td>{r.country}</td> : <td>{r.club}</td>}
            <td>{r.pb}</td>
            <td>{r.sb}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Results (plan §6.2): exactly as Roster shows them; everyone appears. */
function ResultsTab({ rows, hasPara }: { rows: EventRow[]; hasPara: boolean }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Position</th>
          <th>Participant</th>
          <th>Country</th>
          <th>Club</th>
          <th>Result</th>
          {hasPara && <th>%</th>}
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.participantId}>
            <td>{r.place ?? ''}</td>
            <td>{r.name}</td>
            <td>{r.country}</td>
            <td>{r.club}</td>
            <td>{r.result}</td>
            {hasPara && <td>{r.paraPercentage ?? ''}</td>}
            <td>{r.notes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Ceremonies (plan §6.3): the reordered read-from-this list. */
function CeremoniesTab({
  ceremonies,
  hasPara,
}: {
  ceremonies: ReturnType<typeof buildCeremoniesList>
  hasPara: boolean
}) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Place order</th>
          <th>Overall Position</th>
          <th>Participant</th>
          <th>Country</th>
          <th>Club</th>
          <th>Result</th>
          {hasPara && <th>%</th>}
        </tr>
      </thead>
      <tbody>
        {ceremonies.map((c, i) => (
          <tr
            key={c.row.participantId}
            className={
              i > 0 &&
              ceremonies[i - 1].row.country === 'AUS' &&
              c.row.country !== 'AUS'
                ? 'data-table__divider'
                : undefined
            }
          >
            <td className="data-table__place">{c.placeOrder}</td>
            <td>{c.overallPosition}</td>
            <td>{c.row.name}</td>
            <td>{c.row.country}</td>
            <td>{c.row.club}</td>
            <td>{c.row.result}</td>
            {hasPara && <td>{c.row.paraPercentage ?? ''}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
