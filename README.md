# Ceremonies Results

A finals-only ceremonies dashboard built on Roster Athletics data, for a
ceremonies manager who announces medals after finals finish.

- **Spec:** [docs/PLAN.md](docs/PLAN.md) — the locked executive plan
- **Data source:** [docs/ROSTER-API.md](docs/ROSTER-API.md) — the discovered
  Roster Athletics public API, verified against two live events

## What it does

- Shows **finals only** (no heats, prelims, semis) for a Roster competition
- Colour-codes each final by readiness: 🔴 not started → 🟠 in progress →
  🟡 finished/unofficial → 🟢 finalised → 🩷 in ceremonies (manual, green-only)
- Per-event screen with four tabs: **Start List**, **Results** (as-is),
  **Ceremonies** (reordered: Australians on top, internationals below), and
  **Script** (read-aloud; combined events implemented, others placeholder)
- Extracts para performance percentages from Roster notes into their own column

## Development

```bash
npm install
npm run dev        # dev server with /roster-api proxy to Roster Athletics
npm test           # vitest — includes the two verified worked examples
npm run build      # production build
```

The app always reads live data from Roster through the `/roster-api` proxy —
provided by the Vite dev server locally, and by a `vercel.json` rewrite in
production. The snapshots under `src/fixtures/` are test data only; see
`src/fixtures/README.md`.

## Live updating

The dashboard keeps reading Roster on its own for as long as it is open — no
refresh, no manual action:

| What | Cadence |
|---|---|
| Competition schedule (drives every status colour) | every 10s |
| Open event's start list and results | every 5s |
| Meeting details (age groups, event catalogue) | every 2 minutes |

Polling pauses while the browser tab is hidden and fires immediately when it
becomes visible again or the network comes back, so a dashboard left open
overnight is current the moment it is looked at. A failed read never blanks the
screen: the last good data stays up and the header switches from
"Live · updated Ns ago" to "Reconnecting", so a stall is always visible rather
than silent.

## Deployment

Deployed to Vercel. `vercel.json` rewrites `/roster-api/*` to
`api.meets.rosterathletics.com/*`, which is what lets the browser read Roster
data without depending on Roster's CORS headers — the same rewrite the Vite
dev server provides locally.

Vercel projects in this team have **Vercel Authentication** enabled by
default, so deployment URLs return 403 to anyone not logged into the team.
Turn it off under Project Settings → Deployment Protection if the ceremonies
manager needs to open the dashboard without a Vercel login.
