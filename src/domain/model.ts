import type {
  AgeGroupDto,
  MeetingDetailsDto,
  MeetingEventDto,
  ResultsPayload,
  SchedulePayload,
  SeImplementDto,
  SportEventDto,
} from '../api/types'
import {
  formatAgeGroupName,
  formatMark,
  genderLabel,
  genderProfileForAgeGroup,
  implementLabel,
  inferResultType,
  inferScoring,
  participantDisplayName,
  startStatusLabel,
} from './format'
import type { ResultType, Scoring } from '../api/types'
import { extractParaPercentage } from './para'

/**
 * Age-group names come from the meeting's own `ageGroups` list, which the
 * /details payload carries for exactly the groups that meeting uses — no
 * extra request needed. An id we can't resolve renders as nothing rather
 * than as a bare number.
 */
export function ageGroupName(
  ageGroupId: number | undefined,
  ageGroups: AgeGroupDto[] | undefined,
): string {
  if (ageGroupId == null) return ''
  const match = ageGroups?.find((ag) => ag.ageGroupIdPk === ageGroupId)
  return formatAgeGroupName(match?.name)
}

/** One final on the home screen — a card. */
export interface FinalEvent {
  meId: number
  meetingId: number
  /** Roster wording, e.g. "Discus Throw (2kg)" or "Decathlon". */
  name: string
  /** Roster's extra label, e.g. "Gold". */
  label: string
  gender: string
  genderRaw: string
  /** Which wording profile this event renders with — Youth gives Girls/Boys. */
  genderProfile: import('./format').GenderProfile
  ageGroup: string
  /** How Roster stores this event's marks — drives all result formatting. */
  resultType: ResultType
  /** Whether the best mark is the smallest (a time) or the largest. */
  scoring: Scoring
  isCombined: boolean
  isRelay: boolean
  hasLanes: boolean
  /**
   * Roster's own stage wording — "Final", or "Finals Summary" when this event
   * combines several group finals. Shown verbatim on the card and header.
   */
  stageLabel: string
  startDateTime?: string
  timePubliclyVisible: boolean
  hasResults: boolean
  resultsComplete: boolean
  raw: MeetingEventDto
}

/**
 * A final split across several groups is published by Roster as one **Finals
 * Summary** (`stageGroup` 0) plus the group finals (`stageGroup` 1, 2, …), all
 * of them stored as `eventStage: 'Final'`. Medals are presented on the
 * summary, and only the summary carries the medal order: at 27550/337021 Todd
 * HODGETTS out-throws Ryan BLAIR yet places below him on percentage, and at
 * 27545/353923 Layla DENT wins group A but finishes 3rd overall.
 *
 * The group finals are therefore dropped (plan §3.2) — presenting off one
 * would crown the wrong athlete. Returns the meIds to drop, and the summaries.
 */
function splitFinals(events: MeetingEventDto[]): {
  drop: Set<number>
  summaries: Set<number>
} {
  const byEvent = new Map<string, MeetingEventDto[]>()
  for (const me of events) {
    const key = `${me.eventIdFk}|${me.ageGroupIdFk}|${me.gender}`
    byEvent.set(key, [...(byEvent.get(key) ?? []), me])
  }

  const drop = new Set<number>()
  const summaries = new Set<number>()
  for (const siblings of byEvent.values()) {
    if (siblings.length < 2) continue
    const summary = siblings.find((me) => (me.stageGroup ?? 0) === 0)
    // With no stage-group 0 there is no summary to present from, so every
    // final in the group is kept rather than guessed at.
    if (!summary) continue
    summaries.add(summary.meetingEventIdPk)
    for (const me of siblings) {
      if (me !== summary) drop.add(me.meetingEventIdPk)
    }
  }
  return { drop, summaries }
}

/**
 * Finals only (plan §3): eventStage === 'Final', excluding the child events
 * of combined events (each decathlon discipline is itself stored as a
 * "Final"), the group finals behind a Finals Summary (§3.2), and events Roster
 * hides from the public schedule.
 */
