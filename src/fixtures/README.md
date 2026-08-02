# Test fixtures

Live snapshots captured from the Roster Athletics public API on 2 August 2026
for the two reference events in `docs/PLAN.md` §11:

| File | Source |
|---|---|
| `details-27550.json` | `/api/public/meeting/27550/details` |
| `schedule-27550.json` | `/api/public/meeting/27550/schedule` (trimmed to a representative slice) |
| `results-27550-336973.json` | `/api/public/meeting/27550/results-v2/336973` — Decathlon Final, Men Senior |
| `details-27236.json`, `schedule-27236.json` | hand-built for the Maurie Plant discus final |
| `results-27236-371113.json` | `/api/public/meeting/27236/results-v2/371113` — Discus Throw Final, Men Senior |
| `implements.json` | the one implement (discus 2kg) the fixtures reference |

These are test data only — the app itself always reads live data through
`/roster-api`. The unit tests import these files directly.
