import { useCallback, useMemo, useState } from 'react'
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
import { Sidebar } from './components/Sidebar'
import { useCompetition } from './state/useCompetition'
import type { CompetitionContextValue } from './state/competitionContext'
import './app.css'

export const DEFAULT_COMPETITION = 27550

const MOBILE_BREAKPOINT = 861

/**
 * The competition id lives in the URL path, not a query string: tapping an
 * event card must not be able to lose track of which competition is open,
 * and an event URL has to survive a refresh or a share.
 *
 * The sidebar lives here rather than in a screen so it stays put when moving
 * between the board and an event.
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

  // On a phone the sidebar overlays the board, so following a link closes it.
  const closeIfOverlay = useCallback(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) setSidebarOpen(false)
  }, [])

  const context = useMemo<CompetitionContextValue>(
    () => ({ competition, meetingId, sidebarOpen, setSidebarOpen }),
    [competition, meetingId, sidebarOpen],
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
          <Route path="event/:meId" element={<EventScreen />} />
        </Route>
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </HashRouter>
  )
}