export function buildFinals(
  schedule: SchedulePayload,
  details: MeetingDetailsDto,
  implementList: SeImplementDto[] = [],
): FinalEvent[] {
  const sportEvents = new Map<number, SportEventDto>(
    (details.sportEvents ?? []).map((se) => [se.eventIdPk, se]),
  )
  const implementMap = new Map<number, SeImplementDto>(
    implementList.map((im) => [im.seImplementIdPk, im]),
  )

  const finals = schedule.data
    .filter((env) => env.op !== 'Delete')
    .map((env) => env.entityDto)
    .filter(
      (me) =>
        me.eventStage === 'Final' &&
        me.combinedMeetingEventIdFk == null &&
        me.visibility !== 'None' &&
        me.visibility !== 'Hidden',
    )

  const { drop, summaries } = splitFinals(finals)

  return finals
    .filter((me) => !drop.has(me.meetingEventIdPk))
    .map((me) => {
      const se = sportEvents.get(me.eventIdFk)
      const isCombined = Boolean(se?.combined) || me.combinedSportEventIdFk != null
      const im = me.seImplementIdFk ? implementMap.get(me.seImplementIdFk) : undefined
      const implement = implementLabel(im?.implement, im?.implementUnit)
      const baseName = se?.eventName ?? `Event ${me.eventIdFk}`
      const ageGroupRec = (details.ageGroups ?? []).find(
        (ag) => ag.ageGroupIdPk === me.ageGroupIdFk,
      )
      // Roster's schedule words a youth group Girls/Boys; reproduce that,
      // not the results-header wording (see genderProfileForAgeGroup).
      const genderProfile = genderProfileForAgeGroup(me.gender, ageGroupRec)
      return {
        meId: me.meetingEventIdPk,
        meetingId: me.meetingIdFk,
        name: implement ? `${baseName} (${implement})` : baseName,
        label: me.label ?? '',
        gender: genderLabel(me.gender, genderProfile),
        genderRaw: me.gender,
        genderProfile,
        ageGroup: ageGroupName(me.ageGroupIdFk, details.ageGroups),
        resultType: se?.resultType ?? inferResultType(se?.eventType, isCombined),
        scoring:
          se?.scoring ??
          inferScoring(se?.resultType ?? inferResultType(se?.eventType, isCombined)),
        isCombined,
        isRelay: Boolean(se?.relay),
        hasLanes: Boolean(se?.lanes),
        stageLabel: summaries.has(me.meetingEventIdPk)
          ? 'Finals Summary'
          : 'Final',
        startDateTime: me.startDateTime,
        timePubliclyVisible: me.timePubliclyVisible ?? false,
        hasResults: me.hasResults ?? false,
        resultsComplete: me.resultsComplete ?? false,
        raw: me,
      } satisfies FinalEvent
    })
    .sort((a, b) => (a.startDateTime ?? '').localeCompare(b.startDateTime ?? ''))
}

/** One athlete row on the event screen, fully joined. */
export interface EventRow {
  participantId: number
  name: string
  country: string
  /** Club/state short code exactly as Roster lists it; '' when the entry has none. */
  club: string
  /** Full club/state name from Roster, e.g. "South Australia". */
  clubLong: string
  lane?: number
  position?: number
  /** On a Finals Summary, the group this entry competed in (1 → "A"). */
  group?: number
  /** Place within that group. */
  groupPlace?: number
  /** Overall finishing position (Roster place); absent for DNF/DNS/DQ. */
  place?: number
  /** Formatted best mark / points, or DNF/DNS/DQ label. */
  result: string
  resultRaw?: number
  /** PB/SB notes as Roster shows them. */
  notes: string
  paraPercentage?: string
  pb: string
  sb: string
  startStatus: string
  /** True when the athlete finished with a mark (has an overall place). */
  isFinisher: boolean
}

