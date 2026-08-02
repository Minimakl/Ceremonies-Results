import { describe, expect, it } from 'vitest'
import type {
  MeetingDetailsDto,
  ResultsPayload,
  SchedulePayload,
  SportEventDto,
} from '../api/types'
import { buildEventRows, buildFinals } from './model'
import relay4x400 from '../fixtures/conformance/relay-4x400-337077.json'
import sprint100m from '../fixtures/conformance/sprint-100m-337277.json'
import longJump from '../fixtures/conformance/longjump-337387.json'
import mid1500m from '../fixtures/conformance/mid-1500m-316510.json'
import highJump from '../fixtures/conformance/highjump-336995.json'

/**
 * Conformance suite.
 *
 * Every payload here is a verbatim capture of Roster's live results-v2
 * response, and every expectation is what Roster's own results page renders
 * for that event. A ceremonies manager reads these values aloud, so any drift
 * between the dashboard and Roster is a defect — this suite is what makes that
 * drift fail the build rather than surface on a podium.
 *
 * Coverage is by **result type and payload shape**, not by event name, because
 * that is what the formatting actually keys off:
 *
 *   Duration / Lowest   — sprint (100m), middle distance (1500m), relay
 *   Distance / Highest  — horizontal jump (long jump), vertical jump (high jump)
 *   Numeric  / Highest  — combined events (covered in ceremonies.test.ts)
 *   Relay payload shape — team rows rather than athlete rows
 *   Terminal statuses   — DNS, NM
 */

function sportEvent(partial: Partial<SportEventDto> & { eventIdPk: number }) {
  return {
    eventName: 'Event',
    lanes: false,
    relay: false,
    combined: false,
    ...partial,
  } as SportEventDto
}

/** Build the one final under test, exactly as the app builds it from Roster. */
function final(opts: {
  meId: number
  meetingId: number
  eventIdFk: number
  gender: string
  se: Partial<SportEventDto>
}) {
  const details: MeetingDetailsDto = {
    meetingId: opts.meetingId,
    meetingName: 'Test',
    tz: 'Australia/Sydney',
    ageGroups: [{ ageGroupIdPk: 245, name: 'Senior' }],
    sportEvents: [sportEvent({ eventIdPk: opts.eventIdFk, ...opts.se })],
  }
  const schedule: SchedulePayload = {
    type: 'Full',
    data: [
      {
        op: 'Create',
        entityIdPk: opts.meId,
        entityDto: {
          meetingEventIdPk: opts.meId,
          meetingIdFk: opts.meetingId,
          eventIdFk: opts.eventIdFk,
          ageGroupIdFk: 245,
          eventStage: 'Final',
          gender: opts.gender as 'Male' | 'Female' | 'Mixed',
          visibility: 'Full',
          hasResults: true,
          resultsComplete: true,
        },
      },
    ],
  }
  return buildFinals(schedule, details)[0]
}

/** [place, participant, country, club, result] — the row an operator reads. */
function readable(rows: ReturnType<typeof buildEventRows>) {
  return rows.map((r) => [r.place ?? '', r.name, r.country, r.club, r.result])
}

describe('conformance with Roster — Duration events', () => {
  it('100m Final Men Senior (27550/337277) matches Roster row for row', () => {
    const ev = final({
      meId: 337277,
      meetingId: 27550,
      eventIdFk: 1,
      gender: 'Male',
      se: {
        eventName: '100m',
        eventType: 'Sprint',
        resultType: 'Duration',
        scoring: 'Lowest',
        lanes: true,
      },
    })
    expect(readable(buildEventRows(ev, sprint100m as ResultsPayload))).toEqual([
      [1, 'Lachlan KENNEDY', 'AUS', 'QLD', '9.96'],
      [2, 'Joshua AZZOPARDI', 'AUS', 'NSW', '10.16'],
      [3, 'Rohan BROWNING', 'AUS', 'NSW', '10.19'],
      [4, 'Connor BOND', 'AUS', 'NSW', '10.33'],
      // Roster splits 5th and 6th on thousandths: "10.34 (.334)" / "10.34 (.337)"
      [5, 'Jai GORDON', 'AUS', 'QLD', '10.34 (.334)'],
      [6, 'Jacob DESPARD', 'AUS', 'TAS', '10.34 (.337)'],
      [7, 'Christopher IUS', 'AUS', 'NSW', '10.36'],
      [8, 'Sebastian MILVERTON', 'AUS', 'QLD', '10.49'],
      [9, 'Joseph AYOADE', 'AUS', 'NSW', '10.50'],
    ])
  })

  it('1500m Final Men U18 (27351/316510) matches Roster, including DNS', () => {
    const ev = final({
      meId: 316510,
      meetingId: 27351,
      eventIdFk: 21,
      gender: 'Male',
      se: {
        eventName: '1500m',
        eventType: 'Distance',
        resultType: 'Duration',
        scoring: 'Lowest',
      },
    })
    const rows = buildEventRows(ev, mid1500m as ResultsPayload)
    expect(rows.map((r) => [r.place ?? '', r.name, r.result])).toEqual([
      [1, 'Matthew STONER', '4:12.45'],
      [2, 'Callum CUMMING', '4:19.50'],
      [3, 'Oliver LEFORT', '4:20.44'],
      [4, 'Lachlan ANGELATOS', '4:23.36'],
      [5, 'Daniel DAVIES', '4:24.21'],
      [6, 'Jack MALLABONE', '4:25.34'],
      ['', 'Ezra GREIVE', 'DNS'],
      ['', 'Kalen BENNET', 'DNS'],
    ])
    // Start-list bests use the same scale as results.
    expect(rows[0].sb).toBe('3:56.70')
  })

  it('4x400m MIXED TEAM Final (27550/337077) lists teams, not runners', () => {
    const ev = final({
      meId: 337077,
      meetingId: 27550,
      eventIdFk: 2142,
      gender: 'Mixed',
      se: {
        eventName: '4x400m MIXED TEAM',
        eventType: 'Sprint',
        resultType: 'Duration',
        scoring: 'Lowest',
        lanes: true,
        relay: true,
      },
    })
    // 25 participant rows in the payload — 5 teams and their 20 legs.
    expect(readable(buildEventRows(ev, relay4x400 as ResultsPayload))).toEqual([
      [1, 'New South Wales', 'AUS', 'NSW', '3:19.60'],
      [2, 'Queensland', 'AUS', 'QLD', '3:22.77'],
      [3, 'Victoria', 'AUS', 'VIC', '3:23.99'],
      [4, 'New Zealand', 'NZL', '', '3:26.21'],
      [5, 'Western Australia', 'AUS', 'WA', '3:26.80'],
    ])
  })
})

