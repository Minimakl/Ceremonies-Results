import type {
  MeetingDetailsDto,
  ResultsPayload,
  SchedulePayload,
  SeImplementDto,
} from '../api/types'
import details27550 from './details-27550.json'
import details27236 from './details-27236.json'
import schedule27550 from './schedule-27550.json'
import schedule27236 from './schedule-27236.json'
import results336973 from './results-27550-336973.json'
import results371113 from './results-27236-371113.json'
import implementsJson from './implements.json'

// Live snapshots of the two reference events from docs/PLAN.md §11,
// captured from the Roster public API on 2 Aug 2026.

const detailsMap: Record<number, MeetingDetailsDto> = {
  27550: details27550 as MeetingDetailsDto,
  27236: details27236 as MeetingDetailsDto,
}

const scheduleMap: Record<number, SchedulePayload> = {
  27550: schedule27550 as SchedulePayload,
  27236: schedule27236 as SchedulePayload,
}

const resultsMap: Record<string, ResultsPayload> = {
  '27550/336973': results336973 as ResultsPayload,
  '27236/371113': results371113 as ResultsPayload,
}

export function fixtureDetails(meetingId: number): MeetingDetailsDto | undefined {
  return detailsMap[meetingId]
}

export function fixtureSchedule(meetingId: number): SchedulePayload | undefined {
  return scheduleMap[meetingId]
}

export function fixtureResults(
  meetingId: number,
  meId: number,
): ResultsPayload | undefined {
  return resultsMap[`${meetingId}/${meId}`]
}

export function fixtureImplements(): SeImplementDto[] {
  return implementsJson as SeImplementDto[]
}
