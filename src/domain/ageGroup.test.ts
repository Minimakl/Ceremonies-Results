import { describe, expect, it } from 'vitest'
import { formatAgeGroupName } from './format'
import { ageGroupName } from './model'

describe('age group names', () => {
  // Verified against live Roster pages: meId 336984 renders "Men · U20",
  // meId 337046 renders "Women · PA Senior", All Schools 334388 "Women · U18".
  it('formats the Roster internal names exactly as Roster renders them', () => {
    // 2026 Aus Champs
    expect(formatAgeGroupName('Senior')).toBe('Senior')
    expect(formatAgeGroupName('Meeting_20')).toBe('U20')
    expect(formatAgeGroupName('PA_Senior')).toBe('PA Senior')
    // 2025 WA All Schools
    expect(formatAgeGroupName('Meeting_14')).toBe('U14')
    expect(formatAgeGroupName('Meeting_15')).toBe('U15')
    expect(formatAgeGroupName('Meeting_18')).toBe('U18')
    expect(formatAgeGroupName('PA_U17')).toBe('PA U17')
    // other categories in the AUS age-group set
    expect(formatAgeGroupName('Master_35')).toBe('Master 35')
    expect(formatAgeGroupName('School_12')).toBe('School 12')
  })

  it('resolves an id against the meeting age groups', () => {
    const ageGroups = [
      { ageGroupIdPk: 245, name: 'Senior' },
      { ageGroupIdPk: 242, name: 'Meeting_18' },
    ]
    expect(ageGroupName(245, ageGroups)).toBe('Senior')
    expect(ageGroupName(242, ageGroups)).toBe('U18')
  })

  it('never renders a bare id when the group is unknown', () => {
    expect(ageGroupName(86, [])).toBe('')
    expect(ageGroupName(243, undefined)).toBe('')
    expect(ageGroupName(undefined, [])).toBe('')
  })
})
