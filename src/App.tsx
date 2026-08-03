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
import { PresentedScreen } from './screens/PresentedScreen'
import { CompetitionsScreen } from './screens/CompetitionsScreen'
import { Sidebar } from './components/Sidebar'
import { useCompetition } from './state/useCompetition'
import type { CompetitionContextValue } from './state/competitionContext'
import type { AppLayoutValue } from './state/appLayout'
import { competitionDays, filterByDays } from './domain/dates'
import './app.css'

const MOBILE_BREAKPOINT = 861

/**
 * Shell shared by every screen: the sidebar stays put whether the operator is
 * browsing competitions or working through a board.
 */
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= MOBILE_BREAKPOINT,
  )
  const [activeMeetingId, setActiveMeetingId] = useState<number | null>(null)
  const [activeName, setActiveName] = useState<string>()

  const closeIfOverlay = useCallback(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) setSidebarOpen(false)
  }, [])

  const layout = useMemo<AppLayoutValue & { setActiveName: (n?: string) => void }>(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      activeMeetingId,
      setActiveMeetingId,
      setActiveName,
    }),
    [sidebarOpen, activeMeetingId],
  )

  return (
    <div className="app">
      {sidebarOpen && <Sidebar activeName={activeName} onNavigate={closeIfOverlay} />}
      {sidebarOpen && (
        <button
          className="scrim"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Outlet context={layout} />
    </div>
  )
}

/**
 * The competition id lives in the URL path, not a query string: tapping an
 * event card must not be able to lose track of which competition is open,
 * and an event URL has to survive a refresh or a share.
 */
function CompetitionShell() {
  const { meetingId: meetingIdParam } = useParams()
  const parsed = Number(meetingIdParam)
  const meetingId = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  const competition = useCompetition(meetingId)
  const layout = useAppLayoutRaw()
  const [selectedDays, setSelectedDays] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  // A day selection only means something within one competition.
  useEffect(() => setSelectedDays(new Set()), [meetingId])

  // Tell the shell which competition is loaded, for Back and for the sidebar.
  useEffect(() => {
    layout.setActiveMeetingId(meetingId)
  }, [layout, meetingId])
  useEffect(() => {
    layout.setActiveName(competition.details?.meetingName)
  }, [layout, competition.details?.meetingName])

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

  const context = useMemo<CompetitionContextValue>(
    () => ({
      competition,
      meetingId,
      sidebarOpen: layout.sidebarOpen,
      setSidebarOpen: layout.setSidebarOpen,
      days,
      selectedDays,
      toggleDay,
      clearDays,
      visibleFinals,
    }),
    [
      competition,
      meetingId,
      layout.sidebarOpen,
      layout.setSidebarOpen,
      days,
      selectedDays,
      toggleDay,
      clearDays,
      visibleFinals,
    ],
  )

  return <Outlet context={context} />
}

// Typed access to the layout context from inside the nested competition shell.
import { useOutletContext } from 'react-router-dom'
function useAppLayoutRaw() {
  return useOutletContext<AppLayoutValue & { setActiveName: (n?: string) => void }>()
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/competitions" element={<CompetitionsScreen />} />
          <Route path="/c/:meetingId" element={<CompetitionShell />}>
            <Route index element={<HomeScreen />} />
            <Route path="not-started" element={<NotStartedScreen />} />
            <Route path="presented" element={<PresentedScreen />} />
            <Route path="event/:meId" element={<EventScreen />} />
          </Route>
          <Route path="*" element={<Navigate to="/competitions" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
