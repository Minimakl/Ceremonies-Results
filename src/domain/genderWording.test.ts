import { describe, expect, it } from 'vitest'
import type { Gender, MeetingDetailsDto, SchedulePayload } from '../api/types'
import { buildFinals } from './model'
import { isYouthAgeGroup, meGenderProfile } from './format'

/**
 * Gender wording, from Roster's own code (plan §9.1a).
 *
 * Roster words the SAME event differently on its two surfaces — verified on
 * 27351/334388 (Triple Jump U18): "Girls · U18" on the schedule, "Women ·
 * U18" on the event header. The dashboard keeps that split: `gender` carries
 * the schedule wording (cards), `genderHeader` the event-page wording.
 *
 * The schedule wording comes from Roster's meGender pipe and MeetingUtil.
 * isYouth, both ported verbatim from its app bundle (chunks PNYPKSGU and
 * JFIG74JM). The age-group records below are verbatim from live meets, and
 * every expected word was read off that meet's schedule page.
 */

const AGE_GROUPS = [
  // 27809 Coles Junior Challenge — schedule reads Boys/Girls
  { ageGroupIdPk: 2024, name: 'Meeting_7', category: 'Meeting', rangeType: 'Age', rangeStart: 5, rangeEnd: 6 },
  { ageGroupIdPk: 237, name: 'Meeting_8', category: 'Meeting', rangeType: 'Age', rangeStart: 6, rangeEnd: 7 },
  // 28662 WA Road Walking — U18 reads Boys/Girls, U20 and Senior read Men/Women
  { ageGroupIdPk: 101, name: 'Meeting_18', category: 'Meeting', rangeType: 'Age', rangeStart: 16, rangeEnd: 17 },
  { ageGroupIdPk: 102, name: 'Meeting_20', category: 'Meeting', rangeType: 'Age', rangeStart: 18, rangeEnd: 19 },
  { ageGroupIdPk: 103, name: 'Senior', category: 'Senior', rangeType: 'Age', rangeStart: 23, rangeEnd: 29 },
  // 27550 Aus Champs — PA Senior reads Women/Men despite profiles "Extended"
  { ageGroupIdPk: 1651, name: 'PA_Senior', category: 'Senior', rangeType: 'Age', rangeStart: 23, rangeEnd: 29 },
  // A birth-year group: rangeEnd is the year, aged from 1 January.
  { ageGroupIdPk: 500, name: 'Meeting_16', category: 'Meeting', rangeType: 'Year', rangeEnd: 2012 },
  // A group with no range on record must never be guessed younger.
  { ageGroupIdPk: 999, name: 'Meeting_16', category: 'Meeting' },
]

function finalFor(
  ageGroupIdPk: number,
  gender: Gender,
  extras: { multiAgeGroup?: boolean } = {},
) {
  const details: MeetingDetailsDto = {
    meetingId: 1,
    meetingName: 'Wording',
    tz: 'Australia/Perth',
    ageGroups: AGE_GROUPS,
    sportEvents: [
      { eventIdPk: 21, eventName: '1500m', resultType: 'Duration', scoring: 'Lowest' },
    ],
  }
  const schedule: SchedulePayload = {
    type: 'Full',
    data: [
      {
        op: 'Create',
        entityIdPk: 1,
        entityDto: {
          meetingEventIdPk: 1,
          meetingIdFk: 1,
          eventIdFk: 21,
          ageGroupIdFk: ageGroupIdPk,
          eventStage: 'Final',
          gender,
          visibility: 'Full',
          startDateTime: '2026-01-31 06:00:00',
          ...extras,
        },
      },
    ],
  }
  return buildFinals(schedule, details)[0]
}

describe("card wording — Roster's meGender pipe, ported verbatim", () => {
  it('an Age group whose rangeEnd is under 18 reads Girls/Boys', () => {
    expect(finalFor(2024, 'Female').gender).toBe('Girls') // U7
    expect(finalFor(237, 'Male').gender).toBe('Boys') // U8
    expect(finalFor(101, 'Female').gender).toBe('Girls') // U18 (16–17)
    expect(finalFor(101, 'Male').gender).toBe('Boys')
  })

  it('U20 and above read Women/Men — the boundary in Roster\'s isYouth', () => {
    expect(finalFor(102, 'Female').gender).toBe('Women') // U20 (18–19)
    expect(finalFor(102, 'Male').gender).toBe('Men')
    expect(finalFor(103, 'Female').gender).toBe('Women') // Senior
    expect(finalFor(1651, 'Male').gender).toBe('Men') // PA Senior
  })

  it("a birth-year group ages from 1 January, per Roster's other branch", () => {
    // Born 2012, event in 2026 → 14 years → youth.
    expect(finalFor(500, 'Female').gender).toBe('Girls')
  })

  it('a multi-age-group event always words Senior, as the pipe does', () => {
    expect(finalFor(101, 'Female', { multiAgeGroup: true }).gender).toBe('Women')
  })

  it('a group with no range falls back to adult wording, never guessed younger', () => {
    expect(finalFor(999, 'Female').gender).toBe('Women')
  })
})

describe("event-header wording — Roster's per-page split", () => {
  it('the header always words Senior, whatever the age group', () => {
    // The same U18 final: "Girls" on the card, "Women" on the event header —
    // exactly what Roster's own two pages show for 27351/334388.
    const u18 = finalFor(101, 'Female')
    expect(u18.gender).toBe('Girls')
    expect(u18.genderHeader).toBe('Women')
  })

  it('the script follows the header wording, since it lives on the event page', async () => {
    const { generateScript } = await import('./script')
    expect(generateScript(finalFor(101, 'Female'), [])).toContain(
      "Women's U18 1500m",
    )
  })
})

describe("Roster's isYouth, raw", () => {
  it('matches the code extracted from the bundle', () => {
    expect(isYouthAgeGroup({ rangeType: 'Age', rangeEnd: 17 }, 2026)).toBe(true)
    expect(isYouthAgeGroup({ rangeType: 'Age', rangeEnd: 18 }, 2026)).toBe(false)
    // Non-Age: rangeEnd is a birth year, whole years from 1 January.
    expect(isYouthAgeGroup({ rangeType: 'Year', rangeEnd: 2012 }, 2026)).toBe(true)
    expect(isYouthAgeGroup({ rangeType: 'Year', rangeEnd: 2000 }, 2026)).toBe(false)
    expect(isYouthAgeGroup(undefined, 2026)).toBe(false)
    expect(isYouthAgeGroup({}, 2026)).toBe(false)
  })

  it('multiAgeGroup short-circuits to Senior before isYouth is consulted', () => {
    expect(
      meGenderProfile({ multiAgeGroup: true }, { rangeType: 'Age', rangeEnd: 7 }, 2026),
    ).toBe('Senior')
    expect(
      meGenderProfile({}, { rangeType: 'Age', rangeEnd: 7 }, 2026),
    ).toBe('Youth')
  })
})
