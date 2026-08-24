import type { MeetingSearchRequest } from '../api/types'
import { eventDayKey, eventWallTime, formatDayLabel } from './dates'

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
  timeZone: string | undefined,
): string {
  const start = formatWallTime(startDateTime, timeZone)
  const end = formatWallTime(endDateTime, timeZone)
  if (!start) return ''
  return end ? `${start} – ${end}` : start
}

/**
 * A meeting's own timestamps are **UTC**, exactly like the schedule's — the
 * string carries no zone marker, which makes it easy to print as if it were
 * local and be a whole day out. Verified on three meets, each matching what
 * Roster's own page prints:
 *
 *   27550  2026-04-08 23:00 UTC · Australia/Sydney    → 09/04/2026, 9:00 AM
 *   28351  2026-08-21 23:15 UTC · Australia/Melbourne → 22/08/2026, 9:15 AM
 *   27809  2026-01-31 06:00 UTC · Australia/Perth     → 31/01/2026, 2:00 PM
 *
 * So it is converted with the meeting's own `tz`, the same way event times
 * are. With no timezone the raw UTC instant is shown rather than a guess.
 */
export function formatWallTime(
  value: string | undefined,
  timeZone: string | undefined,
): string {
  const day = eventDayKey(value, timeZone)
  const time = eventWallTime(value, timeZone)
  if (!day || !time) return ''
  return `${formatDayLabel(day)}, ${time}`
}
