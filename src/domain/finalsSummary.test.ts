import { describe, expect, it } from 'vitest'
import type { MeetingDetailsDto, SchedulePayload } from '../api/types'
import { buildFinals } from './model'
import splitFinals from '../fixtures/conformance/schedule-split-finals.json'

/**
 * Finals Summary handling (plan §3.2).
 *
 * The fixture holds Roster's verbatim schedule records for three real cases:
 *
 *   27550 Shot Put, Men PA Senior  — summary 337021 + group finals 397061/397062
 *   27550 Shot Put, Women Senior   — 337065, a lone final (the control)
 *   27545 1500m,   Women U14       — summary 353923 + group finals 402642/402643
 *
 * Roster titles the summaries "Shot Put · Finals Summary" and "1500m · Finals
 * Summary", and medals are presented on them: at 27550/337021 Todd HODGETTS
 * out-throws Ryan BLAIR yet places below him on percentage, and at
 * 27545/353923 Layla DENT wins group A but finishes 3rd overall. Presenting
 * from a group final would crown the wrong athlete, so they must not appear.
 */
const details: MeetingDetailsDto = {
  meetingId: 27550,
  meetingName: 'Split finals',
  tz: 'Australia/Sydney',
  ageGroups: [
    { ageGroupIdPk: 245, name: 'Senior' },
    { ageGroupIdPk: 1651, name: 'PA_Senior' },
    { ageGroupIdPk: 240, name: 'Meeting_14' },
  ],
  sportEvents: [
    {
      eventIdPk: 50,
      eventName: 'Shot Put',
      eventType: 'Throw',
      resultType: 'Distance',
      scoring: 'Highest',
    },
    {
      eventIdPk: 21,
      eventName: '1500m',
      eventType: 'Distance',
      resultType: 'Duration',
      scoring: 'Lowest',
    },
  ],
}

const finals = buildFinals(splitFinals as SchedulePayload, details)
const byId = new Map(finals.map((f) => [f.meId, f]))

describe('finals summaries (plan §3.2)', () => {
  it('keeps the summary and drops the group finals behind it', () => {
    expect([...byId.keys()].sort()).toEqual([337021, 337065, 353923])
    for (const groupFinal of [397061, 397062, 402642, 402643]) {
      expect(byId.has(groupFinal)).toBe(false)
    }
  })

  it('labels a summary the way Roster titles it', () => {
    expect(byId.get(337021)!.stageLabel).toBe('Finals Summary')
    expect(byId.get(353923)!.stageLabel).toBe('Finals Summary')
  })

  it('leaves an unsplit final alone', () => {
    // Same event and stage group as the summary above, but the only final for
    // its age group and gender — so it is an ordinary Final, not a summary.
    expect(byId.get(337065)!.stageLabel).toBe('Final')
  })

  it('keeps every final when a split group has no summary', () => {
    const noSummary: SchedulePayload = {
      type: 'Full',
      data: (splitFinals as SchedulePayload).data.filter(
        (env) => env.entityDto.meetingEventIdPk !== 337021,
      ),
    }
    const ids = buildFinals(noSummary, details).map((f) => f.meId)
    expect(ids).toContain(397061)
    expect(ids).toContain(397062)
  })
})
