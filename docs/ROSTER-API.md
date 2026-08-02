# Roster Athletics Public API — Discovery Notes

Reverse-engineered from the Roster Athletics public SPA
(`meets.rosterathletics.com`, Angular) on 2 August 2026, and verified live
against both reference events in the plan.

## Base URL

The SPA computes its API base as `https://api.<spa-hostname>`:

```
https://api.meets.rosterathletics.com
```

(Source: `apiBaseUrl = Ke(origin, hostname)` in the environment chunk, where
`Ke` prefixes the hostname with `api.`.)

The API answers with XML by default and JSON when requested — send
`Accept: application/json`. All endpoints below are unauthenticated GETs.

## Endpoints

| Purpose | Endpoint |
|---|---|
| Competition (meeting) details | `GET /api/public/meeting/{meetingId}/details` |
| Full event schedule (all rounds, statuses) | `GET /api/public/meeting/{meetingId}/schedule` |
| Start list + results for one event | `GET /api/public/meeting/{meetingId}/results-v2/{meId}` |
| Bib allocations | `GET /api/public/meeting/{meetingId}/bib-allocations` |
| Global sport-event definitions | `GET /api/public/sport-events/v1` |
| Global implement definitions | `GET /api/public/se-implements/v1` |

Live updates are available over STOMP WebSocket at `/api/public/socket`, with
topics mirroring the REST paths (`/topic/public/meeting/{id}/schedule`,
`/topic/public/meeting/{id}/results-v2/{meId}`). The SPA uses
`allowWebSocket ? watch(topic) : http.get(url)` — REST polling is a fully
supported fallback and is what this tool uses.

## Payload shapes (JSON, camelCase)

### `/schedule` → `SimpleWsPayload`

```
{ type: "Full" | "Update",
  data: [ { op: "Create"|"Update"|"Delete", entityIdPk, entityDto: MeetingEvent } ] }
```

`MeetingEvent` fields that matter to us:

| Field | Meaning |
|---|---|
| `meetingEventIdPk` | the `meId` |
| `eventIdFk` | joins to sport-event definition (event name, type) |
| `seImplementIdFk` | implement (e.g. discus 2kg) |
| `ageGroupIdFk` | age group |
| `gender` | `Male` / `Female` |
| `eventStage` | `Final` \| `Heat` \| `SemiFinal` \| `Preliminary` \| `Qualification` |
| `stageGroup` | heat/group number within the stage |
| `label` | Roster's own extra label (e.g. "Gold") |
| `startDateTime` | UTC, meeting tz in details |
| `timePubliclyVisible` | whether startDateTime is meaningful |
| `visibility` | `Full` \| `Schedule` \| ... (show only >= Schedule) |
| `hasParticipants` / `hasResults` | flags |
| `resultsComplete` | **true = results finalised (our green)** |
| `combinedSportEventIdFk` | set on combined events (decathlon etc.) |
| `combinedMeetingEventIdFk` | set on the *child* events of a combined event, pointing at the parent — filter these out of the finals list |

The SPA's own status logic (from the results base component):

```
hasResults(me) = me.visibility === Full && (me.hasResults || isPastStartTime(me))
isLive(me)     = !me.resultsComplete && (me.hasResults || isPastStartTime(me))
```

### Colour mapping used by this tool (provisional — plan §12.5)

| Colour | Rule |
|---|---|
| 🔴 Red | not past start time and no results yet |
| 🟠 Orange | live: past start time or partial results, not complete |
| 🟡 Yellow | every non-DNS/DNF-terminal participant has a final mark but `resultsComplete` is still false (needs the results payload; derived lazily) |
| 🟢 Green | `resultsComplete === true` |

### `/results-v2/{meId}` → `PublicMewsPayload`

