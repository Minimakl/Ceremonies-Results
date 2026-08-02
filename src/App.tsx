import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { EventScreen } from './screens/EventScreen'
import { NotStartedScreen } from './screens/NotStartedScreen'
import { Sidebar } from './components/Sidebar'
import { useCompetition } from './state/useCompetition'
import type { CompetitionContextValue } from './state/competitionContext'
import { competitionDays, filterByDays } from './domain/dates'
import './app.css'

export const DEFAULT_COMPETITION = 27550

const MOBILE_BREAKPOINT = 861

/**
 * The competition id lives in the URL path, not a query string: tapping an
 * event card must not be able to lose track of which competition is open,
 * and an event URL has to survive a refresh or a share.
 *
 * The sidebar and the day selection live here rather than in a screen so they
 * stay put when moving between the board, the not-started list and an event.
 */
function CompetitionShell() {
  const { meetingId: meetingIdParam } = useParams()
  const parsed = Number(meetingIdParam)
  const meetingId =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_COMPETITION
  const competition = useCompetition(meetingId)
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= MOBILE_BREAKPOINT,
  )
  const [selectedDays, setSelectedDays] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  // A day selection only means something within one competition.
  useEffect(() => setSelectedDays(new Set()), [meetingId])

  const timeZone = competition.details?.tz
  const days = useMemo(
    () => competitionDays(competition.finals, timeZone),
    [competition.finals, timeZone],
  )
  const visibleFinals = useMemo(
    () => filterByDays(competition.finals, selectedDays, timeZone),
    [competition.finals, selectedDays, timeZone],
  )

  const toggleDay = useCallback((day: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }, [])

  const clearDays = useCallback(() => setSelectedDays(new Set()), [])

  // On a phone the sidebar overlays the board, so following a link closes it.
  const closeIfOverlay = useCallback(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) setSidebarOpen(false)
  }, [])

  const context = useMemo<CompetitionContextValue>(
    () => ({
      competition,
      meetingId,
      sidebarOpen,
      setSidebarOpen,
      days,
      selectedDays,
      toggleDay,
      clearDays,
      visibleFinals,
    }),
    [
      competition,
      meetingId,
      sidebarOpen,
      days,
      selectedDays,
      toggleDay,
      clearDays,
      visibleFinals,
    ],
  )

  return (
    <div className="app">
      {sidebarOpen && <Sidebar meetingId={meetingId} onNavigate={closeIfOverlay} />}
      {sidebarOpen && (
        <button
          className="scrim"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Outlet context={context} />
    </div>
  )
}

export default function App() {
  const home = `/c/${DEFAULT_COMPETITION}`
  return (
    <HashRouter>
      <Routes>
        <Route path="/c/:meetingId" element={<CompetitionShell />}>
          <Route index element={<HomeScreen />} />
          <Route path="not-started" element={<NotStartedScreen />} />
          <Route path="event/:meId" element={<EventScreen />} />
        </Route>
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </HashRouter>
  )
}
