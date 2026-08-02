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
| Location | ~~Australia only~~ **Revised 2 Aug 2026: any country.** See §3.1 |
| Date | Any — filterable from/to. See §3.1 |
| Rounds | Finals only. No heats, no prelims, no semis |
| Athletes | All age groups, both sexes, para and able-bodied |

### 3.1 Competitions browser (revised 2 Aug 2026)

The Australia-only, 2026-onwards scope is replaced by a **Competitions screen**
reached from a single **Competitions** button in the sidebar — the sidebar does
not list competitions, because Roster carries thousands and a long list is the
overwhelm this tool exists to remove.

The screen has a **search bar**, a **country filter** and a **from/to date
filter**, and a **Back button** like every other screen. Selecting a
competition opens a confirmation panel showing its date and time, venue,
address, city and country, organiser, status and Roster id, so the operator can
be certain they have the right meet before committing. A **Set as my
competition** button then loads it.

Everything is read live from Roster:

| Shown | Source |
|---|---|
| Search results | `POST /api/public/meeting/search/v2` — the same request body Roster's own browser posts |
| Unfiltered list | `GET /api/public/meeting/list/v2` (Roster's highlights) |
| Confirmation panel | `GET /api/public/meeting/{id}/details` |
| Country names and flags | Roster's own `locationService` country table, extracted verbatim (253 entries, including Roster-specific entries such as Wales and Athlete Refugee Team) |

Times are shown as Roster stores them — venue-local wall time, with the zone
named beside them — so the dashboard never disagrees with the competition's own
Roster page.

### 3.2 Finals summaries (revised 2 Aug 2026)

When a final is too big for one section, Roster splits it into **group finals**
and publishes a **Finals Summary** ranking everyone together. All of them are
stored as `eventStage: "Final"`, distinguished only by `stageGroup`: 0 is the
summary, 1, 2, … are the groups.

**Medals are presented on the summary, so the dashboard shows the summary and
hides the group finals behind it.** Reading from a group final would crown the
wrong athlete — this is not a tidiness issue:

| Case | What the group finals say | What the summary says |
|---|---|---|
| Shot Put, Men PA Senior (27550/337021) | Todd HODGETTS throws 13.36, further than Ryan BLAIR's 13.35 | HODGETTS is 5th, BLAIR 3rd — ranking is on percentage |
| 1500m, Women U14 (27545/353923) | Layla DENT wins group A | DENT is 3rd; Viktorie TREBULOVA won group B and the title |

Detection: group the finals by event, age group and gender; where a group holds
more than one final and one of them has `stageGroup` 0, that one is the summary
and the rest are dropped. If no `stageGroup` 0 exists there is no summary to
present from, so every final in the group is kept rather than guessed at.
Verified across two meets — 4 split events at the 2026 Australian
Championships, 16 at the 2026 Junior Championships, every one matching.

The header and card read Roster's own wording, "Shot Put · Finals Summary"
rather than "· Final". Note this is **not** a para-only feature: the U14 1500m
above is an able-bodied event split for track capacity.

The script is unchanged for these events — a para summary is ranked on
percentage but still announces the athlete's mark, per §9.6. Revisit if the
client asks for the percentage to be read.

**Start-list order on a summary.** Each group final numbers its own entries
from 1, so the summary's start list is ordered by **group, then order**, which
is how Roster lists it: 27550/337021 runs order 1–12 in group A, then 1–2 in
group B, opening with Christopher ALBERT. A **Group** column is added on
summaries, as Roster has, since the order number restarting at 1 otherwise
looks like a sorting fault. Roster letters the groups A, B, … and the Results
tab writes the place within the group beside it, "A (1)".

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

*Revised 2 Aug 2026: the not-started events moved off the board (see 5.1).*

- A **header across the top** holding the competition name, a **sidebar button**, a **Not started button**, and a **date filter**.
- Below the header, the screen is divided into **four quadrant sections**:

| | Left | Right |
|---|---|---|
| **Top** | 🩷 PINK — finished, finalised, ready and waiting in ceremonies | 🟢 GREEN — finished and finalised |
| **Bottom** | 🟠 ORANGE — in progress | 🟡 YELLOW — finished, results not finalised |

- Each section contains **event cards** for the events currently in that state. The pink section is populated only by events promoted from the green section.
- Each card shows **just the event name**, worded exactly as Roster Athletics words it. Example:

  > Discus Throw (2kg) · Final
  > 🟡 Gold · Men · Senior

### 5.1 Not started — its own page (revised)

The red not-started strip originally sat across the top of the board. It made
the board feel clunky and took space from the sections the operator actually
works in, so it is now a **red "Not started" button in the header** carrying a
live count. Pressing it opens a dedicated page listing every final that has not
started, grouped by competition day, with a **Back button** like the other
pages.

### 5.2 Date filter (new)

A **date toggle in the header** lets the operator show only the days they are
presenting on. It lists every day the competition's finals fall on, as
checkboxes; selecting none means all days. Days are computed in the **venue's
timezone**, not the viewer's — the 2026 Aus Champs first session is 2026-04-08
23:00 UTC, which is the morning of 9 April in Sydney, and grouping in the wrong
zone would put a whole session on the wrong day.

The selection applies to the board and to the Not started page, and is shared
across them.

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

### 9.1a Wording taken from Roster (revised 2 Aug 2026)

Gender and age group are rendered **exactly as Roster renders them**, by
reproducing Roster's own `gender | header` transform and its age-group naming.
Verified against live Roster pages:

| Roster page | Renders |
|---|---|
| Aus Champs decathlon U20 (meId 336984) | Men · U20 |
| Aus Champs seated shot put (meId 337046) | Women · PA Senior |
| WA All Schools triple jump (meId 334388) | Women · U18 |

Roster's gender transform takes a profile — Senior gives Men / Women / Mixed,
Youth gives Boys / Girls / Mixed Youth, Both gives Men & Boys / Women & Girls.
Roster's event header uses the **Senior** profile, which is why a U18 girls'
final reads "Women · U18" on Roster itself. Age groups map `Meeting_N` → `UN`
and underscores → spaces, so `PA_Senior` reads "PA Senior" — **not** "Para
Senior".

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

**PLACEHOLDER.** The relay script will be provided later; relay finals show a "script coming soon" placeholder until then. Individual timed track events are specified in §9.5 and individual field events in §9.6.

### 9.5 Individual timed track events (revised 2 Aug 2026)

Applies when Roster's event name is one of the following 21 events. Matched on
Roster's exact name, with any trailing implement/detail parenthetical stripped.
Relays are **not** in this list and keep the placeholder.

100m · 200m · 400m · 80m Hurdles · 90m Hurdles · 100m Hurdles · 110m Hurdles ·
200m Hurdles · 400m Hurdles · 100m Wheelchair · 200m Wheelchair ·
400m Wheelchair · 800m · 1500m · 3000m · 5000m · 2000m Steeplechase ·
3000m Steeplechase · 3000m Race Walk · 5000m Race Walk · 800m Wheelchair

Template — medallists only, read bronze → silver → gold:

```
Your medallists for the
{Sex} {Age group} {Event}
Championship

Third place and bronze medallist with a time of
{spoken time}
representing
{Club/team}
{Name}

Second place and silver medallist with a time of
…

First place and gold medallist with a time of
…

[if an international medalled]
We also recognise {Name} representing {Country code} with a {gold/silver/bronze} medal for {his/her} performance of {spoken time}

Your medallists for the
{Sex} {Age group} {Event}
```

**International medallists.** In an individual event an international only
reaches the ceremonies list by finishing in the top 3 overall (§7.1), so
reaching this block *is* medalling. The medal word comes from their **overall**
finishing position — the same number the ceremonies table shows — which is why
an international who wins outright is recognised with a gold medal even though
the national gold goes to the leading Australian. One line per international,
read gold first. The pronoun comes from the event's gender, the only gender
Roster states; a mixed event reads "their".

**Spoken time.** Derived from the *displayed* time, never re-derived from the
raw value, so the script can never state a time that differs from the Results
tab. "4:12.45" → "4 minutes 12 point 45 seconds". A thousandths tie-break
("10.34 (.334)") is spoken as the official time — the finer reading separates
places on paper and is not read aloud. Units are singular at 1 ("1 minute").

One point resolved by judgement, flagged for confirmation:

1. **Sub-minute races have no minutes segment.** A 10.34 is spoken
   "10 point 34 seconds", not "0 minutes 10 point 34 seconds".

Verified end to end against two live payloads: the all-Australian 1500m Final
Men U18 (27351/316510) and the 100m Final Women PA Senior at the 2026
Australian Championships (27550/337273), where Danielle Aitchison (NZL) won
outright.

### 9.6 Individual field events (revised 2 Aug 2026)

Applies when Roster's event name, before any implement is appended, is one of:

High Jump · Long Jump · Triple Jump · Pole Vault · Shot Put · Discus Throw ·
Javelin Throw · Hammer Throw · Seated Shot Put · Seated Javelin Throw

Same structure as §9.5 — medallists only, bronze → silver → gold, then any
international medallist — with three differences:

```
Your medallists for the {Sex} {Age group} {Event} Championship.

Third place and bronze medallist with a best of
{xx} point {xx} metres
representing
{Club/team}
{Name}

… silver, then gold …

[if an international medalled]
We also recognise {Name} representing {Country code} with a {gold/silver/bronze} medal for {his/her} performance of {xx} point {xx} metres

Your medallists for the
{Sex} {Age group} {Event}
```

1. The opening is **one sentence ending in a full stop**, where the track
   opening is three lines with none. That is how the two templates were
   supplied — see the flag below.
2. "with a **best** of", not "with a time of" — the mark is the best of the
   athlete's counting attempts, which is what the Results tab already shows.
3. The mark is spoken in metres: "8.26" → "8 point 26 metres", read from the
   displayed mark so it cannot differ from the Results tab. Roster prints two
   decimals always, so a whole-metre throw reads "15 point 00 metres".

Two points resolved by judgement, flagged for confirmation:

1. **The opening line differs in shape from the track script's** (one sentence
   with a full stop vs three lines without). Both are as supplied; say the word
   and they can be made to match.
