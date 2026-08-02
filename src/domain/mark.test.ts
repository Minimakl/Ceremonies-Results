import { describe, expect, it } from 'vitest'
import { formatDuration, formatMark } from './format'

/**
 * Every value below is a raw integer taken from the live Roster API, paired
 * with what Roster itself renders for it. Sources:
 *   1500m Final Men U18  — competition 27351, meId 316510
 *   100m  Final Men Sen  — competition 27550, meId 337277
 *   Long Jump Men Sen    — competition 27550, meId 337387
 *   Discus Men Sen       — competition 27236, meId 371113 (plan §7.4)
 */
describe('result formatting matches Roster', () => {
  it('formats middle-distance times (ten-thousandths of a second)', () => {
    expect(formatMark(2524500, 'Duration')).toBe('4:12.45') // Matthew STONER
    expect(formatMark(2595000, 'Duration')).toBe('4:19.50') // Callum CUMMING
    expect(formatMark(2604400, 'Duration')).toBe('4:20.44') // Oliver LEFORT
    expect(formatMark(2633600, 'Duration')).toBe('4:23.36') // Lachlan ANGELATOS
    expect(formatMark(2642100, 'Duration')).toBe('4:24.21') // Daniel DAVIES
    expect(formatMark(2653400, 'Duration')).toBe('4:25.34') // Jack MALLABONE
  })

  it('formats sprint times', () => {
    expect(formatMark(99600, 'Duration')).toBe('9.96') // Lachlan KENNEDY
    expect(formatMark(101600, 'Duration')).toBe('10.16')
    expect(formatMark(103300, 'Duration')).toBe('10.33')
    expect(formatMark(105000, 'Duration')).toBe('10.50')
  })

  it('rounds up to the displayed precision, as World Athletics requires', () => {
    // 10.3340 must not read 10.33 — Roster shows 10.34.
    expect(formatDuration(103340, 2)).toBe('10.34')
    expect(formatDuration(103301, 2)).toBe('10.34')
    expect(formatDuration(103300, 2)).toBe('10.33')
  })

  it('shows the finer reading when places are split on thousandths', () => {
    // Roster renders "10.34 (.334)" and "10.34 (.337)" for 5th and 6th.
    expect(formatMark(103340, 'Duration', 3)).toBe('10.34 (.334)')
    expect(formatMark(103370, 'Duration', 3)).toBe('10.34 (.337)')
  })

  it('handles hand timing and long races', () => {
    expect(formatDuration(105000, 1)).toBe('10.5')
    // 2:03:17.40 marathon-length duration
    expect(formatDuration(73974000, 2)).toBe('2:03:17.40')
    expect(formatDuration(600000, 2)).toBe('1:00.00')
  })

  it('formats distances in centimetres and combined scores unscaled', () => {
    expect(formatMark(826, 'Distance')).toBe('8.26') // Liam ADCOCK long jump
    expect(formatMark(6751, 'Distance')).toBe('67.51') // Matthew DENNY discus
    expect(formatMark(6959, 'Numeric')).toBe('6959') // Sam TALBOT decathlon
  })
})
