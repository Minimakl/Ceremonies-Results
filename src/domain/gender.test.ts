import { describe, expect, it } from 'vitest'
import { genderLabel, genderPossessive, genderTone } from './format'

/**
 * Reproduces Roster's `gender | header` transform. Roster's event header uses
 * the Senior profile, which is why a U18 girls' final reads "Women · U18" on
 * Roster itself (verified live: competition 27351, meId 334388).
 */
describe('gender wording matches Roster', () => {
  it('uses the Senior profile by default, as Roster does', () => {
    expect(genderLabel('Male')).toBe('Men')
    expect(genderLabel('Female')).toBe('Women')
    expect(genderLabel('Mixed')).toBe('Mixed')
  })

  it('carries Roster’s youth and combined profiles', () => {
    expect(genderLabel('Male', 'Youth')).toBe('Boys')
    expect(genderLabel('Female', 'Youth')).toBe('Girls')
    expect(genderLabel('Mixed', 'Youth')).toBe('Mixed Youth')
    expect(genderLabel('Male', 'Both')).toBe('Men & Boys')
    expect(genderLabel('Female', 'Both')).toBe('Women & Girls')
    expect(genderLabel('Mixed', 'Both')).toBe('Mixed Adults & Youth')
  })

  it('passes through anything Roster might add', () => {
    expect(genderLabel('Nonbinary')).toBe('Nonbinary')
  })

  it('builds the script possessive from the same wording', () => {
    expect(genderPossessive('Male')).toBe("Men's")
    expect(genderPossessive('Female')).toBe("Women's")
    expect(genderPossessive('Male', 'Youth')).toBe("Boys'")
    expect(genderPossessive('Female', 'Youth')).toBe("Girls'")
    expect(genderPossessive('Mixed')).toBe('Mixed')
  })
})

describe('gender colouring (as Roster colours its schedule)', () => {
  it('pink for Female, blue for Male, plain for anything else', () => {
    expect(genderTone('Female')).toBe('female')
    expect(genderTone('Male')).toBe('male')
    // Roster's schedule carries only the two colours; Mixed stays plain.
    expect(genderTone('Mixed')).toBe('neutral')
    expect(genderTone('')).toBe('neutral')
  })
})
