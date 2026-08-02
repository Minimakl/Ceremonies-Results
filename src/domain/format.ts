// Text and value formatting shared across the app and the script generator.

import type { ResultType, Scoring } from '../api/types'

/**
 * Roster's sport-event catalogue states the result type outright, and that is
 * what the app uses. This fallback only runs when a catalogue entry is missing
 * the field.
 *
 * Inferring from `eventType` alone is not safe — 42 events in Roster's
 * catalogue contradict it, including "One Hour" and "One Hour Race Walk",
 * which have eventType "Distance" but record a **distance covered**, not a
 * time. Getting that backwards would print a distance as a clock time.
 */
export function inferResultType(
  eventType: string | undefined,
  combined: boolean,
): ResultType {
  if (combined || eventType === 'Combined') return 'Numeric'
  if (eventType === 'Throw' || eventType === 'Jump') return 'Distance'
  return 'Duration'
}

export function inferScoring(resultType: ResultType): Scoring {
  return resultType === 'Duration' ? 'Lowest' : 'Highest'
}

/**
 * "Sam" + "Talbot" → "Sam TALBOT" (plan §7.3 wording), which is also how
 * Roster prints a name: given names as entered, surname in capitals. The
 * middle name is part of it — Roster's page for 27550/337075 reads
 * "Helena Rose BUTLER", not "Helena BUTLER".
 */
export function participantDisplayName(
  firstName: string | undefined,
  lastName: string | undefined,
  fallback: string | undefined,
  middleName?: string,
): string {
  if (firstName || lastName || middleName) {
    return [firstName, middleName, lastName?.toUpperCase()]
      .filter(Boolean)
      .join(' ')
  }
  if (fallback) {
    // "Sam Talbot" → "Sam TALBOT" (last word treated as surname)
    const parts = fallback.split(' ')
    if (parts.length > 1) {
      const last = parts.pop()!
      return `${parts.join(' ')} ${last.toUpperCase()}`
    }
    return fallback
  }
  return ''
}

/**
 * Roster's storage scales differ by result type, which is the whole trap here:
 *
 *   Durations  — ten-thousandths of a second. 2524500 → 4:12.45, 99600 → 9.96
 *   Distances  — centimetres.                 826     → 8.26 m, 6751 → 67.51 m
 *   Combined   — points, unscaled.            6959    → 6959
 *
 * Verified against live Roster pages (1500m 27351/316510, 100m 27550/337277,
 * long jump 27550/337387).
 */
const DURATION_UNITS_PER_SECOND = 10_000
const DISTANCE_UNITS_PER_METRE = 100

/**
 * Format a duration the way Roster — and World Athletics — do.
 *
 * Times are rounded **up** to the displayed precision, never to nearest: a
 * 10.3340 reads 10.34, not 10.33. When a race is timed to more than
 * hundredths to separate places, Roster appends the finer reading in
 * parentheses ("10.34 (.334)"), and so does this, because two athletes on the
 * same displayed time is exactly the moment an operator must not have to guess
 * who placed higher.
 */
export function formatDuration(raw: number, decimalDigits = 2): string {
  const shown = Math.min(Math.max(decimalDigits, 1), 2)
  const unitsPerShownDigit = DURATION_UNITS_PER_SECOND / 10 ** shown

  // Round up to the displayed precision, in integer units (no float drift).
  const rounded = Math.ceil(raw / unitsPerShownDigit) * unitsPerShownDigit
  const totalSeconds = Math.floor(rounded / DURATION_UNITS_PER_SECOND)
  const fraction = String(
    (rounded % DURATION_UNITS_PER_SECOND) / unitsPerShownDigit,
  ).padStart(shown, '0')

  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60)
  let time: string
  if (minutes === 0) {
    time = `${seconds}.${fraction}`
  } else if (minutes < 60) {
    time = `${minutes}:${String(seconds).padStart(2, '0')}.${fraction}`
  } else {
    time =
      `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}` +
      `:${String(seconds).padStart(2, '0')}.${fraction}`
  }

  if (decimalDigits > shown) {
    const finer = Math.floor(
      (raw % DURATION_UNITS_PER_SECOND) / 10 ** (4 - decimalDigits),
    )
    time += ` (.${String(finer).padStart(decimalDigits, '0')})`
  }
  return time
}

