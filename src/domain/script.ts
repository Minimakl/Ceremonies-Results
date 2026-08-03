import type { CeremonyRow } from './ceremonies'
import type { FinalEvent } from './model'
import {
  ageGroupScriptLabel,
  expandState,
  genderPossessive,
  genderPronoun,
  ordinal,
  ordinalWord,
  spokenDistance,
  spokenDuration,
} from './format'

/**
 * Read-aloud script (plan §9). Three templates are defined so far — combined
 * events (§9), individual timed track events (§9.5) and individual field
 * events (§9.6). Relays still get a placeholder until their script is
 * supplied.
 */
export const SCRIPT_PLACEHOLDER =
  'Script coming soon.\n\n' +
  'The script for this event type (relays) has not been supplied yet. The ' +
  'Ceremonies tab has the full reading order in the meantime.'

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

/**
 * The individual field events that use the field medallists script (§9.6).
 * Matched on Roster's exact event name, before the implement is appended —
 * "Javelin Throw (600g)" is a Javelin Throw.
 */
export const FIELD_SCRIPT_EVENTS: ReadonlySet<string> = new Set([
  'High Jump',
  'Long Jump',
  'Triple Jump',
  'Pole Vault',
  'Shot Put',
  'Discus Throw',
  'Javelin Throw',
  'Hammer Throw',
  'Seated Shot Put',
  'Seated Javelin Throw',
])

/** Roster may append an implement to the name; match on the event itself. */
function baseEventName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, '').trim()
}

export function usesTrackScript(event: FinalEvent): boolean {
  return !event.isCombined && TRACK_SCRIPT_EVENTS.has(baseEventName(event.name))
}

export function usesFieldScript(event: FinalEvent): boolean {
  return !event.isCombined && FIELD_SCRIPT_EVENTS.has(baseEventName(event.name))
}

const MEDALLIST_LEAD: Record<number, string> = {
  3: 'Third place and bronze medallist',
  2: 'Second place and silver medallist',
  1: 'First place and gold medallist',
}

const MEDAL_NAME: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' }

/**
 * Reading cues (plan §9.7). The operator is reading down a long script live,
 * and the moment that matters most is where the medallists begin and end — a
 * paragraph break alone is too easy to run past.
 *
 * Two shapes, so a glance tells them apart: a solid rule around the medallist
 * section, a wavy one before the international athletes. They are plain text,
 * so they survive being copied or printed.
 */
const MEDALLIST_BREAK = '─'.repeat(16)
const INTERNATIONAL_BREAK = '~'.repeat(16)

/** "Men's Open Decathlon", "Men's U18 1500m", "Girls' U15 200m Hurdles". */
function scriptTitle(event: FinalEvent): string {
  return `${genderPossessive(event.genderRaw, event.genderProfile)} ${ageGroupScriptLabel(
    event.ageGroup,
  )} ${baseEventName(event.name)}`
}

/**
 * The medallists script shared by individual track (§9.5) and field (§9.6)
 * events: medallists only, read bronze → silver → gold, then any
 * international who medalled, then the closing title. The two differ only in
 * the opening line, the phrase introducing the mark, and how the mark is
 * spoken.
 */
