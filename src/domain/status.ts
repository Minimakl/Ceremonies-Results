import type { FinalEvent } from './model'
import type { EventRow } from './model'

export type AutoColour = 'red' | 'orange' | 'yellow' | 'green'
/**
 * Pink is a manual promotion into ceremonies; blue is the manual "finished
 * presenting" flag (plan §5.3). Blue is deliberately outside `displayColour`:
 * it overrides whatever Roster says, so a presented event never returns to the
 * board on its own.
 */
export type StatusColour = AutoColour | 'pink' | 'blue'

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
 * Final display colour.
 *
 * Pink is a manual promotion (plan §4) and is only valid while the underlying
 * event is green — if Roster regresses the event, the pink flag is ignored
 * until it is green again.
 *
 * Blue — presented — behaves the opposite way, and deliberately (plan §5.3,
 * option B): once the medals are handed out the event is off the board and
 * stays off, whatever Roster later says. Nothing but the operator's own
 * "Return to ceremonies" brings it back.
 */
export function displayColour(
  auto: AutoColour,
  promoted: boolean,
  presented = false,
): StatusColour {
  if (presented) return 'blue'
  return promoted && auto === 'green' ? 'pink' : auto
}

/** Hard rule: only green events can be promoted to pink. */
export function canPromote(colour: StatusColour): boolean {
  return colour === 'green'
}

/**
 * Only an event Roster has finalised can be marked presented — green, or pink
 * because it was sent to ceremonies first. Marking a final that has not
 * happened would take it off the board with nothing to show for it, and the
 * operator would not notice until it was missing.
 */
export function canMarkPresented(colour: StatusColour): boolean {
  return colour === 'green' || colour === 'pink'
}