/** Join the results-v2 payload into display rows, sorted by overall position. */
export function buildEventRows(final: FinalEvent, payload: ResultsPayload): EventRow[] {
  const athletes = new Map(payload.athleteList.map((a) => [a.athleteIdPk, a]))
  const clubs = new Map(payload.clubList.map((c) => [c.clubIdPk, c]))
  const resultsByMp = new Map<number, typeof payload.resultList>()
  for (const env of payload.resultList) {
    if (env.op === 'Delete') continue
    const key = env.entityDto.meetingParticipantIdFk
    const list = resultsByMp.get(key) ?? []
    list.push(env)
    resultsByMp.set(key, list)
  }

  const relayTeams = new Map(
    (payload.relayList ?? []).map((r) => [r.relayTeamIdPk, r]),
  )

  const entrants = payload.mpList
    .filter((env) => env.op !== 'Delete')
    .map((env) => env.entityDto)
    .filter((mp) => mp.meetingEventIdFk === final.meId)

  // A relay's competitors are the teams, not the runners: Roster lists
  // "New South Wales", and the individual legs hang off the team row. Without
  // this, every row of a relay final renders with a blank name.
  const isRelayEntry = entrants.some(
    (mp) => mp.relayTeamIdFk != null && mp.meetingParticipantRelayTeamIdFk == null,
  )
  const competitors = isRelayEntry
    ? entrants.filter(
        (mp) => mp.relayTeamIdFk != null && mp.meetingParticipantRelayTeamIdFk == null,
      )
    : entrants

  const rows = competitors
    .map((mp) => {
      const athlete = mp.athleteIdFk ? athletes.get(mp.athleteIdFk) : undefined
      const team = mp.relayTeamIdFk ? relayTeams.get(mp.relayTeamIdFk) : undefined
      const club = mp.clubIdFk ? clubs.get(mp.clubIdFk) : undefined
      const results = (resultsByMp.get(mp.meetingParticipantIdPk) ?? []).map(
        (e) => e.entityDto,
      )

      // Best mark: combined events carry the score on the participant; other
      // events take the best Ok attempt.
      let resultRaw: number | undefined
      // Roster records the precision each mark was timed to; a race split on
      // thousandths must be displayed as such (see formatDuration).
      let decimalDigits = 2
      if (final.isCombined) {
        resultRaw = mp.combinedEventScore
      } else {
        const counting = results.filter(
          (r) => r.resultStatus === 'Ok' && r.result != null,
        )
        if (counting.length > 0) {
          // Roster states whether the best mark is the lowest (a time) or the
          // highest (a distance or score) — never inferred here.
          const best = counting.reduce((a, b) =>
            final.scoring === 'Lowest'
              ? b.result! < a.result!
                ? b
                : a
              : b.result! > a.result!
                ? b
                : a,
          )
          resultRaw = best.result
          decimalDigits = best.decimalDigits ?? 2
        }
      }

      const statusLabel = startStatusLabel(mp.startStatus)
      const result =
        resultRaw != null
          ? formatMark(resultRaw, final.resultType, decimalDigits)
          : statusLabel

      // Notes: PB/SB record markers from the counting result(s).
      const recordTypes = new Set<string>()
      for (const r of results) {
        if (final.isCombined && r.result !== resultRaw) continue
        if (!final.isCombined && r.result !== resultRaw) continue
        for (const rec of r.records ?? []) {
          if (rec.recordType) recordTypes.add(rec.recordType)
        }
        if (r.record === 'PersonalBest') recordTypes.add('PB')
        if (r.record === 'SeasonBest') recordTypes.add('SB')
      }
      // PB implies it is also an SB; Roster shows just "PB".
      if (recordTypes.has('PB')) recordTypes.delete('SB')

      // Roster prints the athletics code ("RSA"), not the ISO one ("ZAF").
      // Verified on Roster's own results page for 27550/337075, which reads
      // "Aynslee VAN GRAAN 1995 · RSA".
      const country =
        athlete?.country ??
        athlete?.countryCode ??
        team?.country ??
        team?.countryCode ??
        ''
      return {
        participantId: mp.meetingParticipantIdPk,
        // Roster shows a relay team by its long name ("New South Wales").
        name:
          team?.longName ??
          team?.shortName ??
          participantDisplayName(
            athlete?.firstName,
            athlete?.lastName,
            athlete?.athleteName,
            athlete?.middleName,
          ),
        country,
        // Roster shows whatever club the entry carries, regardless of the
        // athlete's country: 27550/337075 lists Aynslee VAN GRAAN (RSA) under
        // club NSW. An entry with no club simply shows nothing.
        club: club?.shortName ?? '',
        clubLong: club?.longName ?? '',
        lane: mp.lane,
        position: mp.position,
        group: mp.groupNo,
        groupPlace: mp.groupPlace,
        place: mp.place,
        result,
        resultRaw,
        notes: [...recordTypes].sort().join(' '),
        paraPercentage: extractParaPercentage(mp.notesPublic),
        pb: formatMark(mp.initialPersonalBest, final.resultType),
        sb: formatMark(mp.initialSeasonBest, final.resultType),
        startStatus: mp.startStatus ?? 'Ok',
        isFinisher: mp.place != null,
      } satisfies EventRow
    })

  // Results-tab order: by overall place, DNF/DNS/DQ at the bottom.
  return rows.sort((a, b) => {
    if (a.place != null && b.place != null) return a.place - b.place
    if (a.place != null) return -1
    if (b.place != null) return 1
    return (a.position ?? 0) - (b.position ?? 0)
  })
}

/**
 * Start-list order, exactly as Roster lists it: **group first, then lane or
 * start order**.
 *
 * The group matters on a Finals Summary, where each group final numbers its
 * own entries from 1 — 27550/337021 runs order 1–12 in group A and 1–2 in
 * group B, and Roster starts the list with Christopher ALBERT, group A order
 * 1, not with the group B entry that shares order 1. Sorting on the order
 * number alone interleaves the two groups.
 */
export function startListRows(rows: EventRow[]): EventRow[] {
  return [...rows].sort((a, b) => {
    const byGroup = (a.group ?? 0) - (b.group ?? 0)
    if (byGroup !== 0) return byGroup
    if (a.lane != null && b.lane != null) return a.lane - b.lane
    return (a.position ?? 0) - (b.position ?? 0)
  })
}