```
{ type: "Full" | "Update",
  athleteList:      [{ athleteIdPk, athleteName, firstName, lastName, countryCode, yearOfBirth, paraClassTrack, paraClassField, ... }],
  clubList:         [{ clubIdPk, shortName, longName, countryCode, stateCode }],   // e.g. SA / South Australia / AUS / AUS_SA
  relayList:        [...],
  mpList:           [{ op, entityIdPk, entityDto: MeetingParticipant }],
  resultList:       [{ op, entityIdPk, entityDto: Result }],
  athleteExtraList: [{ athleteId, teamNames }],
  relayExtraList:   [...] }
```

`MeetingParticipant` (start-list row + final placing):

| Field | Meaning |
|---|---|
| `meetingParticipantIdPk` | joins results |
| `athleteIdFk` / `relayTeamIdFk` / `clubIdFk` | joins |
| `position` | start-list order / lane order |
| `lane` | lane for track events |
| `place` | overall finishing position (absent for DNF/DNS) |
| `combinedEventScore` | total points for combined events |
| `startStatus` | `Ok` \| `DidNotFinish` \| `DidNotStart` \| `Disqualified` \| ... |
| `initialPersonalBest` / `initialSeasonBest` | PB / SB shown on start lists |
| `notesPublic` | free-text notes (para performance % lives here) |

`Result` (one attempt/mark):

| Field | Meaning |
|---|---|
| `meetingParticipantIdFk` | joins participant |
| `attempt` | attempt number |
| `result` | integer mark — **the scale differs by result type**, see below |
| `decimalDigits` | precision this mark was timed to (2 normally, 3 when a race is split on thousandths) |
| `resultStatus` | `Ok` \| ... |
| `record` | `None` \| `PersonalBest` \| `SeasonBest` |
| `records[].recordType` | `PB` / `SB` labels shown in Notes |
| `windReading` | wind ×10 |

### `/details` → `PublicMeeting`

Includes `meetingId`, `meetingName`, `startDateTime`/`endDateTime`, `tz`,
`meetingStatus` (`Finished` observed), `address` (city/country — the
Australia venue filter), and the `sportEvents` catalogue
(`eventIdPk`, `eventName`, `eventType`, `combined`, `lanes`, ...).

## Verification performed

- `27550/schedule`: 306 events; stages Final 154 / Heat 82 / Preliminary 43 /
  Qualification 19 / SemiFinal 8. Decathlon Final Men Senior = meId 336973,
  `eventStage=Final`, `resultsComplete=true`.
- `27550/results-v2/336973`: 12 athletes matching plan §7.3 exactly —
  Talbot GBR place 1 score 6959; Tligi AUS 2/6872; Schreck AUS
  `startStatus=DidNotFinish`, no place. Clubs SA/VIC/NSW/QLD with full
  `longName` state names.
- `27236/results-v2/371113`: 6 athletes matching plan §7.4 exactly —
  Denny AUS 1, Okoye GBR 2, Stona JAM 3, Romero CHI 4, Miller AUS 5,
  Giddings AUS 6.

## Event metadata — never inferred

`/details` returns a `sportEvents` catalogue in which **every event declares how
its marks are stored and scored**. The app reads these fields directly rather
than guessing from `eventName` or `eventType`:

| Field | Values | Used for |
|---|---|---|
| `resultType` | `Duration` \| `Distance` \| `Numeric` | which scale to format on |
| `scoring` | `Lowest` \| `Highest` | whether the best mark is the smallest or largest |
| `relay` | boolean | competitors are teams, not athletes |
| `verticalJump` | boolean | High Jump, Pole Vault, Standing High Jump |
| `lanes` | boolean | whether the start list has a Lane column |

Inferring `resultType` from `eventType` is **not safe**. Across Roster's 575
global sport events, 42 contradict the obvious mapping — most importantly
`One Hour`, `24 Hours` and `One Hour Race Walk`, which carry
`eventType: "Distance"` but record a **distance covered**, not a time.
Formatting one of those as a clock time would print a wildly wrong value.
`inferResultType` exists only as a fallback for a catalogue entry missing the
field.

## Relays

A relay's `results-v2` payload contains a participant row per **team** *and* per
**leg**. Team rows have `relayTeamIdFk` and no `meetingParticipantRelayTeamIdFk`;
leg rows carry the latter, pointing at their team's participant row. The team's
name comes from `relayList[].longName` — Roster displays "New South Wales", and
"New Zealand" for a national team. A relay final at the 2026 Aus Champs has 25
participant rows for 5 teams.

