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
import { generateScript } from './script'

const EXPECTED_DECATHLON_SCRIPT = `Your finalists for the
Men's Open Decathlon
Championship.

In 9th place with a total of 4482 points
representing New South Wales
Benjamin PITTMAN

In 8th place with a total of 4937 points
representing New South Wales
Chase LEE

In 7th place with a total of 6198 points
representing South Australia
Fraser WESTERN

In 6th place with a total of 6277 points
representing Victoria
Benjamin DAY

In 5th place with a total of 6448 points
representing Queensland
George GARDINER

In 4th place with a total of 6527 points
representing Queensland
Connor DUGGAN

And now, your medallists for the
Men's Open Decathlon
Championship

Third place and bronze medallist
with a total of 6666 points
representing New South Wales
Tom STONE

Second place and silver medallist
with a total of 6845 points
representing Victoria
Lenny ROBIN

First place and gold medallist
with a total of 6872 points
representing South Australia
Logoh TLIGI

Your medallists for the
Men's Open Decathlon

We also recognise the following international athletes.

With a total of 6959 points
In first place
Representing GBR
Sam TALBOT

With a total of 5968 points
Representing COK
Max TEURUAA

Congratulations to all of the finalists for the
Men's Open Decathlon`

describe('script generator (plan §9)', () => {
  it('produces the full decathlon script from the verified example', () => {
    const finals = buildFinals(
      schedule27550 as SchedulePayload,
      details27550 as MeetingDetailsDto,
    )
    const final = finals.find((f) => f.meId === 336973)!
    const rows = buildEventRows(final, results336973 as ResultsPayload)
    const script = generateScript(final, buildCeremoniesList(rows, true))
    expect(script).toBe(EXPECTED_DECATHLON_SCRIPT)
  })

  it('returns null (placeholder) for non-combined events — plan §9.4', () => {
    const finals = buildFinals(
      schedule27236 as SchedulePayload,
      details27236 as MeetingDetailsDto,
      implementsJson,
    )
    const final = finals.find((f) => f.meId === 371113)!
    const rows = buildEventRows(final, results371113 as ResultsPayload)
    expect(generateScript(final, buildCeremoniesList(rows, false))).toBeNull()
  })
})
