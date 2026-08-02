// Text and value formatting shared across the app and the script generator.

export type EventKind = 'track' | 'field' | 'combined'

/** Classify a Roster eventType (from the sport-event catalogue). */
export function eventKind(eventType: string | undefined, combined: boolean): EventKind {
  if (combined || eventType === 'Combined') return 'combined'
  if (
    eventType === 'Throw' ||
    eventType === 'Jump' ||
    eventType === 'HorizontalJump' ||
    eventType === 'VerticalJump'
  ) {
    return 'field'
  }
  return 'track'
}

/** "Sam" + "Talbot" → "Sam TALBOT" (plan §7.3 wording). */
export function participantDisplayName(
  firstName: string | undefined,
  lastName: string | undefined,
  fallback: string | undefined,
): string {
  if (firstName || lastName) {
    return [firstName, lastName?.toUpperCase()].filter(Boolean).join(' ')
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
 * Format a raw Roster integer mark for display.
 * Field events store centimetres (6751 → "67.51"); combined events store
 * points (6959 → "6959"); track events store centiseconds
 * (4571 → "45.71", 24571 → "4:05.71").
 */
export function formatMark(raw: number | undefined, kind: EventKind): string {
  if (raw == null) return ''
  switch (kind) {
    case 'combined':
      return String(raw)
    case 'field':
      return (raw / 100).toFixed(2)
    case 'track': {
      const totalSeconds = raw / 100
      if (totalSeconds < 60) return totalSeconds.toFixed(2)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds - minutes * 60
      if (minutes < 60) return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`
      const hours = Math.floor(minutes / 60)
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${seconds
        .toFixed(2)
        .padStart(5, '0')}`
    }
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
