import { describe, expect, it } from 'vitest'
import type {
  Gender,
  MeetingDetailsDto,
  ResultsPayload,
  SchedulePayload,
} from '../api/types'
import { buildEventRows, buildFinals } from './model'
import { buildCeremoniesList } from './ceremonies'
import { generateScript, usesTrackScript } from './script'
import { spokenDuration } from './format'
import mid1500m from '../fixtures/conformance/mid-1500m-316510.json'
import pa100m from '../fixtures/conformance/sprint-100m-pa-337273.json'

function final(
  name: string,
  ageGroupName = 'Meeting_18',
  gender: Gender = 'Male',
  meId = 316510,
) {
  const details: MeetingDetailsDto = {
    meetingId: 27351,
    meetingName: '2025 WA All Schools Championships',
    tz: 'Australia/Perth',
    ageGroups: [{ ageGroupIdPk: 242, name: ageGroupName }],
    sportEvents: [
      {
        eventIdPk: 21,
        eventName: name,
        eventType: 'Distance',
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
        entityIdPk: meId,
        entityDto: {
          meetingEventIdPk: meId,
          meetingIdFk: 27351,
          eventIdFk: 21,
          ageGroupIdFk: 242,
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

const EXPECTED = `Your medallists for the
Men's U18 1500m
Championship

Third place and bronze medallist with a time of
4 minutes 20 point 44 seconds
representing
Corpus Christi College
Oliver LEFORT

Second place and silver medallist with a time of
4 minutes 19 point 50 seconds
representing
Applecross Senior High School
Callum CUMMING

First place and gold medallist with a time of
4 minutes 12 point 45 seconds
representing
Wesley College
Matthew STONER

Your medallists for the
Men's U18 1500m`

describe('track medallists script (§9.5)', () => {
  // Club names are read in full — "Applecross Senior High School", not the
  // "Applecross SHS" abbreviation shown in the results table — because this
  // text is spoken aloud. State codes expand the same way (SA → South
  // Australia) via the §9.3 transform.
  it('reads bronze, silver then gold with the time spoken in words', () => {
    const ev = final('1500m')
    const rows = buildEventRows(ev, mid1500m as ResultsPayload)
    expect(generateScript(ev, buildCeremoniesList(rows, false))).toBe(EXPECTED)
  })

  it('applies to every timed individual event on the list, and no others', () => {
    for (const name of [
      '100m',
      '400m Hurdles',
      '2000m Steeplechase',
      '5000m Race Walk',
      '800m Wheelchair',
    ]) {
      expect(usesTrackScript(final(name))).toBe(true)
    }
    // Relays are not on the list and have no script of their own yet.
    for (const name of ['4x100m', '4x400m MIXED TEAM']) {
      expect(usesTrackScript(final(name))).toBe(false)
      expect(generateScript(final(name), [])).toBeNull()
    }
    // Field events are not on this list either — they use the §9.6 script.
    for (const name of ['Long Jump', 'Shot Put']) {
      expect(usesTrackScript(final(name))).toBe(false)
    }
  })

  it('matches an event whose Roster name carries an implement', () => {
    expect(usesTrackScript(final('110m Hurdles'))).toBe(true)
  })

  // 2026 Australian Athletics Championships, 100m Final Women PA Senior
  // (meId 337273): Danielle Aitchison (NZL) won outright, so the national
  // medals shift up a place and she is recognised separately. Every name,
  // club, country and time below is verbatim from Roster.
  it('recognises an international who medals, after the gold medallist', () => {
    const ev = final('100m', 'PA_Senior', 'Female', 337273)
    const rows = buildEventRows(ev, pa100m as ResultsPayload)
    expect(generateScript(ev, buildCeremoniesList(rows, false))).toBe(
      `Your medallists for the
Women's PA Senior 100m
Championship

Third place and bronze medallist with a time of
13 point 15 seconds
representing
Western Australia
Rhiannon CLARKE

Second place and silver medallist with a time of
14 point 47 seconds
representing
New South Wales
Mali LOVELL

First place and gold medallist with a time of
12 point 32 seconds
representing
New South Wales
Telaya BLACKSMITH

We also recognise
Danielle AITCHISON
representing
NZL
with a gold medal
for her performance of
13 point 23 seconds

Your medallists for the
Women's PA Senior 100m`,
    )
  })

  // The all-Australian 1500m above is the control: no recognition line at all.
  it('says nothing about internationals when every medallist is Australian', () => {
    const ev = final('1500m')
    const rows = buildEventRows(ev, mid1500m as ResultsPayload)
    const script = generateScript(ev, buildCeremoniesList(rows, false))
    expect(script).not.toContain('We also recognise')
  })
})

describe('spoken times', () => {
  it('omits the minutes for a sub-minute race', () => {
    expect(spokenDuration('10.34')).toBe('10 point 34 seconds')
    expect(spokenDuration('9.96')).toBe('9 point 96 seconds')
  })

  it('speaks minutes for longer races', () => {
    expect(spokenDuration('4:12.45')).toBe('4 minutes 12 point 45 seconds')
    expect(spokenDuration('1:00.00')).toBe('1 minute 0 point 00 seconds')
    expect(spokenDuration('4:05.71')).toBe('4 minutes 5 point 71 seconds')
  })

  it('speaks the official time, not the thousandths tie-break', () => {
    expect(spokenDuration('10.34 (.334)')).toBe('10 point 34 seconds')
  })

  it('handles hour-long races', () => {
    expect(spokenDuration('2:03:17.40')).toBe(
      '2 hours 3 minutes 17 point 40 seconds',
    )
  })
})
