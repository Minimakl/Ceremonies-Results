# Field Mapping — Roster Athletics → Ceremonies Dashboard

Every value on the dashboard and where it comes from. Nothing here is typed in
by hand or held in a lookup table of our own unless this document says so.

## 1. The four requests

| Request | Cadence | What it supplies |
|---|---|---|
| `GET /api/public/meeting/{id}/details` | every 120 s | meeting name, timezone, address, organiser, **sportEvents** (event names and result rules), **ageGroups** (age-group names) |
| `GET /api/public/meeting/{id}/schedule` | every 10 s | one record per event: stage, gender, age group, event id, implement id, start time, visibility, `hasResults`, `resultsComplete` |
| `GET /api/public/meeting/{id}/results-v2/{meId}` | every 5 s, open event only | `athleteList`, `clubList`, `relayList`, `mpList` (entries), `resultList` (marks) |
| `GET /api/public/se-implements/v1` | once | implement weights |

Polling pauses when the tab is hidden or the browser is offline, and resumes on
return. A failed poll leaves the last good data on screen and marks it stale
rather than blanking the page.

Competitions browser: `GET /api/public/meeting/list/v2` (Roster's featured
list) and `POST /api/public/meeting/search/v2` (the same body Roster's own
browser posts).

## 2. Which events appear

A card is created for a schedule record where **all** of these hold
(`buildFinals`, `src/domain/model.ts`):

- `eventStage === 'Final'`
- `combinedMeetingEventIdFk` is absent — this excludes the child events of a
  combined event, e.g. the decathlon's own 100m
- `visibility` is neither `None` nor `Hidden`
- it is not a **group final** behind a Finals Summary. Where an event, age
  group and gender has several finals and one has `stageGroup` 0, that one is
  Roster's Finals Summary — medals are presented on it — and the others are
  dropped (plan §3.2)

Cards are ordered by `startDateTime` and grouped into days using the
**venue's** timezone from `details.tz`.

## 3. Event header

| Shown | Source | Transform |
|---|---|---|
| Event name | `details.sportEvents[eventIdFk].eventName` | verbatim |
| Implement | `se-implements[seImplementIdFk].implement` + `implementUnit` | value ÷ 100; `Kilogram` → kg, `Gram` → g. **See open item 3.** |
| "· Final" / "· Finals Summary" | `eventStage`, `stageGroup` | Roster's own wording — a summary is titled "Finals Summary" |
| Gender | schedule `gender` + age group range | Roster's schedule wording: Girls/Boys when the group's oldest athlete is under 18 (`rangeEnd < 18`), Women/Men otherwise. Note Roster's own results header says Women/Men regardless — the schedule wording is used. |
| Start time | schedule `startDateTime` (UTC) + `details.tz` | venue wall time, "2:00 PM"; hidden when `timePubliclyVisible` is false |
| Age group | `details.ageGroups[ageGroupIdFk].name` | `Meeting_18` → `U18`, `PA_Senior` → `PA Senior`, underscores → spaces |
| Status colour | `resultsComplete`, `hasResults`, `startDateTime` | green / orange / red; orange → yellow once every athlete has settled |

## 4. Participant rows

Rows come from `mpList` filtered to this event, joined to `athleteList`,
`clubList` and `relayList` by id.

| Column | Source | Transform |
|---|---|---|
| Lane / Order | `mp.lane` | verbatim |
| Group | `mp.groupNo`, `mp.groupPlace` | 1 → "A", 2 → "B"; shown only on a Finals Summary, as "A (1)" on the Results tab |
| Order/Pos | `mp.place` | verbatim; blank for DNF/DNS/DQ |
| **Participant** | see §5 | |
| Country | `athlete.country` | verbatim — the athletics code ("RSA"), **not** `countryCode` ("ZAF") |
| Club | `clubList[mp.clubIdFk].shortName` | verbatim; blank when the entry has no club |
| Result | see §6 | |
| % (para) | `mp.notesPublic` | the `XX.XX` number pulled out of Roster's free-text note |
| Notes | `result.record`, `result.records[].recordType` | `PersonalBest` → PB, `SeasonBest` → SB; PB suppresses SB |
| PB / SB | `mp.initialPersonalBest`, `mp.initialSeasonBest` | same scale as the result |

## 5. Participant name

`participantDisplayName` in `src/domain/format.ts`:

1. If the athlete has any name parts, the name is
   **`firstName` + `middleName` + `lastName.toUpperCase()`** —
   "Helena" + "Rose" + "Butler" → **"Helena Rose BUTLER"**. This is how Roster
   prints it.
2. If the athlete has no split name parts, `athleteName` is used and its last
   word is capitalised: "Sam Talbot" → "Sam TALBOT".