describe('conformance with Roster — Distance events', () => {
  it('Long Jump Final Men Senior (27550/337387) takes the best of six attempts', () => {
    const ev = final({
      meId: 337387,
      meetingId: 27550,
      eventIdFk: 41,
      gender: 'Male',
      se: {
        eventName: 'Long Jump',
        eventType: 'Jump',
        resultType: 'Distance',
        scoring: 'Highest',
      },
    })
    const rows = buildEventRows(ev, longJump as ResultsPayload)
    expect(rows.slice(0, 5).map((r) => [r.place, r.name, r.result])).toEqual([
      [1, 'Liam ADCOCK', '8.26'],
      [2, 'Christopher MITREVSKI', '8.12'],
      [3, 'Jalen RUCKER', '7.86'],
      [4, 'Alex EPITROPAKIS', '7.80'],
      [5, 'Harrison WILLIAMS', '7.69'],
    ])
  })

  it('High Jump Final Men Senior (27550/336995) takes the best height, and NM', () => {
    const ev = final({
      meId: 336995,
      meetingId: 27550,
      eventIdFk: 40,
      gender: 'Male',
      se: {
        eventName: 'High Jump',
        eventType: 'Jump',
        resultType: 'Distance',
        scoring: 'Highest',
        verticalJump: true,
      },
    })
    const rows = buildEventRows(ev, highJump as ResultsPayload)
    expect(readable(rows)).toEqual([
      [1, 'Roman ANASTASIOS', 'AUS', 'VIC', '2.20'],
      [2, 'Yual REATH', 'AUS', 'VIC', '2.16'],
      [3, 'Brandon STARC', 'AUS', 'NSW', '2.12'],
      [4, 'Simioluwa THOMSEN-AJAYI', 'AUS', 'QLD', '2.12'],
      [5, 'Angus CLARK', 'AUS', 'NSW', '2.08'],
      [6, 'Rafe COUILLAULT', 'NZL', '', '2.04'],
      [7, 'Connor LARSEN', 'AUS', 'QLD', '2.00'],
      [8, 'Liam BENNETT', 'AUS', 'NSW', '2.00'],
      [9, 'Jordan CHRISTOPHER', 'AUS', 'TAS', '1.95'],
      [10, 'Jake HAMBROOK-SMITH', 'AUS', 'QLD', '1.95'],
      [11, 'Jonathan TITMARSH', 'AUS', 'NSW', '1.95'],
      [12, 'Joshua SUTO', 'AUS', 'NSW', '1.90'],
      // Roster shows NM for an athlete who cleared nothing.
      ['', 'Tom LATCHAM', 'AUS', 'QLD', 'NM'],
    ])
  })
})

describe('conformance with Roster — PB/SB notes', () => {
  it('marks records the way Roster does', () => {
    const ev = final({
      meId: 316510,
      meetingId: 27351,
      eventIdFk: 21,
      gender: 'Male',
      se: { eventName: '1500m', resultType: 'Duration', scoring: 'Lowest' },
    })
    const rows = buildEventRows(ev, mid1500m as ResultsPayload)
    // All six finishers ran a PB in this race.
    expect(rows.slice(0, 6).map((r) => r.notes)).toEqual([
      'PB',
      'PB',
      'PB',
      'PB',
      'PB',
      'PB',
    ])
  })
})
