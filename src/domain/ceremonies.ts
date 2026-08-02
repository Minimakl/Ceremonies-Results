import type { EventRow } from './model'

/**
 * The ordering engine (plan §7).
 *
 * - Australians on top, renumbered 1, 2, 3… in finishing order.
 * - Internationals underneath, always — even the outright winner.
 * - Internationals placed 1st–3rd overall keep that number (they medal).
 * - Internationals outside the top 3: hyphen in Place order.
 * - Individual events drop non-medal internationals entirely (§7.1);
 *   combined events keep them (§7.2).
 * - Athletes without an overall place (DNF/DNS/DQ) never appear (§7.2 for
 *   combined; individual events have no mark to read either).
 */
export interface CeremonyRow {
  placeOrder: number | '-'
  overallPosition: number
  row: EventRow
}

export function buildCeremoniesList(
  rows: EventRow[],
  isCombined: boolean,
): CeremonyRow[] {
  const finishers = rows.filter((r) => r.place != null)

  const australians = finishers
    .filter((r) => r.country === 'AUS')
    .sort((a, b) => a.place! - b.place!)
    .map((row, i) => ({
      placeOrder: i + 1,
      overallPosition: row.place!,
      row,
    }))

  const internationals = finishers
    .filter((r) => r.country !== 'AUS')
    .sort((a, b) => a.place! - b.place!)
    .filter((r) => isCombined || r.place! <= 3)
    .map((row) => ({
      placeOrder: row.place! <= 3 ? row.place! : ('-' as const),
      overallPosition: row.place!,
      row,
    }))

  return [...australians, ...internationals]
}
