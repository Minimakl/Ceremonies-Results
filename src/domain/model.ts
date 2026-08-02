import type {
  MeetingDetailsDto,
  MeetingEventDto,
  ResultsPayload,
  SchedulePayload,
  SeImplementDto,
  SportEventDto,
} from '../api/types'
import {
  eventKind,
  formatMark,
  genderLabel,
  implementLabel,
  participantDisplayName,
  startStatusLabel,
  type EventKind,
} from './format'
import { extractParaPercentage } from './para'

/**
 * Age-group names. Roster's global age-group list endpoint takes a per-country
 * set id we haven't fully mapped (docs/ROSTER-API.md); until then known ids are
 * resolved from this map and unknown ids fall back to "Age group {id}".
 */
const AGE_GROUP_NAMES: Record<number, string> = {
  245: 'Senior',
}

export function ageGroupName(ageGroupId: number | undefined): string {
  if (ageGroupId == null) return ''
  return AGE_GROUP_NAMES[ageGroupId] ?? `Age group ${ageGroupId}`
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
  ageGroup: string
  kind: EventKind
  isCombined: boolean
  hasLanes: boolean
  startDateTime?: string
  timePubliclyVisible: boolean
  hasResults: boolean
  resultsComplete: boolean
  raw: MeetingEventDto
}

/**
 * Finals only (plan §3): eventStage === 'Final', excluding the child events
 * of combined events (each decathlon discipline is itself stored as a
 * "Final") and events Roster hides from the public schedule.
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

  return schedule.data
    .filter((env) => env.op !== 'Delete')
    .map((env) => env.entityDto)
    .filter(
      (me) =>
        me.eventStage === 'Final' &&
        me.combinedMeetingEventIdFk == null &&
        me.visibility !== 'None' &&
        me.visibility !== 'Hidden',
    )
    .map((me) => {
      const se = sportEvents.get(me.eventIdFk)
      const isCombined = Boolean(se?.combined) || me.combinedSportEventIdFk != null
      const im = me.seImplementIdFk ? implementMap.get(me.seImplementIdFk) : undefined
      const implement = implementLabel(im?.implement, im?.implementUnit)
      const baseName = se?.eventName ?? `Event ${me.eventIdFk}`
      return {
        meId: me.meetingEventIdPk,
        meetingId: me.meetingIdFk,
        name: implement ? `${baseName} (${implement})` : baseName,
        label: me.label ?? '',
        gender: genderLabel(me.gender),
        genderRaw: me.gender,
        ageGroup: ageGroupName(me.ageGroupIdFk),
        kind: eventKind(se?.eventType, isCombined),
        isCombined,
        hasLanes: Boolean(se?.lanes),
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
  /** Club/state short code — '' for internationals (Roster shows none). */
  club: string
  /** Full club/state name from Roster, e.g. "South Australia". */
  clubLong: string
  lane?: number
  position?: number
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

  const rows = payload.mpList
    .filter((env) => env.op !== 'Delete')
    .map((env) => env.entityDto)
    .filter((mp) => mp.meetingEventIdFk === final.meId)
    .map((mp) => {
      const athlete = mp.athleteIdFk ? athletes.get(mp.athleteIdFk) : undefined
      const club = mp.clubIdFk ? clubs.get(mp.clubIdFk) : undefined
      const results = (resultsByMp.get(mp.meetingParticipantIdPk) ?? []).map(
        (e) => e.entityDto,
      )

      // Best mark: combined events carry the score on the participant; other
      // events take the best Ok attempt.
      let resultRaw: number | undefined
      if (final.isCombined) {
        resultRaw = mp.combinedEventScore
      } else {
        const marks = results
          .filter((r) => r.resultStatus === 'Ok' && r.result != null)
          .map((r) => r.result!)
        if (marks.length > 0) {
          resultRaw = final.kind === 'track' ? Math.min(...marks) : Math.max(...marks)
        }
      }

      const statusLabel = startStatusLabel(mp.startStatus)
      const result =
        resultRaw != null ? formatMark(resultRaw, final.kind) : statusLabel

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

      const isAus = athlete?.countryCode === 'AUS'
      return {
        participantId: mp.meetingParticipantIdPk,
        name: participantDisplayName(
          athlete?.firstName,
          athlete?.lastName,
          athlete?.athleteName,
        ),
        country: athlete?.countryCode ?? '',
        club: isAus ? (club?.shortName ?? '') : '',
        clubLong: isAus ? (club?.longName ?? '') : '',
        lane: mp.lane,
        position: mp.position,
        place: mp.place,
        result,
        resultRaw,
        notes: [...recordTypes].sort().join(' '),
        paraPercentage: extractParaPercentage(mp.notesPublic),
        pb: formatMark(mp.initialPersonalBest, final.kind),
        sb: formatMark(mp.initialSeasonBest, final.kind),
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

/** Start-list order: lane order for track, start order otherwise. */
export function startListRows(rows: EventRow[]): EventRow[] {
  return [...rows].sort((a, b) => {
    if (a.lane != null && b.lane != null) return a.lane - b.lane
    return (a.position ?? 0) - (b.position ?? 0)
  })
}
