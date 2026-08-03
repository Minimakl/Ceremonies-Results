import type { FinalEvent } from './model'

/**
 * Roster schedule times are UTC ("YYYY-MM-DD HH:mm:ss"). Competition days must
 * be worked out in the *venue's* timezone, not the viewer's: the 2026 Aus
 * Champs starts 2026-04-08 23:00 UTC, which is the morning of 9 April in
 * Sydney. Grouping in the wrong zone would put a whole session on the wrong
 * day — and the operator picks their shift by day.
 */
export function parseRosterTime(startDateTime: string | undefined): number | null {
  if (!startDateTime) return null
  const ms = Date.parse(`${startDateTime.replace(' ', 'T')}Z`)
  return Number.isNaN(ms) ? null : ms
}

/** Day key in the venue timezone, as YYYY-MM-DD. */
export function eventDayKey(
  startDateTime: string | undefined,
  timeZone: string | undefined,
): string | null {
  const ms = parseRosterTime(startDateTime)
  if (ms == null) return null
  try {
    // en-CA formats as YYYY-MM-DD, which sorts correctly as a string.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(ms))
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(ms))
  }
}

/** "2026-04-09" → "09/04/2026" (day-first, as an Australian user reads it). */
export function formatDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Split events into their competition days, earliest day first, keeping each
 * day's events in the order they were given (buildFinals sorts by start time).
 *
 * Every screen that lists finals groups them this way, because a board holding
 * several days runs 7pm then 10am with nothing to say why — the day heading is
 * what makes that legible.
 */
export const UNSCHEDULED_DAY = 'unscheduled'

export function groupByDay(
  events: FinalEvent[],
  timeZone: string | undefined,
): [string, FinalEvent[]][] {
  const groups = new Map<string, FinalEvent[]>()
  for (const event of events) {
    const key = eventDayKey(event.startDateTime, timeZone) ?? UNSCHEDULED_DAY
    groups.set(key, [...(groups.get(key) ?? []), event])
  }
  // Unscheduled events sort last: 'unscheduled' > any 'YYYY-MM-DD'.
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

/** The day heading Roster puts above each day of its schedule. */
export function dayHeading(dayKey: string): string {
  return dayKey === UNSCHEDULED_DAY
    ? 'Time to be confirmed'
    : formatDayLabel(dayKey)
}

/** The distinct days a competition's finals fall on, earliest first. */
export function competitionDays(
  finals: FinalEvent[],
  timeZone: string | undefined,
): string[] {
  const days = new Set<string>()
  for (const f of finals) {
    const key = eventDayKey(f.startDateTime, timeZone)
    if (key) days.add(key)
  }
  return [...days].sort()
}

/**
 * Filter finals to the selected days. An empty selection means "every day" —
 * the operator has not narrowed anything down, so nothing is hidden.
 */
export function filterByDays(
  finals: FinalEvent[],
  selected: ReadonlySet<string>,
  timeZone: string | undefined,
): FinalEvent[] {
  if (selected.size === 0) return finals
  return finals.filter((f) => {
    const key = eventDayKey(f.startDateTime, timeZone)
    return key != null && selected.has(key)
  })
}

/**
 * The wall-clock start time at the venue, formatted the way Roster's schedule
 * formats it — "2:00 PM". Schedule times are stored UTC; the venue timezone
 * comes from the meeting details, the same source the day grouping uses.
 * Returns '' when the event has no meaningful time.
 */
export function eventWallTime(
  startDateTime: string | undefined,
  timeZone: string | undefined,
): string {
  const ms = parseRosterTime(startDateTime)
  if (ms == null) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(ms))
  } catch {
    return ''
  }
}
