import type { CeremonyRow } from './ceremonies'
import type { FinalEvent } from './model'
import {
  ageGroupScriptLabel,
  expandState,
  genderPossessive,
  ordinal,
  ordinalWord,
} from './format'

/**
 * Read-aloud script (plan §9). Defined for combined events only —
 * decathlon, heptathlon, pentathlon. Other event types get a placeholder
 * until their scripts are supplied (plan §9.4 / §12.4).
 */
export const SCRIPT_PLACEHOLDER =
  'Script coming soon.\n\n' +
  'Scripts for this event type (individual track, individual field, relays, ' +
  'para) have not been supplied yet. The Ceremonies tab has the full ' +
  'reading order in the meantime.'

const MEDALLIST_LEAD: Record<number, string> = {
  3: 'Third place and bronze medallist',
  2: 'Second place and silver medallist',
  1: 'First place and gold medallist',
}

export function generateScript(
  event: FinalEvent,
  ceremonies: CeremonyRow[],
): string | null {
  if (!event.isCombined) return null

  // Title base, e.g. "Men's Open Decathlon" — event name without any
  // implement parenthetical.
  const title = `${genderPossessive(event.genderRaw)} ${ageGroupScriptLabel(
    event.ageGroup,
  )} ${event.name.replace(/\s*\(.*\)$/, '')}`

  const australians = ceremonies.filter(
    (c) => c.row.country === 'AUS' && typeof c.placeOrder === 'number',
  ) as (CeremonyRow & { placeOrder: number })[]
  const internationals = ceremonies.filter((c) => c.row.country !== 'AUS')

  const nonMedallists = australians
    .filter((c) => c.placeOrder > 3)
    .sort((a, b) => b.placeOrder - a.placeOrder) // descending: 9th → 4th
  const medallists = australians
    .filter((c) => c.placeOrder <= 3)
    .sort((a, b) => b.placeOrder - a.placeOrder) // 3rd → 2nd → 1st

  const blocks: string[] = []

  blocks.push(`Your finalists for the\n${title}\nChampionship.`)

  for (const c of nonMedallists) {
    blocks.push(
      `In ${ordinal(c.placeOrder)} place with a total of ${c.row.result} points\n` +
        `representing ${expandState(c.row.club, c.row.clubLong)}\n` +
        c.row.name,
    )
  }

  blocks.push(`And now, your medallists for the\n${title}\nChampionship`)

  for (const c of medallists) {
    blocks.push(
      `${MEDALLIST_LEAD[c.placeOrder]}\n` +
        `with a total of ${c.row.result} points\n` +
        `representing ${expandState(c.row.club, c.row.clubLong)}\n` +
        c.row.name,
    )
  }

  blocks.push(`Your medallists for the\n${title}`)

  if (internationals.length > 0) {
    blocks.push('We also recognise the following international athletes.')
    for (const c of internationals) {
      const lines = [`With a total of ${c.row.result} points`]
      if (typeof c.placeOrder === 'number') {
        lines.push(`In ${ordinalWord(c.placeOrder)} place`)
      }
      lines.push(`Representing ${c.row.country}`, c.row.name)
      blocks.push(lines.join('\n'))
    }
  }

  blocks.push(`Congratulations to all of the finalists for the\n${title}`)

  return blocks.join('\n\n')
}
