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
