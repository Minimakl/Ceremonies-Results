// Roster Athletics public API DTOs (camelCase JSON).
// See docs/ROSTER-API.md for discovery notes and verification.

export type EventStage =
  | 'Final'
  | 'Heat'
  | 'SemiFinal'
  | 'Preliminary'
  | 'Qualification'

export type Gender = 'Male' | 'Female' | 'Mixed'

export interface MeetingEventDto {
  meetingEventIdPk: number
  meetingIdFk: number
  eventIdFk: number
  seImplementIdFk?: number
  ageGroupIdFk: number
  combinedSportEventIdFk?: number
  /** Set on the child events of a combined event (e.g. decathlon 100m). */
  combinedMeetingEventIdFk?: number
  startDateTime?: string
  eventStage: EventStage
  stageGroup?: number
  gender: Gender
  label?: string
  timePubliclyVisible?: boolean
  visibility?: string
  hasParticipants?: boolean
  hasResults?: boolean
  resultsComplete?: boolean
}

export interface WsEnvelope<T> {
  op: 'Create' | 'Update' | 'Delete'
  entityIdPk: number
  entityDto: T
}

export interface SchedulePayload {
  type: 'Full' | 'Update'
  data: WsEnvelope<MeetingEventDto>[]
}

export interface AthleteDto {
  athleteIdPk: number
  athleteName?: string
  firstName?: string
  lastName?: string
  countryCode?: string
  yearOfBirth?: number
  paraClassTrack?: string
  paraClassField?: string
}

export interface ClubDto {
  clubIdPk: number
  shortName?: string
  longName?: string
  countryCode?: string
  stateCode?: string
}

export interface MeetingParticipantDto {
  meetingParticipantIdPk: number
  meetingEventIdFk: number
  athleteIdFk?: number
  relayTeamIdFk?: number
  clubIdFk?: number
  position?: number
  lane?: number
  /** Overall finishing position; absent for DNF / DNS / DQ. */
  place?: number
  combinedEventScore?: number
  startStatus?: string
  initialPersonalBest?: number
  initialSeasonBest?: number
  notesPublic?: string
}

export interface ResultDto {
  resultIdPk: number
  meetingParticipantIdFk: number
  attempt?: number
  result?: number
  resultStatus?: string
  record?: string
  records?: { recordType?: string }[]
  windReading?: number
  decimalDigits?: number
}

export interface ResultsPayload {
  type: 'Full' | 'Update'
  athleteList: AthleteDto[]
  clubList: ClubDto[]
  relayList: unknown[]
  mpList: WsEnvelope<MeetingParticipantDto>[]
  resultList: WsEnvelope<ResultDto>[]
  athleteExtraList: unknown[]
  relayExtraList: unknown[]
}

export interface SportEventDto {
  eventIdPk: number
  eventName: string
  eventType?: string
  lanes?: boolean
  relay?: boolean
  combined?: boolean
  hasImplements?: boolean
}

export interface MeetingDetailsDto {
  meetingId: number
  meetingName: string
  tz?: string
  startDateTime?: string
  endDateTime?: string
  meetingStatus?: string
  address?: { city?: string; country?: string }
  sportEvents?: SportEventDto[]
}

export interface SeImplementDto {
  seImplementIdPk: number
  eventIdFk?: number
  gender?: string
  /** Weight/size. Kilogram unit stores hundredths (200 = 2 kg). */
  implement?: number
  implementUnit?: string
}
