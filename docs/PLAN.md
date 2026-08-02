# Ceremonies Tool — Executive Plan

**Project:** Finals-only ceremonies dashboard built on Roster Athletics data
**Prepared for:** Amelia
**Date:** 2 August 2026
**Status:** Spec locked, pending 4 open decisions (Section 12)

---

## 1. The Problem

The client is a **ceremonies manager**. After finals finish, they announce the medals. Today they use the Roster Athletics app, which shows every event at a meet: heats, preliminary rounds, semis, finals, all mixed together. They must sift through irrelevant events to find the ones they present medals for. It is overwhelming and slow, at the exact moment they need speed and certainty.

## 2. The Solution

A dashboard that shows **finals only**, colour-coded by readiness, with a per-event view containing the start list, the untouched results, a reordered ceremonies list, and a read-aloud script. The client sees only what matters, tracks each final from "not started" to "presented," and reads medal announcements straight off the screen.

## 3. Scope

| Filter | Setting |
|---|---|
| Competitions | Any competition on Roster Athletics |
| Location | Competition venue is in Australia (a competition location filter; nothing to do with athlete nationality) |
| Date | 2026 onwards |
| Rounds | Finals only. No heats, no prelims, no semis |
| Athletes | All age groups, both sexes, para and able-bodied |

## 4. The Five Status Colours

| Colour | Meaning | Set by |
|---|---|---|
| 🔴 Red | Final has not started | Automatic, from Roster Athletics status |
| 🟠 Orange | In progress: being run or being held (e.g. long jump underway) | Automatic |
| 🟡 Yellow | Finished, but results NOT yet finalised/published | Automatic |
| 🟢 Green | Finished AND results finalised. Ready to present | Automatic |
| 🩷 Pink | Ready and waiting in ceremonies | **Manual: the client taps a button** |

**Hard rule:** only a green event can be promoted to pink. Red, orange, and yellow events can never be made pink. The four automatic colours are derived entirely from whatever Roster Athletics reports; no human input.

## 5. Home Screen Layout

- A **header strip across the top**, in the red colour. This holds the events that have not started. A **sidebar button** sits at the top of this header.
- Below the header, the screen is divided into **four quadrant sections**:

| | Left | Right |
|---|---|---|
| **Top** | 🩷 PINK — finished, finalised, ready and waiting in ceremonies | 🟢 GREEN — finished and finalised |
| **Bottom** | 🟠 ORANGE — in progress | 🟡 YELLOW — finished, results not finalised |

- Each section contains **event cards** for the events currently in that state. The pink section is populated only by events promoted from the green section.
- Each card shows **just the event name**, worded exactly as Roster Athletics words it. Example:

  > Discus Throw (2kg) · Final
  > 🟡 Gold · Men · Senior

## 6. Event Screen

Tapping an event card opens the event screen:

- A **Back button appears in the header**. Pressing it returns the client to the previous screen they were on.
- Below the header sits a second navigation bar with **four tabs**: **Start List**, **Results**, **Ceremonies**, **Script**.

### 6.1 Start List tab

Same columns as Roster Athletics, **plus a Country column, minus date of birth**.

| Event type | Columns (in order) |
|---|---|
| Track events | Lane, Participant, Country, PB, SB |
| Other (field) events | Participant, Country, Club, PB, SB |

*(Resolved: Country appears on every start list — see Section 12, decision 2.)*

### 6.2 Results tab

The results **exactly as shown on Roster Athletics**. No reordering, no dropping, no editing. Everyone appears, including DNF athletes.

**Columns:** Position, Participant, Country, Club, Result, Notes

### 6.3 Ceremonies tab

The reordered, read-from-this list. Rules in Section 7.

**Columns:** Place order, Overall Position, Participant, Country, Club, Result

### 6.4 Script tab

The read-aloud script, auto-filled from the ceremonies data. Template in Section 9. **Currently defined for combined events only** (decathlon, heptathlon, pentathlon). Scripts for all other event types will be provided later; the tool should hold placeholders for them.

## 7. The Ordering Engine (Ceremonies List)

The same rule applies to individual events and combined events:

1. **All Australian athletes go on top**, renumbered 1, 2, 3... in the Place order column, in their finishing order among Australians.
2. **All international athletes go underneath**, always — even an international who won the event outright.
3. **Internationals who placed 1st, 2nd, or 3rd overall keep that number** in the Place order column. They medal.
4. **Internationals outside the top 3 get a hyphen (-)** in Place order, but keep their true Overall Position.
5. **Two athletes can share a Place order number.** Correct and intended: two medal sets (Australian and overall) run at once.
6. **Overall Position** always shows the raw finish order from Roster.

### 7.1 Individual events

Internationals with **no medal claim are dropped entirely** from the ceremonies list. (Maurie Plant discus: Claudio Romero, CHI, 4th overall — removed.)

