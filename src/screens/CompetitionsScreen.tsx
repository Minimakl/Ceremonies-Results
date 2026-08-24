import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMeetingDetails,
  listFeaturedCompetitions,
  searchCompetitions,
} from '../api/rosterClient'
import type { MeetingDetailsDto, MeetingSummaryDto } from '../api/types'
import { ROSTER_COUNTRIES, countryFlag, countryName } from '../domain/countries'
import {
  buildSearchRequest,
  formatMeetingDateTime,
  formatWallTime,
  hasAnyFilter,
  type SearchFilters,
} from '../domain/competitionSearch'
import { ArrowLeftIcon, SidebarToggleIcon } from '../components/icons'
import { useAppLayout } from '../state/appLayout'

const DEBOUNCE_MS = 400

const EMPTY_FILTERS: SearchFilters = {
  text: '',
  countryCode: null,
  fromDate: '',
  toDate: '',
}

/**
 * Browse every competition on Roster — not just Australian ones, and not just
 * by id. Search, country and date filters are posted to Roster's own search
 * endpoint, so the result set is exactly what Roster would return.
 */
export function CompetitionsScreen() {
  const navigate = useNavigate()
  const { sidebarOpen, setSidebarOpen, activeMeetingId } = useAppLayout()

  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS)
  const [meets, setMeets] = useState<MeetingSummaryDto[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [selected, setSelected] = useState<MeetingSummaryDto | null>(null)
  const [details, setDetails] = useState<MeetingDetailsDto | null>(null)
  const [detailsError, setDetailsError] = useState<string>()
  const requestSeq = useRef(0)

  const filtered = hasAnyFilter(filters)

  useEffect(() => {
    const seq = ++requestSeq.current
    setLoading(true)
    const run = async () => {
      try {
        const res = filtered
          ? await searchCompetitions(buildSearchRequest(filters))
          : await listFeaturedCompetitions()
        if (seq !== requestSeq.current) return // a newer search has started
        setMeets(res.meets ?? [])
        setTotal((res.meets?.length ?? 0) + (res.after ?? 0) + (res.before ?? 0))
        setError(undefined)
      } catch (err) {
        if (seq !== requestSeq.current) return
        setError(String(err))
        setMeets([])
      } finally {
        if (seq === requestSeq.current) setLoading(false)
      }
    }
    const timer = setTimeout(run, filtered ? DEBOUNCE_MS : 0)
    return () => clearTimeout(timer)
  }, [filters, filtered])

  // Full details are fetched on selection so the confirmation panel shows
  // Roster's own venue, address and organiser rather than a summary row.
  const select = useCallback(async (meet: MeetingSummaryDto) => {
    setSelected(meet)
    setDetails(null)
    setDetailsError(undefined)
    try {
      setDetails(await getMeetingDetails(meet.meetingId))
    } catch (err) {
      setDetailsError(String(err))
    }
  }, [])

  const countryOptions = useMemo(() => ROSTER_COUNTRIES, [])

  // Roster's search matches names, not ids — so a bare number stays useful.
  const typedId = /^\d+$/.test(filters.text.trim())
    ? Number(filters.text.trim())
    : null

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
        {activeMeetingId != null && (
          <button
            className="icon-button"
            aria-label="Back to the dashboard"
            onClick={() => navigate(`/c/${activeMeetingId}`)}
          >
            <ArrowLeftIcon />
          </button>
        )}
        <h1 className="topbar__title">Competitions</h1>
        <div className="topbar__right">
          <span className="pill num">
            {loading
              ? 'Searching…'
              : total != null && total > meets.length
                ? `${meets.length} of ${total}`
                : `${meets.length} found`}
          </span>
        </div>
      </header>

      <div className="page">
        <section className="filters">
          <input
            className="filters__search"
            type="search"
            placeholder="Search competitions by name…"
            aria-label="Search competitions by name"
            value={filters.text}
            onChange={(e) => setFilters({ ...filters, text: e.target.value })}
          />
          <label className="filters__field">
            <span className="filters__label">Country</span>
            <select
              value={filters.countryCode ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, countryCode: e.target.value || null })
              }
            >
              <option value="">All countries</option>
              {countryOptions.map((c) => (
                <option key={c.iso3} value={c.iso3}>
                  {c.flag ? `${c.flag} ` : ''}
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filters__field">
            <span className="filters__label">From</span>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
            />
          </label>
          <label className="filters__field">
            <span className="filters__label">To</span>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
            />
          </label>
          {filtered && (
            <button
              className="chip"
              onClick={() => setFilters(EMPTY_FILTERS)}
              title="Clear all filters"
            >
              Clear filters
            </button>
          )}
        </section>

        {error && <div className="notice">Could not reach Roster: {error}</div>}
        {!error && !loading && meets.length === 0 && (
          <div className="notice">No competitions match your search criteria</div>
        )}
        {typedId != null && (
          <button className="comp comp--byid" onClick={() => navigate(`/c/${typedId}`)}>
            <span className="comp__name">Open competition {typedId} by ID</span>
            <span className="comp__meta">
              Go straight to this Roster competition id
            </span>
          </button>
        )}

        {!filtered && meets.length > 0 && (
          <p className="filters__hint">
            Roster's highlighted competitions. Search or filter to find any other.
          </p>
        )}

        <div className="complist">
          {meets.map((m) => (
            <button
              key={m.meetingId}
              className={
                selected?.meetingId === m.meetingId
                  ? 'comp comp--selected'
                  : m.meetingId === activeMeetingId
                    ? 'comp comp--active'
                    : 'comp'
              }
              onClick={() => select(m)}
            >
              <span className="comp__name">{m.meetingName}</span>
              <span className="comp__meta num">
                {formatMeetingDateTime(m.startDateTime, m.endDateTime, m.tz)}
              </span>
              <span className="comp__meta">
                {[
                  m.venueName,
                  m.city,
                  `${countryFlag(m.countryCode)} ${countryName(m.countryCode)}`.trim(),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {m.meetingId === activeMeetingId && (
                <span className="comp__badge">Currently set</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <>
          <button
            className="scrim scrim--modal"
            aria-label="Close competition details"
            onClick={() => setSelected(null)}
          />
          <aside className="detail" role="dialog" aria-label="Competition details">
            <div className="detail__head">
              <h2 className="detail__title">{selected.meetingName}</h2>
              <button className="chip" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            {detailsError && (
              <div className="notice">Could not load details: {detailsError}</div>
            )}

            <dl className="detail__grid">
              <dt>Date &amp; time</dt>
              <dd className="num">
                {formatMeetingDateTime(
                  details?.startDateTime ?? selected.startDateTime,
                  details?.endDateTime ?? selected.endDateTime,
                  details?.tz ?? selected.tz,
                )}
                {(details?.tz ?? selected.tz) && (
                  <span className="detail__sub">
                    {' '}
                    ({details?.tz ?? selected.tz})
                  </span>
                )}
              </dd>

              <dt>Venue</dt>
              <dd>
                {details?.address?.venueName ??
                  details?.venueName ??
                  selected.venueName ??
                  '—'}
              </dd>

              <dt>Address</dt>
              <dd>{details?.address?.streetAddress ?? '—'}</dd>

              <dt>City &amp; country</dt>
              <dd>
                {[
                  details?.address?.postcode,
                  details?.address?.city ?? selected.city,
                ]
                  .filter(Boolean)
                  .join(' ')}
                {', '}
                {countryFlag(details?.address?.countryCode ?? selected.countryCode)}{' '}
                {countryName(details?.address?.countryCode ?? selected.countryCode)}
              </dd>

              <dt>Organiser</dt>
              <dd>
                {details?.organiserDisplayName ?? details?.organiserName ?? '—'}
              </dd>

              <dt>Status</dt>
              <dd>{details?.meetingStatus ?? selected.meetingStatus ?? '—'}</dd>

              {selected.registrationDeadline && (
                <>
                  <dt>Registration deadline</dt>
                  <dd className="num">
                    {formatWallTime(
                      selected.registrationDeadline,
                      details?.tz ?? selected.tz,
                    )}
                  </dd>
                </>
              )}

              <dt>Roster competition ID</dt>
              <dd className="num">{selected.meetingId}</dd>
            </dl>

            <button
              className="detail__set"
              onClick={() => navigate(`/c/${selected.meetingId}`)}
            >
              Set as my competition
            </button>
            <p className="detail__note">
              Every field above is read live from Roster Athletics.
            </p>
          </aside>
        </>
      )}
    </div>
  )
}
