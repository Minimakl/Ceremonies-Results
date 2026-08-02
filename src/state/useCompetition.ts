import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  MeetingDetailsDto,
  ResultsPayload,
  SchedulePayload,
  SeImplementDto,
} from '../api/types'
import {
  getEventResults,
  getImplements,
  getMeetingDetails,
  getSchedule,
} from '../api/rosterClient'
import { buildEventRows, buildFinals, type FinalEvent } from '../domain/model'
import {
  autoColour,
  displayColour,
  refineWithRows,
  type StatusColour,
} from '../domain/status'
import { usePoll } from './usePoll'

/**
 * Live cadence. The schedule carries the flags that drive the status colours
 * (hasResults / resultsComplete), so polling it is what makes the home screen
 * move on its own as Roster is updated.
 */
export const SCHEDULE_POLL_MS = 10_000
/** Age groups and the event catalogue barely change during a meet. */
const DETAILS_POLL_MS = 120_000

export interface CompetitionState {
  /** True only until the first successful load; refreshes are silent. */
  loading: boolean
  /** Set when the most recent poll failed. Last-good data stays on screen. */
  stale: boolean
  error?: string
  /** Epoch ms of the last successful schedule read. */
  lastUpdated: number | null
  details?: MeetingDetailsDto
  finals: FinalEvent[]
  colours: Map<number, StatusColour>
  promoted: Set<number>
  promote: (meId: number) => void
  demote: (meId: number) => void
  resultsCache: Map<number, ResultsPayload>
  loadResults: (meId: number) => Promise<ResultsPayload>
  refresh: () => void
}

function promotionKey(meetingId: number) {
  return `ceremonies.promoted.${meetingId}`
}

function loadPromoted(meetingId: number): Set<number> {
  try {
    const raw = localStorage.getItem(promotionKey(meetingId))
    return new Set(raw ? (JSON.parse(raw) as number[]) : [])
  } catch {
    return new Set()
  }
}

function savePromoted(meetingId: number, promoted: Set<number>) {
  try {
    localStorage.setItem(promotionKey(meetingId), JSON.stringify([...promoted]))
  } catch {
    // storage unavailable — promotion just won't survive a reload
  }
}

export function useCompetition(meetingId: number): CompetitionState {
  const [details, setDetails] = useState<MeetingDetailsDto>()
  const [schedule, setSchedule] = useState<SchedulePayload>()
  const [implementList, setImplementList] = useState<SeImplementDto[]>([])
  const [resultsCache, setResultsCache] = useState<Map<number, ResultsPayload>>(
    () => new Map(),
  )
  const [promoted, setPromoted] = useState<Set<number>>(() => loadPromoted(meetingId))
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState<string>()
  const [nudge, setNudge] = useState(0)

  // Switching competition clears everything the previous one populated, so a
  // stale schedule can never be shown under a new competition's name.
  useEffect(() => {
    setPromoted(loadPromoted(meetingId))
    setResultsCache(new Map())
    setDetails(undefined)
    setSchedule(undefined)
    setLastUpdated(null)
    setStale(false)
    setError(undefined)
  }, [meetingId])

  // The implement catalogue is global and static.
  useEffect(() => {
    let cancelled = false
    getImplements()
      .then((list) => !cancelled && setImplementList(list))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  usePoll(
    async () => {
      try {
        setDetails(await getMeetingDetails(meetingId))
      } catch {
        // a failed details read is not fatal — the schedule drives the screen
      }
    },
    DETAILS_POLL_MS,
    [meetingId, nudge],
  )

  usePoll(
    async () => {
      try {
        const next = await getSchedule(meetingId)
        setSchedule(next)
        setLastUpdated(Date.now())
        setStale(false)
        setError(undefined)
      } catch (err) {
        // Keep the last good schedule on screen and flag the staleness rather
        // than blanking the dashboard mid-ceremony.
        setStale(true)
        setError(String(err))
      }
    },
    SCHEDULE_POLL_MS,
    [meetingId, nudge],
  )

  const finals = useMemo(
    () => (schedule && details ? buildFinals(schedule, details, implementList) : []),
    [schedule, details, implementList],
  )

  const loadResults = useCallback(
    async (meId: number) => {
      const payload = await getEventResults(meetingId, meId)
      setResultsCache((prev) => {
        const next = new Map(prev)
        next.set(meId, payload)
        return next
      })
      return payload
    },
    [meetingId],
  )

  const colours = useMemo(() => {
    const map = new Map<number, StatusColour>()
    const now = new Date()
    for (const f of finals) {
      let auto = autoColour(f, now)
      const cached = resultsCache.get(f.meId)
      if (auto === 'orange' && cached) {
        auto = refineWithRows(auto, buildEventRows(f, cached))
      }
      map.set(f.meId, displayColour(auto, promoted.has(f.meId)))
    }
    return map
  }, [finals, resultsCache, promoted])

  const promote = useCallback(
    (meId: number) => {
      if (colours.get(meId) !== 'green') return // hard rule: green only
      setPromoted((prev) => {
        const next = new Set(prev)
        next.add(meId)
        savePromoted(meetingId, next)
        return next
      })
    },
    [colours, meetingId],
  )

  const demote = useCallback(
    (meId: number) => {
      setPromoted((prev) => {
        const next = new Set(prev)
        next.delete(meId)
        savePromoted(meetingId, next)
        return next
      })
    },
    [meetingId],
  )

  const refresh = useCallback(() => setNudge((n) => n + 1), [])

  return {
    loading: schedule == null && details == null,
    stale,
    error,
    lastUpdated,
    details,
    finals,
    colours,
    promoted,
    promote,
    demote,
    resultsCache,
    loadResults,
    refresh,
  }
}
