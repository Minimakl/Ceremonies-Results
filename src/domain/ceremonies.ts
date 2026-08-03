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

/**
 * The rows an operator actually presents medals to (plan §6.3, revised): the
 * top three of the ceremonies order, plus any international who placed in the
 * top three overall. Everyone else is dropped — a ceremonies manager reading a
 * full field has to find the three names that matter, which is the mistake
 * this tool exists to prevent.
 *
 * One condition covers both: an Australian's `placeOrder` is their renumbered
 * national place, and an international's is their overall place when that is
 * 1–3 and a hyphen otherwise. So a numeric place order of 3 or better is
 * exactly "gets a medal".
 *
 * The full list is still what the scripts are generated from — the combined
 * events script reads the non-medallists aloud (§9.1).
 */
export function medallistRows(ceremonies: CeremonyRow[]): CeremonyRow[] {
  return ceremonies.filter(
    (c) => typeof c.placeOrder === 'number' && c.placeOrder <= 3,
  )
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
