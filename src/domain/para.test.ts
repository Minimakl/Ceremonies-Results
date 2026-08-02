import { describe, expect, it } from 'vitest'
import { extractParaPercentage } from './para'

describe('para percentage extraction (plan §8)', () => {
  it('extracts XX.XX from notes', () => {
    expect(extractParaPercentage('69.31')).toBe('69.31')
    expect(extractParaPercentage('90.84')).toBe('90.84')
  })

  it('strips other note text including implement weight', () => {
    expect(extractParaPercentage('2kg 69.31')).toBe('69.31')
    expect(extractParaPercentage('69.31 F57')).toBe('69.31')
    expect(extractParaPercentage('T38, 90.84, wind assisted')).toBe('90.84')
  })

  it('does not mistake implement weights or times for percentages', () => {
    expect(extractParaPercentage('2kg')).toBeUndefined()
    expect(extractParaPercentage('')).toBeUndefined()
    expect(extractParaPercentage(undefined)).toBeUndefined()
    // three decimals is not the XX.XX shape
    expect(extractParaPercentage('1.234')).toBeUndefined()
  })
})
