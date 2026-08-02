import { describe, expect, it } from 'vitest'
import type { FinalEvent } from './model'
import type { EventRow } from './model'
import { autoColour, canPromote, displayColour, refineWithRows } from './status'

function ev(partial: Partial<FinalEvent>): FinalEvent {
  return {
    meId: 1,
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
    startDateTime: '2026-04-09 01:05:00',
    timePubliclyVisible: true,
    hasResults: false,
    resultsComplete: false,
    raw: {} as FinalEvent['raw'],
    ...partial,
  }
}

function row(partial: Partial<EventRow>): EventRow {
  return {
    participantId: 1,
    name: 'A',
    country: 'AUS',
    club: '',
    clubLong: '',
    result: '',
    notes: '',
    pb: '',
    sb: '',
    startStatus: 'Ok',
    isFinisher: false,
    ...partial,
  }
}

const BEFORE = new Date('2026-04-08T00:00:00Z')
const AFTER = new Date('2026-04-10T00:00:00Z')

describe('automatic colours (plan §4)', () => {
  it('red before start with no results', () => {
    expect(autoColour(ev({}), BEFORE)).toBe('red')
  })

  it('orange once past start time', () => {
    expect(autoColour(ev({}), AFTER)).toBe('orange')
  })

  it('orange when partial results exist even before start time', () => {
    expect(autoColour(ev({ hasResults: true }), BEFORE)).toBe('orange')
  })

  it('green when Roster marks results complete', () => {
    expect(autoColour(ev({ resultsComplete: true, hasResults: true }), AFTER)).toBe(
      'green',
    )
  })

  it('orange refines to yellow when all athletes have a final outcome', () => {
    const settled = [
      row({ isFinisher: true }),
      row({ startStatus: 'DidNotFinish' }),
    ]
    expect(refineWithRows('orange', settled)).toBe('yellow')
    const running = [row({ isFinisher: true }), row({})]
    expect(refineWithRows('orange', running)).toBe('orange')
    expect(refineWithRows('green', running)).toBe('green')
  })
})

describe('pink promotion (plan §4 hard rule)', () => {
  it('only green can be promoted', () => {
    expect(canPromote('green')).toBe(true)
    expect(canPromote('red')).toBe(false)
    expect(canPromote('orange')).toBe(false)
    expect(canPromote('yellow')).toBe(false)
  })

  it('pink displays only while the event is green', () => {
    expect(displayColour('green', true)).toBe('pink')
    expect(displayColour('green', false)).toBe('green')
    expect(displayColour('orange', true)).toBe('orange')
    expect(displayColour('red', true)).toBe('red')
  })
})
