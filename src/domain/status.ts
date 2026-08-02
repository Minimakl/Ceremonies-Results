import type { FinalEvent } from './model'
import type { EventRow } from './model'

export type AutoColour = 'red' | 'orange' | 'yellow' | 'green'
export type StatusColour = AutoColour | 'pink'

/**
 * Automatic colour from schedule-level Roster status (plan §4).
 * Mirrors the Roster SPA's own live/finished logic (docs/ROSTER-API.md):
 *
 *   red    — final has not started (no results, not past start time)
 *   orange — in progress (past start time or partial results, not complete)
 *   green  — resultsComplete: results finalised
 *
 * Yellow (finished but results unofficial) cannot be told apart from orange
 * at schedule level; refineWithRows upgrades orange → yellow once the
 * event's results show every athlete with a final outcome. Plan §12.5 keeps
 * the mapping provisional until a live in-progress meet is observed.
 */
export function autoColour(ev: FinalEvent, now: Date = new Date()): AutoColour {
  if (ev.resultsComplete) return 'green'
  const pastStart =
    ev.timePubliclyVisible &&
    ev.startDateTime != null &&
    // Roster schedule times are UTC "YYYY-MM-DD HH:mm:ss".
    now.getTime() >= Date.parse(`${ev.startDateTime.replace(' ', 'T')}Z`)
  if (ev.hasResults || pastStart) return 'orange'
  return 'red'
}

/**
 * Upgrade orange → yellow when the loaded results show the event is finished
 * (every athlete has either an overall place or a terminal status like DNF)
 * but Roster has not yet marked results complete.
 */
export function refineWithRows(colour: AutoColour, rows: EventRow[]): AutoColour {
  if (colour !== 'orange' || rows.length === 0) return colour
  const allSettled = rows.every(
    (r) => r.isFinisher || (r.startStatus !== 'Ok' && r.startStatus !== ''),
  )
  return allSettled ? 'yellow' : 'orange'
}

/**
 * Final display colour. Pink is a manual promotion (plan §4) and is only
 * valid while the underlying event is green — if Roster ever regresses the
 * event, the pink flag is ignored until it is green again.
 */
export function displayColour(auto: AutoColour, promoted: boolean): StatusColour {
  return promoted && auto === 'green' ? 'pink' : auto
}

/** Hard rule: only green events can be promoted to pink. */
export function canPromote(colour: StatusColour): boolean {
  return colour === 'green'
}
