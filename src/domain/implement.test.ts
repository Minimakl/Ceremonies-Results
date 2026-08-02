import { describe, expect, it } from 'vitest'
import { implementLabel } from './format'

/**
 * Roster stores implement weights in hundredths of the unit. Values below are
 * taken from live `se-implements/v1` records.
 */
describe('implement labels (event title wording)', () => {
  it('formats gram implements — javelins', () => {
    expect(implementLabel(50000, 'Gram')).toBe('500g')
    expect(implementLabel(80000, 'Gram')).toBe('800g')
    expect(implementLabel(70000, 'Gram')).toBe('700g')
    expect(implementLabel(60000, 'Gram')).toBe('600g')
    expect(implementLabel(40000, 'Gram')).toBe('400g')
  })

  it('formats kilogram implements — shot, discus, hammer', () => {
    expect(implementLabel(200, 'Kilogram')).toBe('2kg')
    expect(implementLabel(60, 'Kilogram')).toBe('0.6kg')
    expect(implementLabel(726, 'Kilogram')).toBe('7.26kg')
    expect(implementLabel(150, 'Kilogram')).toBe('1.5kg')
    expect(implementLabel(400, 'Kilogram')).toBe('4kg')
  })

  it('omits rather than showing a weight it cannot vouch for', () => {
    expect(implementLabel(0, 'None')).toBe('')
    expect(implementLabel(undefined, 'Kilogram')).toBe('')
    expect(implementLabel(500, undefined)).toBe('')
    expect(implementLabel(100, 'Centimeter')).toBe('')
    // implausible for a real implement — omitted, never rendered raw
    expect(implementLabel(5000000, 'Gram')).toBe('')
    expect(implementLabel(1, 'Kilogram')).toBe('')
  })
})