3. **A relay row is not an athlete.** Its name is the team's
   `relayList[relayTeamIdFk].longName` (falling back to `shortName`) — "New
   South Wales". The runners' own rows are filtered out, because Roster lists
   the team as the competitor.

Not shown: the para classification Roster appends to the name ("· T36, F36")
and the year of birth. See open items 4 and 5.

## 6. Results and marks

Roster stores marks as integers on a scale that depends on the event's
`resultType`, which the sport-event catalogue states outright:

| `resultType` | Unit | Example |
|---|---|---|
| `Duration` | ten-thousandths of a second | `2524500` → `4:12.45` |
| `Distance` | centimetres | `826` → `8.26` |
| `Numeric` | points, unscaled | `6959` → `6959` |

The mark shown is the **best counting attempt**: of the athlete's results with
`resultStatus === 'Ok'`, the lowest when the catalogue says
`scoring: 'Lowest'`, the highest when it says `'Highest'`. Combined events take
`mp.combinedEventScore` instead.

Times are rounded **up** to the precision Roster displays, per the World
Athletics rule — `10.3340` reads `10.34`, not `10.33`. When Roster times an
event to thousandths to separate places, it appends the finer reading and so do
we: `10.34 (.334)`. The number of digits comes from the result's own
`decimalDigits`, not from a guess.

No mark and a terminal status → the status is shown instead: `DidNotFinish` →
DNF, `DidNotStart` → DNS, `Disqualified` → DQ, `NoMark` → NM.

Row order matches Roster's own pages: the **Results** tab is ordered by
`mp.place` with DNF/DNS/DQ last, and the **Start list** tab by **group, then
lane or start order**. The group matters only on a Finals Summary, where each
group final numbers its entries from 1 — 27550/337021 runs order 1–12 in group
A and 1–2 in group B, so ordering on the number alone would interleave them and
open the list with the wrong athlete.

## 7. Ceremonies order

`buildCeremoniesList`, plan §7. Australians first, renumbered 1, 2, 3… in
finishing order; internationals below, keeping their overall place number if it
is 1–3 and a hyphen otherwise. Individual events drop internationals outside the
top 3 entirely; combined events keep them. Athletes with no overall place never
appear.

The **Ceremonies tab** then shows only the rows with a numeric place order of 3
or better — the medallists, Australian and international (plan §6.3). The
scripts still read from the full list.

## 8. Script

Generated from the ceremonies rows, so the script can never disagree with the
table above it. The spoken time is derived from the **displayed** string, not
recomputed from the raw value.

- Sex — from the event gender, possessive: "Men's", "Women's"
- Age group — as §3, with `Senior` → `Open`
- Event — the event name, with any trailing parenthetical removed
- Club — the club's `longName`, with an Australian state code expanded from our
  own table (NSW → New South Wales)
- Time — e.g. `4:12.45` → "4 minutes 12 point 45 seconds"
- Distance — e.g. `8.26` → "8 point 26 metres"

## 9. Open items

1. **Sub-minute times omit the minutes.** "12 point 32 seconds", not "0 minutes
   12 point 32 seconds". A judgement call — awaiting confirmation.
2. **Notes are blank on combined events.** The PB/SB marker is matched against
   the counting mark, and a combined event's counting mark is the points total,
   which no individual discipline result equals. Not yet checked against what
   Roster shows on a decathlon.
3. **Implement weights often do not resolve.** Roster's public implement
   catalogue returns 416 entries and does not contain the ids most meets use —
   e.g. 27550's women's javelin uses implement id 219, which is absent, so
   Roster's page reads "Javelin Throw (600g)" and the dashboard reads "Javelin
   Throw". A wrong weight is never shown; the weight is simply missing. The
   endpoint Roster's own site uses for these has not been found yet.
4. **Para classification is not shown.** Roster prints "Danielle AITCHISON ·
   T36, F36". The dashboard shows the performance percentage instead.
5. **Year of birth is not shown.** Roster prints it under the name; the plan
   dropped date of birth from the start list.
6. **Wind readings are not shown.** `result.windReading` is in the payload and
   Roster displays "Wind: +0.1" above a sprint result.
7. **Non-Latin names.** Roster carries `athleteNameLatin`, `firstNameInt` and
   `lastNameInt` for athletes whose names are not written in Latin script. The
   dashboard uses the primary name fields only. Not yet tested against a meet
   that has any.
8. **`athleteNameDisplay`.** The meeting details payload carries this setting.
   Its effect on Roster's own rendering has not been established; the dashboard
   always uses the format in §5.
9. **A meet with no Australians.** The ceremonies order is defined around
   `country === 'AUS'`. At a non-Australian competition every athlete is
   treated as international, so the medallist blocks would be empty. The
   competitions browser now allows such meets to be selected.