### 7.2 Combined events (decathlon, heptathlon, pentathlon)

- Only the **final** is shown.
- The ceremonies list keeps **every athlete who scored points** — not just medallists — because the client reads all point-scorers aloud.
- **DNF athletes are dropped** from the ceremonies list (they remain on the Results tab).
- Non-medal internationals are NOT dropped; they appear underneath with a hyphen.

### 7.3 Verified worked example — 2026 Australian Athletics Championships, Decathlon Final, Men Senior

Live data from Roster (competition id 27550, meId 336973):

**Results tab (as-is):**

| Position | Participant | Country | Club | Result | Notes |
|---|---|---|---|---|---|
| 1 | Sam TALBOT | GBR | | 6959 | SB |
| 2 | Logoh TLIGI | AUS | SA | 6872 | PB |
| 3 | Lenny ROBIN | AUS | VIC | 6845 | PB |
| 4 | Tom STONE | AUS | NSW | 6666 | PB |
| 5 | Connor DUGGAN | AUS | QLD | 6527 | PB |
| 6 | George GARDINER | AUS | QLD | 6448 | PB |
| 7 | Benjamin DAY | AUS | VIC | 6277 | PB |
| 8 | Fraser WESTERN | AUS | SA | 6198 | PB |
| 9 | Max TEURUAA | COK | | 5968 | |
| 10 | Chase LEE | AUS | NSW | 4937 | PB |
| 11 | Benjamin PITTMAN | AUS | NSW | 4482 | |
| | Liam SCHRECK | AUS | VIC | DNF | |

**Ceremonies tab (reordered):**

| Place order | Overall Position | Participant | Country | Club | Result |
|---|---|---|---|---|---|
| 1 | 2 | Logoh TLIGI | AUS | SA | 6872 |
| 2 | 3 | Lenny ROBIN | AUS | VIC | 6845 |
| 3 | 4 | Tom STONE | AUS | NSW | 6666 |
| 4 | 5 | Connor DUGGAN | AUS | QLD | 6527 |
| 5 | 6 | George GARDINER | AUS | QLD | 6448 |
| 6 | 7 | Benjamin DAY | AUS | VIC | 6277 |
| 7 | 8 | Fraser WESTERN | AUS | SA | 6198 |
| 8 | 10 | Chase LEE | AUS | NSW | 4937 |
| 9 | 11 | Benjamin PITTMAN | AUS | NSW | 4482 |
| 1 | 1 | Sam TALBOT | GBR | | 6959 |
| - | 9 | Max TEURUAA | COK | | 5968 |

Liam SCHRECK (DNF) dropped. Sam Talbot (GBR, won overall) sits below all Australians but keeps place 1. Max Teuruaa (COK, 9th) gets a hyphen.

### 7.4 Verified worked example — 2026 Maurie Plant Meet, Discus Throw (2kg) Final, Men Senior

Live data from Roster (competition id 27236, meId 371113):

**Ceremonies tab:**

| Place order | Overall Position | Participant | Country | Club | Result |
|---|---|---|---|---|---|
| 1 | 1 | Matthew DENNY | AUS | QLD | 67.51 |
| 2 | 5 | Darcy MILLER | AUS | SA | 57.66 |
| 3 | 6 | Darcy GIDDINGS | AUS | VIC | 51.87 |
| 2 | 2 | Lawrence OKOYE | GBR | | 65.09 |
| 3 | 3 | Roje STONA | JAM | | 64.60 |

Claudio Romero (CHI, 4th, no medal) dropped — this is an individual event.

## 8. Para Events

Para athletes' **performance percentage** must be extracted from the Roster Athletics notes field into its own column.

- Format is always **XX.XX**.
- All other note text is stripped, including implement weight (e.g. "2kg").
- Examples: Sarah Clifton-Bly, Seated Shot Put Final Women Para Senior → **69.31**. Cooper Rob-Jackson, 400m Final Summary Men Para Senior → **90.84**.

## 9. The Script (Combined Events Only)

Applies to **decathlon, heptathlon, and pentathlon finals only**. Everything in `{ }` is a variable filled from the event's ceremonies data. Everything else is fixed boilerplate, identical every time.

```
Your finalists for the
{Men's} {Open} {Decathlon}
Championship.

In {9th} place with a total of {4482} points
representing {New South Wales}
{Benjamin PITTMAN}

In {8th} place with a total of {4937} points
representing {New South Wales}
{Chase LEE}

In {7th} place with a total of {6198} points
representing {South Australia}
{Fraser WESTERN}

…(continues in descending place order down to 4th)…

And now, your medallists for the
{Men's} {Open} {Decathlon}
Championship

Third place and bronze medallist
with a total of {6666} points
representing {New South Wales}
{Tom STONE}

Second place and silver medallist
with a total of {6845} points
representing {Victoria}
{Lenny ROBIN}

First place and gold medallist
with a total of {6872} points
representing {South Australia}
{Logoh TLIGI}

Your medallists for the
{Men's} {Open} {Decathlon}

We also recognise the following international athletes.

With a total of {6959} points
In {first} place
Representing {GBR}
{Sam TALBOT}

With a total of {5968} points
Representing {COK}
{Max TEURUAA}

Congratulations to all of the finalists for the
{Men's} {Open} {Decathlon}
```

