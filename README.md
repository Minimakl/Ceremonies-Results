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

The app loads live data through the dev-server proxy. If the network or the
proxy is unavailable it falls back to bundled fixtures of the two reference
events (2026 Aus Champs Decathlon final, 2026 Maurie Plant discus final), so
the whole UI is clickable offline.
