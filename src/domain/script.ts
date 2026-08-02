import type { CeremonyRow } from './ceremonies'
import type { FinalEvent } from './model'
import {
  ageGroupScriptLabel,
  expandState,
  genderPossessive,
  ordinal,
  ordinalWord,
  spokenDuration,
} from './format'

/**
 * Read-aloud script (plan §9). Two templates are defined so far — combined
 * events (§9) and individual timed track events (§9.5). Field events and
 * relays still get a placeholder until their scripts are supplied.
 */
export const SCRIPT_PLACEHOLDER =
  'Script coming soon.\n\n' +
  'Scripts for this event type (individual field events, relays) have not ' +
  'been supplied yet. The Ceremonies tab has the full reading order in the ' +
  'meantime.'

/**
 * The individual timed events that use the track medallists script (§9.5).
 * Matched on Roster's exact event name. Relays are deliberately absent: they
 * were in the first draft of this list and removed, so they keep the
 * placeholder until a relay script is supplied.
 */
export const TRACK_SCRIPT_EVENTS: ReadonlySet<string> = new Set([
  '100m',
  '200m',
  '400m',
  '80m Hurdles',
  '90m Hurdles',
  '100m Hurdles',
  '110m Hurdles',
  '200m Hurdles',
  '400m Hurdles',
  '100m Wheelchair',
  '200m Wheelchair',
  '400m Wheelchair',
  '800m',
  '1500m',
  '3000m',
  '5000m',
  '2000m Steeplechase',
  '3000m Steeplechase',
  '3000m Race Walk',
  '5000m Race Walk',
  '800m Wheelchair',
])

/** Roster may append an implement to the name; match on the event itself. */
function baseEventName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, '').trim()
}

export function usesTrackScript(event: FinalEvent): boolean {
  return !event.isCombined && TRACK_SCRIPT_EVENTS.has(baseEventName(event.name))
}

const MEDALLIST_LEAD: Record<number, string> = {
  3: 'Third place and bronze medallist',
  2: 'Second place and silver medallist',
  1: 'First place and gold medallist',
}

/** "Men's Open Decathlon", "Men's U18 1500m". */
function scriptTitle(event: FinalEvent): string {
  return `${genderPossessive(event.genderRaw)} ${ageGroupScriptLabel(
    event.ageGroup,
  )} ${baseEventName(event.name)}`
}

/**
 * Track medallists script (§9.5) — medallists only, read bronze → silver →
 * gold, with the time spoken in words.
 */
function generateTrackScript(
  event: FinalEvent,
  ceremonies: CeremonyRow[],
): string {
  const title = scriptTitle(event)
  const medallists = (
    ceremonies.filter(
      (c) => c.row.country === 'AUS' && typeof c.placeOrder === 'number',
    ) as (CeremonyRow & { placeOrder: number })[]
  )
    .filter((c) => c.placeOrder <= 3)
    .sort((a, b) => b.placeOrder - a.placeOrder) // 3rd → 2nd → 1st

  const blocks: string[] = [`Your medallists for the\n${title}\nChampionship`]

  for (const c of medallists) {
    blocks.push(
      `${MEDALLIST_LEAD[c.placeOrder]} with a time of\n` +
        `${spokenDuration(c.row.result)}\n` +
        `representing\n` +
        `${expandState(c.row.club, c.row.clubLong)}\n` +
        c.row.name,
    )
  }

  blocks.push(`Your medallists for the\n${title}`)
  return blocks.join('\n\n')
}

export function generateScript(
  event: FinalEvent,
  ceremonies: CeremonyRow[],
): string | null {
  if (usesTrackScript(event)) return generateTrackScript(event, ceremonies)
  if (!event.isCombined) return null

  const title = scriptTitle(event)

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
