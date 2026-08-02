import type { MeetingSearchRequest } from '../api/types'

/**
 * Build the request body Roster's own competition browser posts, so the
 * results are exactly the ones Roster would return for the same filters.
 *
 * Mirrors `doSearch()` in Roster's PublicMeetingBrowserComponent:
 *   afterFilter  = fromDate at start of day
 *   beforeFilter = toDate at start of day, plus a day, minus a second
 *   first=true   = oldest first; last=true = newest first; neither = "Recent"
 */
export interface SearchFilters {
  text: string
  countryCode: string | null
  /** "YYYY-MM-DD" as typed into a date input, or '' for unset. */
  fromDate: string
  toDate: string
}

/** "2026-04-09" → "2026-04-09 00:00:00" */
function startOfDay(day: string): string {
  return `${day} 00:00:00`
}

/** "2026-04-09" → "2026-04-09 23:59:59" (Roster's +1 day − 1 second). */
function endOfDay(day: string): string {
  return `${day} 23:59:59`
}

export function buildSearchRequest(filters: SearchFilters): MeetingSearchRequest {
  const now = new Date()
  return {
    // Roster uses the viewer's zone to interpret the date-range filter.
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tzMinutes: -now.getTimezoneOffset(),
    orgId: null,
    before: null,
    beforeId: null,
    after: null,
    afterId: null,
    beforeFilter: filters.toDate ? endOfDay(filters.toDate) : null,
    afterFilter: filters.fromDate ? startOfDay(filters.fromDate) : null,
    first: null,
    last: null,
    countryCode: filters.countryCode,
    regOpen: null,
    text: filters.text.trim() === '' ? null : filters.text.trim(),
  }
}

export function hasAnyFilter(filters: SearchFilters): boolean {
  return (
    filters.text.trim() !== '' ||
    filters.countryCode != null ||
    filters.fromDate !== '' ||
    filters.toDate !== ''
  )
}

/**
 * Roster gives venue-local wall times with a separate `tz`. Render them as
 * written — no conversion — so the dashboard shows the same clock time the
 * competition's own page does.
 */
export function formatMeetingDateTime(
  startDateTime: string | undefined,
  endDateTime: string | undefined,
): string {
  const start = formatWallTime(startDateTime)
  const end = formatWallTime(endDateTime)
  if (!start) return ''
  return end ? `${start} – ${end}` : start
}

/** "2026-04-08 23:00:00" → "08/04/2026, 23:00" */
export function formatWallTime(value: string | undefined): string {
  if (!value) return ''
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  if (!m) return value
  const [, year, month, day, hour, minute] = m
  return `${day}/${month}/${year}, ${hour}:${minute}`
}
