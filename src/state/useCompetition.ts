import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MeetingDetailsDto, ResultsPayload, SeImplementDto } from '../api/types'
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

const SCHEDULE_REFRESH_MS = 30_000

export interface CompetitionState {
  loading: boolean
  error?: string
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [details, setDetails] = useState<MeetingDetailsDto>()
  const [finals, setFinals] = useState<FinalEvent[]>([])
  const [implementList, setImplementList] = useState<SeImplementDto[]>([])
  const [resultsCache, setResultsCache] = useState<Map<number, ResultsPayload>>(
    () => new Map(),
  )
  const [promoted, setPromoted] = useState<Set<number>>(() => loadPromoted(meetingId))
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setPromoted(loadPromoted(meetingId))
    setResultsCache(new Map())
  }, [meetingId])

  // Implements catalogue is global; fetch once.
  useEffect(() => {
    let cancelled = false
    getImplements()
      .then((list) => !cancelled && setImplementList(list))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(undefined)
    Promise.all([getMeetingDetails(meetingId), getSchedule(meetingId)])
      .then(([det, sched]) => {
        if (cancelled) return
        setDetails(det)
        setFinals(buildFinals(sched, det, implementList))
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(String(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [meetingId, implementList, tick])

  // Live refresh cadence for the schedule.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), SCHEDULE_REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  const loadResults = useCallback(
    async (meId: number) => {
      const payload = await getEventResults(meetingId, meId)
      if (payload === undefined) throw new Error(`No results for ${meId}`)
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
      setPromoted((prev) => {
        if (colours.get(meId) !== 'green') return prev // hard rule: green only
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

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  return {
    loading,
    error,
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
