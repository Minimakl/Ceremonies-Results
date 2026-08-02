import { describe, expect, it } from 'vitest'
import type {
  MeetingDetailsDto,
  ResultsPayload,
  SchedulePayload,
} from '../api/types'
import details27550 from '../fixtures/details-27550.json'
import details27236 from '../fixtures/details-27236.json'
import schedule27550 from '../fixtures/schedule-27550.json'
import schedule27236 from '../fixtures/schedule-27236.json'
import results336973 from '../fixtures/results-27550-336973.json'
import results371113 from '../fixtures/results-27236-371113.json'
import implementsJson from '../fixtures/implements.json'
import { buildEventRows, buildFinals } from './model'
import { buildCeremoniesList } from './ceremonies'

function decathlon() {
  const finals = buildFinals(
    schedule27550 as SchedulePayload,
    details27550 as MeetingDetailsDto,
  )
  const final = finals.find((f) => f.meId === 336973)!
  const rows = buildEventRows(final, results336973 as ResultsPayload)
  return { final, rows }
}

function discus() {
  const finals = buildFinals(
    schedule27236 as SchedulePayload,
    details27236 as MeetingDetailsDto,
    implementsJson,
  )
  const final = finals.find((f) => f.meId === 371113)!
  const rows = buildEventRows(final, results371113 as ResultsPayload)
  return { final, rows }
}

describe('finals filter (plan §3)', () => {
  it('keeps finals only and drops combined child events', () => {
    const finals = buildFinals(
      schedule27550 as SchedulePayload,
      details27550 as MeetingDetailsDto,
    )
    expect(finals.length).toBeGreaterThan(0)
    for (const f of finals) {
      expect(f.raw.eventStage).toBe('Final')
      expect(f.raw.combinedMeetingEventIdFk).toBeUndefined()
    }
    // The decathlon parent is present exactly once.
    expect(finals.filter((f) => f.meId === 336973)).toHaveLength(1)
  })
})

describe('Results tab (plan §7.3) — decathlon final, as-is', () => {
  it('matches the verified worked example exactly', () => {
    const { final, rows } = decathlon()
    expect(final.isCombined).toBe(true)
    expect(final.name).toBe('Decathlon')

    expect(
      rows.map((r) => [r.place, r.name, r.country, r.club, r.result, r.notes]),
    ).toEqual([
      [1, 'Sam TALBOT', 'GBR', '', '6959', 'SB'],
      [2, 'Logoh TLIGI', 'AUS', 'SA', '6872', 'PB'],
      [3, 'Lenny ROBIN', 'AUS', 'VIC', '6845', 'PB'],
      [4, 'Tom STONE', 'AUS', 'NSW', '6666', 'PB'],
      [5, 'Connor DUGGAN', 'AUS', 'QLD', '6527', 'PB'],
      [6, 'George GARDINER', 'AUS', 'QLD', '6448', 'PB'],
      [7, 'Benjamin DAY', 'AUS', 'VIC', '6277', 'PB'],
      [8, 'Fraser WESTERN', 'AUS', 'SA', '6198', 'PB'],
      [9, 'Max TEURUAA', 'COK', '', '5968', ''],
      [10, 'Chase LEE', 'AUS', 'NSW', '4937', 'PB'],
      [11, 'Benjamin PITTMAN', 'AUS', 'NSW', '4482', ''],
      [undefined, 'Liam SCHRECK', 'AUS', 'VIC', 'DNF', ''],
    ])
  })
})

describe('Ceremonies ordering engine (plan §7)', () => {
  it('§7.3 combined event: Australians on top, internationals kept underneath', () => {
    const { final, rows } = decathlon()
    const list = buildCeremoniesList(rows, final.isCombined)

    expect(
      list.map((c) => [
        c.placeOrder,
        c.overallPosition,
        c.row.name,
        c.row.country,
        c.row.club,
        c.row.result,
      ]),
    ).toEqual([
      [1, 2, 'Logoh TLIGI', 'AUS', 'SA', '6872'],
      [2, 3, 'Lenny ROBIN', 'AUS', 'VIC', '6845'],
      [3, 4, 'Tom STONE', 'AUS', 'NSW', '6666'],
      [4, 5, 'Connor DUGGAN', 'AUS', 'QLD', '6527'],
      [5, 6, 'George GARDINER', 'AUS', 'QLD', '6448'],
      [6, 7, 'Benjamin DAY', 'AUS', 'VIC', '6277'],
      [7, 8, 'Fraser WESTERN', 'AUS', 'SA', '6198'],
      [8, 10, 'Chase LEE', 'AUS', 'NSW', '4937'],
      [9, 11, 'Benjamin PITTMAN', 'AUS', 'NSW', '4482'],
      [1, 1, 'Sam TALBOT', 'GBR', '', '6959'],
      ['-', 9, 'Max TEURUAA', 'COK', '', '5968'],
    ])

    // DNF athlete dropped from ceremonies, still present in results rows.
    expect(list.some((c) => c.row.name === 'Liam SCHRECK')).toBe(false)
    expect(rows.some((r) => r.name === 'Liam SCHRECK')).toBe(true)
  })

  it('§7.4 individual event: non-medal internationals dropped entirely', () => {
    const { final, rows } = discus()
    expect(final.isCombined).toBe(false)
    expect(final.name).toBe('Discus Throw (2kg)')

    const list = buildCeremoniesList(rows, final.isCombined)
    expect(
      list.map((c) => [
        c.placeOrder,
        c.overallPosition,
        c.row.name,
        c.row.country,
        c.row.club,
        c.row.result,
      ]),
    ).toEqual([
      [1, 1, 'Matthew DENNY', 'AUS', 'QLD', '67.51'],
      [2, 5, 'Darcy MILLER', 'AUS', 'SA', '57.66'],
      [3, 6, 'Darcy GIDDINGS', 'AUS', 'VIC', '51.87'],
      [2, 2, 'Lawrence OKOYE', 'GBR', '', '65.09'],
      [3, 3, 'Roje STONA', 'JAM', '', '64.60'],
    ])

    // Claudio Romero (CHI, 4th, no medal) removed.
    expect(list.some((c) => c.row.name.includes('ROMERO'))).toBe(false)
  })
})
