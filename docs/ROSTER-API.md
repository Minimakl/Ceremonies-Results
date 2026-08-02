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
| `result` | integer mark. Field events: centimetres (6751 → 67.51 m). Combined: points. Track: centiseconds (see `decimalDigits`) |
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

## Notes / risks

- CORS: the SPA calls `api.meets.rosterathletics.com` cross-origin from
  `meets.rosterathletics.com`, so CORS is enabled server-side; whether it
  allows arbitrary origins is unverified. The app routes API calls through a
  dev-server proxy (`vite.config.ts`) so the browser never needs Roster CORS;
  production hosting should provide the same rewrite (e.g. a Vercel rewrite).
- Some global lists (`age-group-list/{x}/v1`) take a parameter we haven't
  mapped (400 on ISO3). Age-group names are currently resolved from a small
  built-in map (id 245 = Senior observed) and fall back to the raw id.
- `label` on schedule events carries Roster wording like "Gold" seen on cards.
