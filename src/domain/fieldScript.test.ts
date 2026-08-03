import { describe, expect, it } from 'vitest'
import type {
  Gender,
  MeetingDetailsDto,
  ResultsPayload,
  SchedulePayload,
} from '../api/types'
import { buildEventRows, buildFinals } from './model'
import { buildCeremoniesList } from './ceremonies'
import { generateScript, usesFieldScript } from './script'
import { spokenDistance } from './format'
import longJump from '../fixtures/conformance/longjump-337387.json'
import highJump from '../fixtures/conformance/highjump-336995.json'

/** The 2026 Australian Championships event under test, as the app builds it. */
function final(name: string, meId: number, gender: Gender = 'Male') {
  const details: MeetingDetailsDto = {
    meetingId: 27550,
    meetingName: '2026 Australian Athletics Championships',
    tz: 'Australia/Sydney',
    ageGroups: [{ ageGroupIdPk: 245, name: 'Senior' }],
    sportEvents: [
      {
        eventIdPk: 41,
        eventName: name,
        eventType: 'Jump',
        resultType: 'Distance',
        scoring: 'Highest',
      },
    ],
  }
  const schedule: SchedulePayload = {
    type: 'Full',
    data: [
      {
        op: 'Create',
        entityIdPk: meId,
        entityDto: {
          meetingEventIdPk: meId,
          meetingIdFk: 27550,
          eventIdFk: 41,
          ageGroupIdFk: 245,
          eventStage: 'Final',
          gender,
          visibility: 'Full',
          hasResults: true,
          resultsComplete: true,
        },
      },
    ],
  }
  return buildFinals(schedule, details)[0]
}

describe('field medallists script (§9.6)', () => {
  // Long Jump Final Men Senior (27550/337387). Marks are the best of six
  // attempts, exactly as the Results tab shows them: 8.26, 8.12, 7.86.
  it('reads bronze, silver then gold with the best mark spoken in metres', () => {
    const ev = final('Long Jump', 337387)
    const rows = buildEventRows(ev, longJump as ResultsPayload)
    expect(generateScript(ev, buildCeremoniesList(rows, false))).toBe(
      `Your medallists for the Men's Open Long Jump Championship.

Third place and bronze medallist
with a best of
7 point 86 metres
representing
Queensland
Jalen RUCKER

Second place and silver medallist
with a best of
8 point 12 metres
representing
Victoria
Christopher MITREVSKI

First place and gold medallist
with a best of
8 point 26 metres
representing
New South Wales
Liam ADCOCK

Your medallists for the
Men's Open Long Jump`,
    )
  })

  // High Jump Final Men Senior (27550/336995) — a vertical jump, where the
  // best mark is a height cleared rather than a distance measured.
  it('reads a vertical jump the same way', () => {
    const ev = final('High Jump', 336995)
    const rows = buildEventRows(ev, highJump as ResultsPayload)
    const script = generateScript(ev, buildCeremoniesList(rows, false))
    expect(script).toContain(
      `First place and gold medallist
with a best of
2 point 20 metres
representing
Victoria
Roman ANASTASIOS`,
    )
    expect(script).toContain(`Your medallists for the Men's Open High Jump Championship.`)
  })

  it('applies to every field event on the list, and no others', () => {
    for (const [name, meId] of [
      ['High Jump', 336995],
      ['Long Jump', 337387],
      ['Triple Jump', 337388],
      ['Pole Vault', 337389],
      ['Shot Put', 337390],
      ['Discus Throw', 337391],
      ['Javelin Throw (600g)', 337384],
      ['Hammer Throw', 337097],
      ['Seated Shot Put', 337046],
      ['Seated Javelin Throw', 337053],
    ] as [string, number][]) {
      expect(usesFieldScript(final(name, meId))).toBe(true)
    }
    // Relays keep the placeholder; track events use the track script.
    for (const name of ['4x100m', '4x400m MIXED TEAM']) {
      expect(usesFieldScript(final(name, 1))).toBe(false)
      expect(generateScript(final(name, 1), [])).toBeNull()
    }
    expect(usesFieldScript(final('100m', 1))).toBe(false)
  })
})

describe('spoken distances', () => {
  it('says the mark exactly as the Results tab shows it', () => {
    expect(spokenDistance('8.26')).toBe('8 point 26 metres')
    expect(spokenDistance('2.20')).toBe('2 point 20 metres')
    expect(spokenDistance('67.51')).toBe('67 point 51 metres')
    // A whole-metre mark still reads its two decimals, as Roster prints them.
    expect(spokenDistance('15.00')).toBe('15 point 00 metres')
  })
})
