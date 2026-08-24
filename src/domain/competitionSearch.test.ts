import { describe, expect, it } from 'vitest'
import { formatMeetingDateTime, formatWallTime } from './competitionSearch'

/**
 * A meeting's own timestamps are UTC, like the schedule's, and carry no zone
 * marker — printing them as-is is a whole day out for an Australian meet.
 * Every case below is checked against what Roster's own page prints.
 */
describe('competition dates and times', () => {
  it('converts the meeting time with the venue timezone', () => {
    // Roster: "04/09/2026, 9:00 AM AEST - 04/12/2026, 3:00 PM AEST"
    expect(
      formatMeetingDateTime(
        '2026-04-08 23:00:00',
        '2026-04-12 05:00:00',
        'Australia/Sydney',
      ),
    ).toBe('09/04/2026, 9:00 AM – 12/04/2026, 3:00 PM')

    // Roster: "01/31/2026, 2:00 PM AWST"
    expect(formatWallTime('2026-01-31 06:00:00', 'Australia/Perth')).toBe(
      '31/01/2026, 2:00 PM',
    )

    // Roster lists this one on 22 August, not the 21st the raw string shows.
    expect(formatWallTime('2026-08-21 23:15:00', 'Australia/Melbourne')).toBe(
      '22/08/2026, 9:15 AM',
    )
  })

  it('shows the UTC instant rather than a guess when no timezone is known', () => {
    expect(formatWallTime('2026-04-08 23:00:00', undefined)).toBe(
      '08/04/2026, 11:00 PM',
    )
  })

  it('shows nothing rather than a wrong time', () => {
    expect(formatWallTime(undefined, 'Australia/Sydney')).toBe('')
    expect(formatMeetingDateTime(undefined, undefined, 'Australia/Sydney')).toBe('')
  })

  it('drops the range when a meeting has no end time', () => {
    expect(
      formatMeetingDateTime('2026-01-31 06:00:00', undefined, 'Australia/Perth'),
    ).toBe('31/01/2026, 2:00 PM')
  })
})
