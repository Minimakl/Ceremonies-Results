import { describe, expect, it } from 'vitest'
import type { Gender, MeetingDetailsDto, SchedulePayload } from '../api/types'
import { buildFinals } from './model'
import { genderProfileForAgeGroup } from './format'

/**
 * Gender wording, exactly as Roster's schedule words it (plan §9.1a).
 *
 * Roster renders the SAME event differently on its two surfaces — verified on
 * 27351/334388 (Triple Jump U18): "Girls · U18" on the schedule, "Women ·
 * U18" on the results header. The schedule wording is the one derived from
 * the age group's range, and it is what the dashboard uses.
 *
 * Every age group below is a verbatim record from a live meet, and every
 * expected word was read off that meet's schedule page.
 */

// Age-group records exactly as the three meets carry them.
const AGE_GROUPS = [
  // 27809 Coles Junior Challenge — schedule reads Boys/Girls
  { ageGroupIdPk: 2024, name: 'Meeting_7', category: 'Meeting', rangeStart: 5, rangeEnd: 6, rangeStartFemale: 5, rangeEndFemale: 6 },
  { ageGroupIdPk: 237, name: 'Meeting_8', category: 'Meeting', rangeStart: 6, rangeEnd: 7, rangeStartFemale: 6, rangeEndFemale: 7 },
  // 28662 WA Road Walking — U18 reads Boys/Girls, U20 and Senior read Men/Women
  { ageGroupIdPk: 101, name: 'Meeting_18', category: 'Meeting', rangeStart: 16, rangeEnd: 17, rangeStartFemale: 16, rangeEndFemale: 17 },
  { ageGroupIdPk: 102, name: 'Meeting_20', category: 'Meeting', rangeStart: 18, rangeEnd: 19, rangeStartFemale: 18, rangeEndFemale: 19 },
  { ageGroupIdPk: 103, name: 'Senior', category: 'Senior', rangeStart: 23, rangeEnd: 29, rangeStartFemale: 23, rangeEndFemale: 29 },
  // 27550 Aus Champs — PA Senior reads Women/Men despite profiles "Extended"
  { ageGroupIdPk: 1651, name: 'PA_Senior', category: 'Senior', rangeStart: 23, rangeEnd: 29, rangeStartFemale: 23, rangeEndFemale: 29 },
  // A group with no range on record must never be guessed younger.
  { ageGroupIdPk: 999, name: 'Meeting_16', category: 'Meeting' },
]

function finalFor(ageGroupIdPk: number, gender: Gender) {
  const details: MeetingDetailsDto = {
    meetingId: 1,
    meetingName: 'Wording',
    tz: 'Australia/Perth',
    ageGroups: AGE_GROUPS,
    sportEvents: [
      {
        eventIdPk: 21,
        eventName: '1500m',
        resultType: 'Duration',
        scoring: 'Lowest',
      },
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
        },
      },
    ],
  }
  return buildFinals(schedule, details)[0]
}

describe("gender wording follows the age group's range, as Roster's schedule does", () => {
  it('a group whose oldest athlete is under 18 reads Girls/Boys', () => {
    expect(finalFor(2024, 'Female').gender).toBe('Girls') // U7
    expect(finalFor(237, 'Male').gender).toBe('Boys') // U8
    expect(finalFor(101, 'Female').gender).toBe('Girls') // U18 (16–17)
    expect(finalFor(101, 'Male').gender).toBe('Boys')
  })

  it('U20 and above read Women/Men — 18 is the boundary Roster draws', () => {
    expect(finalFor(102, 'Female').gender).toBe('Women') // U20 (18–19)
    expect(finalFor(102, 'Male').gender).toBe('Men')
    expect(finalFor(103, 'Female').gender).toBe('Women') // Senior
    expect(finalFor(1651, 'Male').gender).toBe('Men') // PA Senior
  })

  it('a group with no range falls back to adult wording, never guessed younger', () => {
    expect(finalFor(999, 'Female').gender).toBe('Women')
  })

  it('the script possessive follows the same wording', async () => {
    const { generateScript } = await import('./script')
    const youth = finalFor(101, 'Female')
    // No results — the medallists script still opens with the title.
    const script = generateScript(youth, [])
    expect(script).toContain("Girls' U18 1500m")
    const senior = finalFor(103, 'Female')
    // Senior reads as Open in scripts, per the §9.3 transform.
    expect(generateScript(senior, [])).toContain("Women's Open 1500m")
  })

  it('the raw profile rule matches every observed case', () => {
    expect(genderProfileForAgeGroup('Female', { rangeEnd: 17 })).toBe('Youth')
    expect(genderProfileForAgeGroup('Male', { rangeEnd: 18 })).toBe('Senior')
    expect(genderProfileForAgeGroup('Male', undefined)).toBe('Senior')
    expect(genderProfileForAgeGroup('Male', {})).toBe('Senior')
  })
})
