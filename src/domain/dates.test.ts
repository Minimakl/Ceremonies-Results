import { describe, expect, it } from 'vitest'
import { competitionDays, eventDayKey, filterByDays, formatDayLabel } from './dates'
import type { FinalEvent } from './model'

function final(id: number, startDateTime: string): FinalEvent {
  return {
    meId: id,
    meetingId: 1,
    name: 'Test',
    label: '',
    gender: 'Men',
    genderRaw: 'Male',
    ageGroup: 'Senior',
    resultType: 'Duration',
    scoring: 'Lowest',
    isCombined: false,
    isRelay: false,
    hasLanes: true,
    stageLabel: 'Final',
    startDateTime,
    timePubliclyVisible: true,
    hasResults: false,
    resultsComplete: false,
    raw: {} as FinalEvent['raw'],
  }
}

describe('competition days (plan §3 — venue timezone)', () => {
  it('groups by the venue day, not the viewer day', () => {
    // 2026-04-08 23:00 UTC is 09:00 on 9 April in Sydney.
    expect(eventDayKey('2026-04-08 23:00:00', 'Australia/Sydney')).toBe('2026-04-09')
    expect(eventDayKey('2026-04-08 23:00:00', 'UTC')).toBe('2026-04-08')
    // Perth is UTC+8: 2025-10-31 17:00 UTC is 01:00 on 1 November.
    expect(eventDayKey('2025-10-31 17:00:00', 'Australia/Perth')).toBe('2025-11-01')
  })

  it('lists the distinct days of a competition, earliest first', () => {
    const finals = [
      final(3, '2026-04-10 01:00:00'),
      final(1, '2026-04-08 23:00:00'),
      final(2, '2026-04-09 04:00:00'),
    ]
    expect(competitionDays(finals, 'Australia/Sydney')).toEqual([
      '2026-04-09',
      '2026-04-10',
    ])
  })

  it('formats a day the way an Australian reads it', () => {
    expect(formatDayLabel('2026-04-09')).toBe('09/04/2026')
    expect(formatDayLabel('2024-12-06')).toBe('06/12/2024')
  })

  it('shows every day when nothing is selected', () => {
    const finals = [final(1, '2026-04-08 23:00:00'), final(2, '2026-04-10 01:00:00')]
    expect(filterByDays(finals, new Set(), 'Australia/Sydney')).toHaveLength(2)
  })

  it('narrows to the selected days', () => {
    const finals = [final(1, '2026-04-08 23:00:00'), final(2, '2026-04-10 01:00:00')]
    const only = filterByDays(finals, new Set(['2026-04-09']), 'Australia/Sydney')
    expect(only.map((f) => f.meId)).toEqual([1])
  })
})