2. **"15 point 00 metres"** is read literally from Roster's two decimals rather
   than shortened to "15 metres".

Verified end to end against three live payloads: Long Jump Final Men Senior
(27550/337387), High Jump Final Men Senior (27550/336995), and Discus Throw
(2kg) Final Men Senior at the 2026 Maurie Plant Meet (27236/371113), where
Lawrence Okoye (GBR) and Roje Stona (JAM) took silver and bronze outright and
Claudio Romero (CHI), fourth, is correctly not read at all.

## 10. Data Facts Confirmed From Live Roster Data

- Roster reliably shows a **country for every athlete**.
- ~~Roster shows a **club/state only for Australian athletes** (their state code); internationals show country only.~~ **Corrected 2 Aug 2026.** Roster shows whatever club the *entry* carries, whatever the athlete's country: 27550/337075 lists Aynslee VAN GRAAN (RSA) under club NSW. An entry with no club shows nothing — which is the usual case for a visiting international, and is what produced the original reading.
- **Country is the athletics code, not the ISO code (added 2 Aug 2026).** The athlete payload carries both `country` ("RSA") and `countryCode` ("ZAF"); Roster prints `country`. The dashboard does the same. `countryCode` is still what the competition search filters on, because that is what Roster's search posts.
- **Roster prints the middle name (added 2 Aug 2026).** 27550/337075 reads "Helena Rose BUTLER", from firstName "Helena", middleName "Rose", lastName "Butler".
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
