import { describe, expect, it } from 'vitest'
import type {
  MeetingDetailsDto,
  ResultsPayload,
  SchedulePayload,
} from '../api/types'
import { buildEventRows, buildFinals, startListRows } from './model'
import { groupLabel } from './format'
import summary337021 from '../fixtures/conformance/shotput-summary-337021.json'
import longJump from '../fixtures/conformance/longjump-337387.json'

function final(opts: {
  meId: number
  eventIdFk: number
  eventName: string
  ageGroupIdFk: number
}) {
  const details: MeetingDetailsDto = {
    meetingId: 27550,
    meetingName: '2026 Australian Athletics Championships',
    tz: 'Australia/Sydney',
    ageGroups: [
      { ageGroupIdPk: 245, name: 'Senior' },
      { ageGroupIdPk: 1651, name: 'PA_Senior' },
    ],
    sportEvents: [
      {
        eventIdPk: opts.eventIdFk,
        eventName: opts.eventName,
        eventType: opts.eventName === 'Long Jump' ? 'Jump' : 'Throw',
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
        entityIdPk: opts.meId,
        entityDto: {
          meetingEventIdPk: opts.meId,
          meetingIdFk: 27550,
          eventIdFk: opts.eventIdFk,
          ageGroupIdFk: opts.ageGroupIdFk,
          eventStage: 'Final',
          gender: 'Male',
          visibility: 'Full',
          hasResults: true,
          resultsComplete: true,
        },
      },
    ],
  }
  return buildFinals(schedule, details)[0]
}

/**
 * Start-list order must match Roster's start-list page exactly. Both
 * expectations below are transcribed from those pages.
 */
describe('start list order', () => {
  // Shot Put · Finals Summary, Men · PA Senior (27550/337021). Roster's start
  // list runs group A order 1–12, then group B order 1–2 — so it opens with
  // Christopher ALBERT, not with the group B entry that also carries order 1.
  it('lists a finals summary by group, then order, as Roster does', () => {
    const ev = final({
      meId: 337021,
      eventIdFk: 50,
      eventName: 'Shot Put',
      ageGroupIdFk: 1651,
    })
    const rows = startListRows(buildEventRows(ev, summary337021 as ResultsPayload))
    expect(rows.map((r) => [r.name, groupLabel(r.group), r.lane])).toEqual([
      ['Christopher ALBERT', 'A', 1],
      ['Ryan BLAIR', 'A', 2],
      ['Tom BURROWS', 'A', 3],
      ['Malachi CANNING', 'A', 4],
      ['Cameron CROMBIE', 'A', 5],
      ['Mark EVERETT', 'A', 6],
      ['Daniel GANAMBARR', 'A', 7],
      ['Todd HODGETTS', 'A', 8],
      ['Benjamin KALENJUK', 'A', 9],
      ["Lee O'HALLORAN", 'A', 10],
      ['Hugo TAHENY', 'A', 11],
      ['Sam PAECH', 'A', 12],
      ['Stephen MARTIN', 'B', 1],
      ['Matt SHEPPARD', 'B', 2],
    ])
  })

  // Long Jump · Final, Men · Senior (27550/337387) — an unsplit event, where
  // every entry is group 0 and the order is Roster's order column.
  it('lists an unsplit final in Roster order', () => {
    const ev = final({
      meId: 337387,
      eventIdFk: 41,
      eventName: 'Long Jump',
      ageGroupIdFk: 245,
    })
    const rows = startListRows(buildEventRows(ev, longJump as ResultsPayload))
    expect(rows.map((r) => r.name)).toEqual([
      'Mason MCGRODER',
      'Harrison WILLIAMS',
      'Jacob HRISTIANOPOULOS',
      'Liam FAIRWEATHER',
      'Jalen RUCKER',
      'Aston ARCHER',
      'Christopher MITREVSKI',
      'Liam ADCOCK',
      'Samuel TAYLOR',
      'Alex EPITROPAKIS',
    ])
    // No groups, so no group column is shown.
    expect(rows.every((r) => (r.group ?? 0) === 0)).toBe(true)
  })
})

describe('group labels', () => {
  it('letters the groups the way Roster does', () => {
    expect(groupLabel(1)).toBe('A')
    expect(groupLabel(2)).toBe('B')
    // An unsplit event reports group 0 and has no letter.
    expect(groupLabel(0)).toBe('')
    expect(groupLabel(undefined)).toBe('')
  })
})