function generateMedallistScript(
  event: FinalEvent,
  ceremonies: CeremonyRow[],
  template: {
    opening: (title: string) => string
    markLead: string
    spoken: (display: string) => string
  },
): string {
  const title = scriptTitle(event)
  const medallists = (
    ceremonies.filter(
      (c) => c.row.country === 'AUS' && typeof c.placeOrder === 'number',
    ) as (CeremonyRow & { placeOrder: number })[]
  )
    .filter((c) => c.placeOrder <= 3)
    .sort((a, b) => b.placeOrder - a.placeOrder) // 3rd → 2nd → 1st

  // An international only reaches the ceremonies list for an individual event
  // when they finished in the top 3 overall, so reaching here *is* medalling.
  // Read gold first, matching how the Australian medallists finish.
  const internationals = ceremonies
    .filter((c) => c.row.country !== 'AUS' && c.overallPosition <= 3)
    .sort((a, b) => a.overallPosition - b.overallPosition)

  const blocks: string[] = [template.opening(title)]

  for (const c of medallists) {
    blocks.push(
      `${MEDALLIST_LEAD[c.placeOrder]}\n` +
        `${template.markLead}\n` +
        `${template.spoken(c.row.result)}\n` +
        `representing\n` +
        `${expandState(c.row.club, c.row.clubLong)}\n` +
        c.row.name,
    )
  }

  const pronoun = genderPronoun(event.genderRaw)
  if (internationals.length > 0) blocks.push(INTERNATIONAL_BREAK)
  for (const c of internationals) {
    blocks.push(
      `We also recognise\n` +
        `${c.row.name}\n` +
        `representing\n` +
        `${c.row.country}\n` +
        `with a ${MEDAL_NAME[c.overallPosition]} medal\n` +
        `for ${pronoun} performance of\n` +
        template.spoken(c.row.result),
    )
  }

  blocks.push(`Your medallists for the\n${title}`)
  return blocks.join('\n\n')
}

/** §9.5 — "with a time of / 4 minutes 12 point 45 seconds". */
const TRACK_TEMPLATE = {
  opening: (title: string) => `Your medallists for the\n${title}\nChampionship`,
  markLead: 'with a time of',
  spoken: spokenDuration,
}

/**
 * §9.6 — "with a best of / 8 point 26 metres". The opening is a single
 * sentence here, not the three lines the track script uses, because that is
 * how the field template was supplied.
 */
const FIELD_TEMPLATE = {
  opening: (title: string) => `Your medallists for the ${title} Championship.`,
  markLead: 'with a best of',
  spoken: spokenDistance,
}

export function generateScript(
  event: FinalEvent,
  ceremonies: CeremonyRow[],
): string | null {
  if (usesTrackScript(event)) {
    return generateMedallistScript(event, ceremonies, TRACK_TEMPLATE)
  }
  if (usesFieldScript(event)) {
    return generateMedallistScript(event, ceremonies, FIELD_TEMPLATE)
  }
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
      `In ${ordinal(c.placeOrder)} place with a total of\n` +
        `${c.row.result} points\n` +
        `representing\n` +
        `${expandState(c.row.club, c.row.clubLong)}\n` +
        c.row.name,
    )
  }

  // The medallist section opens here. Nothing to separate if the field held
  // no one outside the medals.
  if (nonMedallists.length > 0) blocks.push(MEDALLIST_BREAK)
  blocks.push(`And now, your medallists for the\n${title}\nChampionship`)

  for (const c of medallists) {
    blocks.push(
      `${MEDALLIST_LEAD[c.placeOrder]}\n` +
        `with a total of\n` +
        `${c.row.result} points\n` +
        `representing\n` +
        `${expandState(c.row.club, c.row.clubLong)}\n` +
        c.row.name,
    )
  }

  // …and closes here, after the gold medallist.
  blocks.push(MEDALLIST_BREAK)
  blocks.push(`Your medallists for the\n${title}`)

  if (internationals.length > 0) {
    blocks.push(INTERNATIONAL_BREAK)
    blocks.push('We also recognise the following international athletes.')
    for (const c of internationals) {
      const lines = ['With a total of', `${c.row.result} points`]
      // §9.1 rule 4: only an international who placed in the top 3 is given a
      // place line — the rest are recognised without one.
      if (typeof c.placeOrder === 'number') {
        lines.push(`In ${ordinalWord(c.placeOrder)} place`)
      }
      lines.push('Representing', c.row.country, c.row.name)
      blocks.push(lines.join('\n'))
    }
  }

  blocks.push(`Congratulations to all of the finalists for the\n${title}`)

  return blocks.join('\n\n')
}