/**
 * Turn a displayed duration into the words a ceremonies manager says aloud:
 * "4:12.45" → "4 minutes 12 point 45 seconds", "10.34" → "10 point 45 seconds".
 *
 * Derived from the *displayed* string rather than the raw value, so the script
 * can never state a different time from the one on the Results tab. A
 * thousandths tie-break ("10.34 (.334)") is spoken as the official time — the
 * finer reading separates places on paper, it is not read out.
 */
export function spokenDuration(display: string): string {
  const core = display.replace(/\s*\(.*\)\s*$/, '').trim()
  const parts = core.split(':')
  const seconds = parts.pop() ?? ''
  const [whole, fraction] = seconds.split('.')
  const said: string[] = []

  const unit = (value: number, word: string) =>
    `${value} ${word}${value === 1 ? '' : 's'}`

  if (parts.length === 2) {
    said.push(unit(Number(parts[0]), 'hour'), unit(Number(parts[1]), 'minute'))
  } else if (parts.length === 1) {
    said.push(unit(Number(parts[0]), 'minute'))
  }

  said.push(
    fraction != null
      ? `${Number(whole)} point ${fraction} seconds`
      : `${Number(whole)} seconds`,
  )
  return said.join(' ')
}

/**
 * Turn a displayed distance into the words a ceremonies manager says aloud:
 * "8.26" → "8 point 26 metres". Like spokenDuration, this reads the displayed
 * string rather than the raw value, so the script cannot state a different
 * mark from the one on the Results tab.
 */
export function spokenDistance(display: string): string {
  const [whole, fraction] = display.trim().split('.')
  return fraction != null
    ? `${Number(whole)} point ${fraction} metres`
    : `${Number(whole)} metres`
}

/** Format a raw Roster integer mark for display, on the scale Roster stores it. */
export function formatMark(
  raw: number | undefined,
  resultType: ResultType,
  decimalDigits = 2,
): string {
  if (raw == null) return ''
  switch (resultType) {
    case 'Numeric':
      return String(raw)
    case 'Distance':
      return (raw / DISTANCE_UNITS_PER_METRE).toFixed(2)
    case 'Duration':
      return formatDuration(raw, decimalDigits)
  }
}

const START_STATUS_LABELS: Record<string, string> = {
  DidNotFinish: 'DNF',
  DidNotStart: 'DNS',
  Disqualified: 'DQ',
  NoMark: 'NM',
}

/** "DidNotFinish" → "DNF"; Ok / unknown → '' */
export function startStatusLabel(startStatus: string | undefined): string {
  if (!startStatus || startStatus === 'Ok') return ''
  return START_STATUS_LABELS[startStatus] ?? startStatus
}

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 22 → "22nd" */
export function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

const ORDINAL_WORDS = ['first', 'second', 'third'] as const

/** 1 → "first" (used for international medallists in the script). */
export function ordinalWord(n: number): string {
  return ORDINAL_WORDS[n - 1] ?? ordinal(n)
}

/**
 * Group letter on a Finals Summary. Roster labels the group finals A, B, …,
 * verified on 27550/337021 and 27545/353923, which both run groups 1 and 2 as
 * A and B. Group 0 means the event was not split, so it has no letter.
 */
export function groupLabel(groupNo: number | undefined): string {
  if (!groupNo || groupNo < 1) return ''
  return groupNo <= 26 ? String.fromCharCode(64 + groupNo) : String(groupNo)
}

/** Plan §9.3 state expansion. */
export const STATE_NAMES: Record<string, string> = {
  SA: 'South Australia',
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  WA: 'Western Australia',
  TAS: 'Tasmania',
  NT: 'Northern Territory',
  ACT: 'Australian Capital Territory',
}

export function expandState(code: string | undefined, fallback?: string): string {
  if (!code) return fallback ?? ''
  return STATE_NAMES[code] ?? fallback ?? code
}

