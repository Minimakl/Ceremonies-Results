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
  /** Set on a relay leg, pointing at the team's own participant row. */
  meetingParticipantRelayTeamIdFk?: number
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
  relayList: RelayTeamDto[]
  mpList: WsEnvelope<MeetingParticipantDto>[]
  resultList: WsEnvelope<ResultDto>[]
  athleteExtraList: unknown[]
  relayExtraList: unknown[]
}

export interface RelayTeamDto {
  relayTeamIdPk: number
  clubIdFk?: number
  longName?: string
  shortName?: string
  countryCode?: string
  gender?: string
  national?: boolean
}

/** How Roster stores and scores an event's marks. */
export type ResultType = 'Duration' | 'Distance' | 'Numeric'
export type Scoring = 'Lowest' | 'Highest'

export interface SportEventDto {
  eventIdPk: number
  eventName: string
  eventType?: string
  /** Authoritative: Duration = time, Distance = centimetres, Numeric = points. */
  resultType?: ResultType
  /** Whether the best mark is the smallest (a time) or the largest. */
  scoring?: Scoring
  lanes?: boolean
  relay?: boolean
  combined?: boolean
  verticalJump?: boolean
  hasImplements?: boolean
}

export interface AgeGroupDto {
  ageGroupIdPk: number
  ageGroupSetIdFk?: number
  /** Roster's internal name, e.g. "Senior", "Meeting_20", "PA_U17". */
  name?: string
  category?: string
}

export interface MeetingDetailsDto {
  meetingId: number
  meetingName: string
  tz?: string
  startDateTime?: string
  endDateTime?: string
  meetingStatus?: string
  address?: {
    city?: string
    countryCode?: string
    postcode?: string
    stateCode?: string
    streetAddress?: string
    venueName?: string
  }
  /** Roster's own organiser naming. */
  organiserName?: string
  organiserDisplayName?: string
  organisationId?: number
  venueName?: string
  level?: string
  sportEvents?: SportEventDto[]
  /** The age groups this meeting actually uses, with their names. */
  ageGroups?: AgeGroupDto[]
}

export interface SeImplementDto {
  seImplementIdPk: number
  eventIdFk?: number
  gender?: string
  /** Weight/size. Kilogram unit stores hundredths (200 = 2 kg). */
  implement?: number
  implementUnit?: string
}

/**
 * One row of Roster's competition search — `POST /api/public/meeting/search/v2`
 * and `GET /api/public/meeting/list/v2` return the same item shape.
 */
export interface MeetingSummaryDto {
  meetingId: number
  organisationId?: number
  meetingName: string
  imgUrl?: string
  /** Venue-local wall time, "YYYY-MM-DD HH:mm:ss". */
  startDateTime?: string
  endDateTime?: string
  tz?: string
  city?: string
  countryCode?: string
  venueName?: string
  meetingStatus?: string
  enableRegistration?: boolean
  registrationDeadline?: string
  restricted?: boolean
  sponsorName?: string
}

/** Roster's cursor-paged search response. */
export interface MeetingSearchResponse {
  meets: MeetingSummaryDto[]
  /** How many results precede / follow this page. */
  before: number
  after: number
}

/** The request body Roster's own competition browser posts. */
export interface MeetingSearchRequest {
  tz: string
  tzMinutes: number
  orgId: number | null
  before: string | null
  beforeId: number | null
  after: string | null
  afterId: number | null
  /** Upper bound on start time, "YYYY-MM-DD HH:mm:ss". */
  beforeFilter: string | null
  /** Lower bound on start time. */
  afterFilter: string | null
  first: boolean | null
  last: boolean | null
  countryCode: string | null
  regOpen: boolean | null
  text: string | null
}