### 9.1 Script rules

1. **Reading order:** Australian non-medallists in DESCENDING place order (9th, 8th, 7th... down to 4th), then medallists 3rd → 2nd → 1st, then internationals.
2. **Australian line format:** place first, points second. "In {Nth} place with a total of {X} points."
3. **International line format:** points first, place second. "With a total of {X} points / In {place} place."
4. **Internationals in the top 3** get the "In {place} place" line. **Internationals outside the top 3 get no place line at all.** This mirrors the ceremonies table (number vs hyphen).
5. **"Championship"** is fixed text. It appears after the title in the **first two** title mentions only (the finalists intro and the medallists intro). The last two mentions omit it.
6. Medallist lead lines ("Third place and bronze medallist", "Second place and silver medallist", "First place and gold medallist") are fixed text.

### 9.2 Script variables

| Variable | Source | Example |
|---|---|---|
| {Sex} | Roster gender | Men's |
| {Age group} | Roster age group; "Senior" maps to "Open" | Open |
| {Event} | Roster event name | Decathlon |
| {Place ordinal} | Ceremonies place order | 9th, first |
| {Points} | Roster result | 4482 |
| {State} | Roster club code, expanded to full name | New South Wales |
| {Name} | Roster participant | Benjamin PITTMAN |
| {Country code} | Roster country code, NOT expanded | GBR, COK |

### 9.3 Text transforms

| Transform | Rule |
|---|---|
| State expansion | SA → South Australia, NSW → New South Wales, VIC → Victoria, QLD → Queensland, WA → Western Australia, TAS → Tasmania, NT → Northern Territory, ACT → Australian Capital Territory |
| Country codes | Left as codes. GBR stays GBR |
| Age group | Senior → Open |

### 9.4 Other event types

**PLACEHOLDER.** Scripts for individual track events, individual field events, relays, and para events will be provided later. The Script tab for those events should display a "script coming soon" placeholder until then. Note for later: "with a total of {X} points" only fits combined events; track will need a time phrasing and field a distance phrasing.

## 10. Data Facts Confirmed From Live Roster Data

- Roster reliably shows a **country for every athlete**.
- Roster shows a **club/state only for Australian athletes** (their state code); internationals show country only.
- Roster's public site is a JavaScript single-page app; results pages live at `/public/competitions/details/results?id={compId}&meId={eventId}`.
- Event statuses observed so far: "Finished." The full set of Roster status values needs mapping to the four automatic colours during build.

## 11. Reference Data

| Item | Value |
|---|---|
| 2026 Maurie Plant Meet Melbourne | Roster competition id 27236 |
| Maurie Plant Discus Throw (2kg) Final Men Senior | meId 371113 |
| 2026 Australian Athletics Championships | Roster competition id 27550 |
| Aus Champs Decathlon Final Men Senior | meId 336973 |
| 2025 WA All Schools Championships (earlier test) | Roster competition id 27351 |

## 12. Open Decisions (Blocking None, Needed Before Ship)

1. **"Championship" at non-championship meets.** It's hardcoded, so a Maurie Plant script would read "...Discus Throw Championship." Proposed: a per-competition toggle, defaulting on when the competition name contains "Championships."
2. ~~**Country column on field-event start lists.**~~ **Resolved 2 Aug 2026:** Country appears on every start list. Without it a field-event start list showed only the club, leaving the operator unable to tell an athlete's country. Field order is Participant, Country, Club, PB, SB — Country before Club, matching the Results and Ceremonies tabs.
3. **Back button from a pink event.** Confirm it returns to the home screen (the "previous screen" rule implies yes).
4. **Scripts for non-combined events.** To be supplied. Placeholders ship in the meantime.
5. **Roster status mapping.** Confirm the exact Roster status values that map to red / orange / yellow / green once we can observe a live in-progress meet.

## 13. Suggested Build Phases

| Phase | Deliverable | Why first |
|---|---|---|
| 1 | Data layer: pull a competition's finals, statuses, start lists, and results from Roster | Everything depends on it; also proves the scraping/API approach |
| 2 | Home screen: red header + four quadrants + auto colour sorting + pink promotion | The client's daily view |
| 3 | Event screen: tabs, Results as-is, Ceremonies ordering engine, para percentage extraction | The core logic, already fully specified and verified against two live events |
| 4 | Script tab: combined-events template + transforms + placeholders for other types | Spec complete for combined events |
| 5 | Polish: competition picker (Australia, 2026+), live refresh cadence, sidebar | Ship-readiness |