/**
 * Roster's own gender profiles. Its event header renders with the "Senior"
 * profile, which is why a U18 girls' final reads "Women · U18" on Roster.
 */
export type GenderProfile = 'Senior' | 'Youth' | 'Both'

/**
 * Gender wording, reproducing Roster's `gender | header` transform verbatim so
 * the dashboard never words an event differently from the screen the operator
 * cross-checks against.
 */
export function genderLabel(
  gender: string,
  profile: GenderProfile = 'Senior',
): string {
  switch (gender) {
    case 'Male':
      return profile === 'Youth' ? 'Boys' : profile === 'Both' ? 'Men & Boys' : 'Men'
    case 'Female':
      return profile === 'Youth'
        ? 'Girls'
        : profile === 'Both'
          ? 'Women & Girls'
          : 'Women'
    case 'Mixed':
      return profile === 'Youth'
        ? 'Mixed Youth'
        : profile === 'Both'
          ? 'Mixed Adults & Youth'
          : 'Mixed'
    default:
      return gender
  }
}

/** Roster gender → script possessive ("Men's", "Boys'"). */
export function genderPossessive(
  gender: string,
  profile: GenderProfile = 'Senior',
): string {
  const label = genderLabel(gender, profile)
  if (label === 'Mixed' || label.includes('&')) return label
  return label.endsWith('s') ? `${label}'` : `${label}'s`
}

/**
 * Possessive pronoun for the "his/her performance" line (§9.5). Taken from the
 * event's gender, which is the only gender Roster states — it carries no
 * per-athlete pronoun. A mixed event reads "their", which is also the safe
 * reading if an event's gender is ever something this doesn't know.
 */
export function genderPronoun(gender: string): string {
  switch (gender) {
    case 'Male':
      return 'his'
    case 'Female':
      return 'her'
    default:
      return 'their'
  }
}

/** Plan §9.3: Senior → Open; other groups read as-is. */
export function ageGroupScriptLabel(ageGroup: string): string {
  return ageGroup === 'Senior' ? 'Open' : ageGroup
}

/**
 * Roster stores age-group names in an internal form and renders them by
 * turning `Meeting_N` into `UN` and underscores into spaces. Verified against
 * live Roster pages:
 *
 *   Senior     → Senior      Meeting_20 → U20        Meeting_18 → U18
 *   PA_Senior  → PA Senior   Master_35  → Master 35  School_12  → School 12
 *
 * Note "PA" is left as Roster writes it — Roster shows "Women · PA Senior",
 * not "Para Senior".
 */
export function formatAgeGroupName(raw: string | undefined): string {
  if (!raw) return ''
  return raw.replace(/Meeting_/g, 'U').replace(/_/g, ' ')
}

function trimZeros(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, '')
}

/**
 * Implement label. Roster stores the weight in **hundredths of the unit**, for
 * both units: 200 Kilogram → "2kg", 60 Kilogram → "0.6kg",
 * 50000 Gram → "500g", 80000 Gram → "800g".
 *
 * A ceremonies manager reads this off the screen to announce an event, so a
 * wrong weight is worse than no weight: anything outside the range of a real
 * athletics implement is treated as unresolvable and omitted rather than
 * guessed at.
 */
const IMPLEMENT_RANGES: Record<string, { min: number; max: number; suffix: string }> = {
  // 0.1 kg through 30 kg covers junior throws up to the 56 lb weight throw.
  Kilogram: { min: 0.1, max: 30, suffix: 'kg' },
  // 50 g through 2000 g covers junior javelins through heavy training spec.
  Gram: { min: 50, max: 2000, suffix: 'g' },
}

export function implementLabel(
  implement: number | undefined,
  unit: string | undefined,
): string {
  if (!implement || !unit) return ''
  const range = IMPLEMENT_RANGES[unit]
  if (!range) return ''
  const value = implement / 100
  if (!Number.isFinite(value) || value < range.min || value > range.max) return ''
  return `${trimZeros(value)}${range.suffix}`
}
