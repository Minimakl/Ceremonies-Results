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
  canMarkPresented,
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
  /** Events the operator has finished presenting (plan §5.3). */
  presented: Set<number>
  markPresented: (meId: number) => void
  returnToCeremonies: (meId: number) => void
  resultsCache: Map<number, ResultsPayload>
  loadResults: (meId: number) => Promise<ResultsPayload>
  refresh: () => void
}

/**
 * The two manual flags — sent to ceremonies, and finished presenting — are
 * the operator's own state, not Roster's, so they are kept per competition in
 * the browser. They survive a refresh; they do not follow the operator to
 * another device.
 */
function flagKey(kind: 'promoted' | 'presented', meetingId: number) {
  return `ceremonies.${kind}.${meetingId}`
}

function loadFlag(kind: 'promoted' | 'presented', meetingId: number): Set<number> {
  try {
    const raw = localStorage.getItem(flagKey(kind, meetingId))
    return new Set(raw ? (JSON.parse(raw) as number[]) : [])
  } catch {
    return new Set()
  }
}

function saveFlag(
  kind: 'promoted' | 'presented',
  meetingId: number,
  value: Set<number>,
) {
  try {
    localStorage.setItem(flagKey(kind, meetingId), JSON.stringify([...value]))
  } catch {
    // storage unavailable — the flag just won't survive a reload
  }
}

export function useCompetition(meetingId: number): CompetitionState {
  const [details, setDetails] = useState<MeetingDetailsDto>()
  const [schedule, setSchedule] = useState<SchedulePayload>()
  const [implementList, setImplementList] = useState<SeImplementDto[]>([])
  const [resultsCache, setResultsCache] = useState<Map<number, ResultsPayload>>(
    () => new Map(),
  )
  const [promoted, setPromoted] = useState<Set<number>>(() =>
    loadFlag('promoted', meetingId),
  )
  const [presented, setPresented] = useState<Set<number>>(() =>
    loadFlag('presented', meetingId),
  )
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState<string>()
  const [nudge, setNudge] = useState(0)

  // Switching competition clears everything the previous one populated, so a
  // stale schedule can never be shown under a new competition's name.
  useEffect(() => {
    setPromoted(loadFlag('promoted', meetingId))
    setPresented(loadFlag('presented', meetingId))
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
      map.set(
        f.meId,
        displayColour(auto, promoted.has(f.meId), presented.has(f.meId)),
      )
    }
    return map
  }, [finals, resultsCache, promoted, presented])

  const promote = useCallback(
    (meId: number) => {
      if (colours.get(meId) !== 'green') return // hard rule: green only
      setPromoted((prev) => {
        const next = new Set(prev)
        next.add(meId)
        saveFlag('promoted', meetingId, next)
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
        saveFlag('promoted', meetingId, next)
        return next
      })
    },
    [meetingId],
  )

  /**
   * Finished presenting. Only an event Roster has finalised can be marked —
   * green, or pink because it was sent to ceremonies first. Marking a final
   * that has not happened would take it off the board with nothing to show
   * for it, and the operator would not notice until it was missing.
   */
  const markPresented = useCallback(
    (meId: number) => {
      if (!canMarkPresented(colours.get(meId) ?? 'red')) return
      setPresented((prev) => {
        const next = new Set(prev)
        next.add(meId)
        saveFlag('presented', meetingId, next)
        return next
      })
    },
    [colours, meetingId],
  )

  /** The undo for a mis-press: back onto the board, in ceremonies. */
  const returnToCeremonies = useCallback(
    (meId: number) => {
      setPresented((prev) => {
        const next = new Set(prev)
        next.delete(meId)
        saveFlag('presented', meetingId, next)
        return next
      })
      setPromoted((prev) => {
        const next = new Set(prev)
        next.add(meId)
        saveFlag('promoted', meetingId, next)
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
    presented,
    markPresented,
    returnToCeremonies,
    resultsCache,
    loadResults,
    refresh,
  }
}
