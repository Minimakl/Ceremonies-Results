import { useMemo, useState } from 'react'
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
import { useCompetition } from './state/useCompetition'
import type { CompetitionContextValue } from './state/competitionContext'
import './app.css'

export const DEFAULT_COMPETITION = 27550

/**
 * The competition id lives in the URL path, not a query string: tapping an
 * event card must not be able to lose track of which competition is open,
 * and an event URL has to survive a refresh or a share.
 */
function CompetitionShell() {
  const { meetingId: meetingIdParam } = useParams()
  const parsed = Number(meetingIdParam)
  const meetingId =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_COMPETITION
  const competition = useCompetition(meetingId)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const context = useMemo<CompetitionContextValue>(
    () => ({ competition, meetingId, sidebarOpen, setSidebarOpen }),
    [competition, meetingId, sidebarOpen],
  )

  return <Outlet context={context} />
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
