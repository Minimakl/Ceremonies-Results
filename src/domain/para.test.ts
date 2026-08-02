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

  // Roster's own notes on the Men's PA Senior shot put (27550/337021), where
  // the implement weight itself has decimals. Roster shows 77.27 as Todd
  // HODGETTS' percentage and ranks him on it, not on the 7.26 kg shot.
  it('skips a decimal weight that carries a unit', () => {
    expect(extractParaPercentage('7.26kg 77.27')).toBe('77.27')
    expect(extractParaPercentage('5kg 96.55')).toBe('96.55')
    expect(extractParaPercentage('6kg 87.61')).toBe('87.61')
    expect(extractParaPercentage('1.50m 88.10')).toBe('88.10')
  })

  it('does not mistake implement weights or times for percentages', () => {
    expect(extractParaPercentage('2kg')).toBeUndefined()
    expect(extractParaPercentage('')).toBeUndefined()
    expect(extractParaPercentage(undefined)).toBeUndefined()
    // three decimals is not the XX.XX shape
    expect(extractParaPercentage('1.234')).toBeUndefined()
  })
})
