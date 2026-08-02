import type {
  MeetingDetailsDto,
  ResultsPayload,
  SchedulePayload,
  SeImplementDto,
} from './types'
import {
  fixtureDetails,
  fixtureImplements,
  fixtureResults,
  fixtureSchedule,
} from '../fixtures'

// All calls go through /roster-api, proxied to api.meets.rosterathletics.com
// by the dev server (vite.config.ts) or the production host's rewrite.
const API_BASE = import.meta.env?.VITE_ROSTER_API_BASE ?? '/roster-api'

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Roster API ${res.status} for ${path}`)
  return (await res.json()) as T
}

/**
 * Live fetch with fixture fallback: if the network / proxy is unavailable and
 * the requested competition is one of the bundled reference events, serve the
 * bundled snapshot so the app stays fully clickable offline.
 */
async function withFallback<T>(live: () => Promise<T>, fallback?: T): Promise<T> {
  try {
    return await live()
  } catch (err) {
    if (fallback !== undefined) {
      console.warn('[roster] live fetch failed, using bundled fixture', err)
      return fallback
    }
    throw err
  }
}

export function getMeetingDetails(meetingId: number): Promise<MeetingDetailsDto> {
  return withFallback(
    () => getJson<MeetingDetailsDto>(`/api/public/meeting/${meetingId}/details`),
    fixtureDetails(meetingId),
  )
}

export function getSchedule(meetingId: number): Promise<SchedulePayload> {
  return withFallback(
    () => getJson<SchedulePayload>(`/api/public/meeting/${meetingId}/schedule`),
    fixtureSchedule(meetingId),
  )
}

export function getEventResults(
  meetingId: number,
  meId: number,
): Promise<ResultsPayload> {
  return withFallback(
    () =>
      getJson<ResultsPayload>(
        `/api/public/meeting/${meetingId}/results-v2/${meId}`,
      ),
    fixtureResults(meetingId, meId),
  )
}

export function getImplements(): Promise<SeImplementDto[]> {
  return withFallback(
    () => getJson<SeImplementDto[]>(`/api/public/se-implements/v1`),
    fixtureImplements(),
  )
}
