import type {
  MeetingDetailsDto,
  MeetingSearchRequest,
  MeetingSearchResponse,
  ResultsPayload,
  SchedulePayload,
  SeImplementDto,
} from './types'

// All calls go through /roster-api, proxied to api.meets.rosterathletics.com
// by the dev server (vite.config.ts) or the host rewrite (vercel.json), so the
// browser never depends on Roster's CORS policy.
const API_BASE = import.meta.env?.VITE_ROSTER_API_BASE ?? '/roster-api'

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Roster API ${res.status} for ${path}`)
  return (await res.json()) as T
}

export function getMeetingDetails(meetingId: number): Promise<MeetingDetailsDto> {
  return getJson<MeetingDetailsDto>(`/api/public/meeting/${meetingId}/details`)
}

export function getSchedule(meetingId: number): Promise<SchedulePayload> {
  return getJson<SchedulePayload>(`/api/public/meeting/${meetingId}/schedule`)
}

export function getEventResults(
  meetingId: number,
  meId: number,
): Promise<ResultsPayload> {
  return getJson<ResultsPayload>(
    `/api/public/meeting/${meetingId}/results-v2/${meId}`,
  )
}

export function getImplements(): Promise<SeImplementDto[]> {
  return getJson<SeImplementDto[]>(`/api/public/se-implements/v1`)
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Roster API ${res.status} for ${path}`)
  return (await res.json()) as T
}

/** Roster's featured competitions — what its own browser shows with no filters. */
export function listFeaturedCompetitions(): Promise<MeetingSearchResponse> {
  return getJson<MeetingSearchResponse>(`/api/public/meeting/list/v2`)
}

/**
 * Competition search, posting the same body Roster's own browser posts so the
 * results are exactly the ones Roster would return.
 */
export function searchCompetitions(
  request: MeetingSearchRequest,
): Promise<MeetingSearchResponse> {
  return postJson<MeetingSearchResponse>(`/api/public/meeting/search/v2`, request)
}
