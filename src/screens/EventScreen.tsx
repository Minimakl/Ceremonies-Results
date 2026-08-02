import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompetitionContext } from '../state/competitionContext'
import { usePoll } from '../state/usePoll'
import { LiveIndicator } from '../components/LiveIndicator'
import { ArrowLeftIcon, SidebarToggleIcon } from '../components/icons'
import { buildEventRows, startListRows, type EventRow } from '../domain/model'
import { groupLabel } from '../domain/format'
import { buildCeremoniesList, type CeremonyRow } from '../domain/ceremonies'
import { generateScript, SCRIPT_PLACEHOLDER } from '../domain/script'
import type { StatusColour } from '../domain/status'

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

const STATUS_TEXT: Record<StatusColour, string> = {
  red: 'Not started',
  orange: 'In progress',
  yellow: 'Awaiting final results',
  green: 'Ready to present',
  pink: 'In ceremonies',
}

/**
 * Event screen (plan §6): Back button in the header, then Start List /
 * Results / Ceremonies / Script tabs.
 */
export function EventScreen() {
  const navigate = useNavigate()
  const { competition, meetingId, sidebarOpen, setSidebarOpen } =
    useCompetitionContext()
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
  const back = () => navigate(`/c/${meetingId}`)

  if (!event) {
    return (
      <div className="main">
        <header className="topbar">
          <button className="icon-button" aria-label="Back" onClick={back}>
            <ArrowLeftIcon />
          </button>
          <h1 className="topbar__title">
            {competition.loading ? 'Loading…' : 'Event not found'}
          </h1>
        </header>
        <div className="notice">
          {competition.loading
            ? 'Loading competition…'
            : `No final with id ${meIdParam} in this competition.`}
        </div>
      </div>
    )
  }

  const colour = colours.get(meId) ?? 'red'

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
        <button className="icon-button" aria-label="Back to all finals" onClick={back}>
          <ArrowLeftIcon />
        </button>
        <div className="event__title">
          <h1 className="event__name">{event.name} · {event.stageLabel}</h1>
          <span className="event__meta">
            {[event.gender, event.ageGroup].filter(Boolean).join(' · ')}
          </span>
        </div>
        <div className="topbar__right">
          <span className={`status-pill status-pill--${colour}`}>
            <span className="sect__dot" style={{ background: 'currentColor' }} />
            {STATUS_TEXT[colour]}
          </span>
          <LiveIndicator lastUpdated={resultsUpdated} stale={resultsStale} />
        </div>
      </header>

      <nav className="tabs">
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

      {!payload && !loadError && <div className="notice">Loading…</div>}
      {loadError && rows.length === 0 && (
        <div className="notice">Could not load results: {loadError}</div>
      )}

      {payload && tab === 'start-list' && (
        <div className="sheet">
          <StartListTab rows={startListRows(rows)} track={event.hasLanes} />
        </div>
      )}
      {payload && tab === 'results' && (
        <div className="sheet">
          <ResultsTab rows={rows} hasPara={hasPara} />
        </div>
      )}
      {payload && tab === 'ceremonies' && (
        <div className="sheet">
          <CeremoniesTab ceremonies={ceremonies} hasPara={hasPara} />
        </div>
      )}
      {payload && tab === 'script' && (
        <pre className="script">{script ?? SCRIPT_PLACEHOLDER}</pre>
      )}
    </div>
  )
}

/**
 * Start List (plan §6.1): Roster's columns plus Country, minus date of birth.
 * Country appears on every start list — decision §12.2 — so the operator can
 * always tell where an athlete is from and not just which club they run for.
 * Track: Lane, Participant, Country, PB, SB.
 * Field: Participant, Country, Club, PB, SB.
 *
 * On a Finals Summary a Group column is added, as Roster has, because the
 * order number restarts at 1 for each group and the list would otherwise look
 * mis-sorted.
 */
function StartListTab({ rows, track }: { rows: EventRow[]; track: boolean }) {
  const grouped = rows.some((r) => (r.group ?? 0) > 0)
  return (
    <table className="table">
      <thead>
        <tr>
          {track && <th>Lane</th>}
          <th>Participant</th>
          <th>Country</th>
          {!track && <th>Club</th>}
          {grouped && <th>Group</th>}
          <th>PB</th>
          <th>SB</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.participantId}>
            {track && <td className="num">{r.lane ?? ''}</td>}
            <td className="cell-name">{r.name}</td>
            <td>{r.country}</td>
            {!track && <td>{r.club}</td>}
            {grouped && <td>{groupLabel(r.group)}</td>}
            <td className="num">{r.pb}</td>
            <td className="num">{r.sb}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Results (plan §6.2): exactly as Roster shows them; everyone appears. */
function ResultsTab({ rows, hasPara }: { rows: EventRow[]; hasPara: boolean }) {
  const grouped = rows.some((r) => (r.group ?? 0) > 0)
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Participant</th>
          <th>Country</th>
          <th>Club</th>
          {grouped && <th>Group</th>}
          <th>Result</th>
          {hasPara && <th>%</th>}
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.participantId}>
            <td className="num">{r.place ?? ''}</td>
            <td className="cell-name">{r.name}</td>
            <td>{r.country}</td>
            <td>{r.club}</td>
            {/* Roster writes the group and the place within it: "A (1)". */}
            {grouped && (
              <td>
                {groupLabel(r.group)}
                {r.groupPlace != null ? ` (${r.groupPlace})` : ''}
              </td>
            )}
            <td className="cell-result">
              {r.isFinisher ? r.result : <span className="dnf">{r.result}</span>}
            </td>
            {hasPara && <td className="num">{r.paraPercentage ?? ''}</td>}
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
  ceremonies: CeremonyRow[]
  hasPara: boolean
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Place</th>
          <th>Overall</th>
          <th>Participant</th>
          <th>Country</th>
          <th>Club</th>
          <th>Result</th>
          {hasPara && <th>%</th>}
        </tr>
      </thead>
      <tbody>
        {ceremonies.map((c, i) => {
          const startsInternational =
            i > 0 &&
            ceremonies[i - 1].row.country === 'AUS' &&
            c.row.country !== 'AUS'
          return [
            startsInternational && (
              <tr className="table__band" key={`band-${c.row.participantId}`}>
                <td colSpan={hasPara ? 7 : 6}>International athletes</td>
              </tr>
            ),
            <tr key={c.row.participantId}>
              <td>
                {typeof c.placeOrder === 'number' ? (
                  <span className={`medal medal--${c.placeOrder}`}>
                    {c.placeOrder}
                  </span>
                ) : (
                  <span className="medal">–</span>
                )}
              </td>
              <td className="num">{c.overallPosition}</td>
              <td className="cell-name">{c.row.name}</td>
              <td>{c.row.country}</td>
              <td>{c.row.club}</td>
              <td className="cell-result">{c.row.result}</td>
              {hasPara && <td className="num">{c.row.paraPercentage ?? ''}</td>}
            </tr>,
          ]
        })}
      </tbody>
    </table>
  )
}