## Result scales (verified against live Roster pages)

`result`, `initialPersonalBest` and `initialSeasonBest` are integers on
**different scales depending on the event type** — this is the single easiest
thing to get wrong:

| Type | Unit | Example |
|---|---|---|
| Durations (track) | **ten-thousandths of a second** | `2524500` → 4:12.45; `99600` → 9.96 |
| Distances (field) | **centimetres** | `826` → 8.26 m; `6751` → 67.51 m |
| Combined events | points, unscaled | `6959` → 6959 |

Two further rules for durations, both taken from Roster's own rendering:

- Times are rounded **up** to the displayed precision (the World Athletics
  rule), never to nearest. `103340` displays as `10.34`, not `10.33`.
- When `decimalDigits > 2` — a race timed finer to separate places — Roster
  appends the finer reading in parentheses: 5th and 6th in the 2026 Aus Champs
  100m final render as `10.34 (.334)` and `10.34 (.337)`.

Sources: 1500m Final Men U18 (27351/316510), 100m Final Men Senior
(27550/337277), Long Jump Final Men Senior (27550/337387).

## Notes / risks

- CORS: the SPA calls `api.meets.rosterathletics.com` cross-origin from
  `meets.rosterathletics.com`, so CORS is enabled server-side; whether it
  allows arbitrary origins is unverified. The app routes API calls through a
  dev-server proxy (`vite.config.ts`) so the browser never needs Roster CORS;
  production hosting should provide the same rewrite (e.g. a Vercel rewrite).
- `age-group-list/{x}/v1` takes an **age-group set id**, not an ISO3 country
  code (which is what returns 400). Set ids come from
  `/api/public/age-group-set-list/v1` — 8 is the AUS set.
- In practice that endpoint is not needed: **`/details` already embeds an
  `ageGroups` array** naming exactly the groups the meeting uses, plus the
  `ageGroupSet` it belongs to. That is what this app reads.
- Age-group names are internal forms that need transforming for display:
  `Senior` → Senior, `Meeting_20` → U20, `PA_Senior` → Para Senior,
  `PA_U17` → Para U17, `Master_35` → Masters 35, `School_12` → School 12.
  (`Meeting_20` carries `rangeStart` 18 / `rangeEnd` 19, i.e. under-20.)
- `label` on a meeting event is free text whose meaning varies by meet: at the
  Aus Champs it is a medal division ("Gold"), at the 2025 WA All Schools it is
  the venue ("Site 1", "Site  2", "Site 2 - Ambulant", "McGillivray Oval").
  Not shown on cards for that reason.
- **Implement weights are stored in hundredths of the unit, for both units.**
  `implement: 200, implementUnit: "Kilogram"` → 2 kg;
  `implement: 50000, implementUnit: "Gram"` → 500 g. Dividing only the
  kilogram values produced "Javelin Throw (50000g)" against Roster's
  "(500g)". Verified against live `se-implements/v1` javelin records
  (40000/50000/60000/70000/80000 Gram → 400–800 g).
- `/api/public/se-implements/v1` covers only part of the catalogue: 416 entries
  which omit most ids that real meets reference. Of the 76 parent finals at the
  2026 Aus Champs, only 18 resolve and 17 of those carry
  `implementUnit: "None"` — i.e. **no throwing event at that meet resolves its
  weight**. `se-implement-mapping-list/{meetingId}/v1` returns an empty list for
  both 27236 and 27550, and `sport-events/v1` carries no implement records, so
  the source Roster itself uses is still unidentified.
- Because of that gap, `implementLabel` treats anything outside the range of a
  real athletics implement (0.1–30 kg, 50–2000 g) as unresolvable and prints
  nothing. An event with no weight shown is still uniquely identified on screen
  by its name, gender and age group; a *wrong* weight would not be.
- `label` on schedule events carries Roster wording like "Gold" seen on cards.
