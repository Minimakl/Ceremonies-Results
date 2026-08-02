import { useMemo, useState } from 'react'
import { HashRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { EventScreen } from './screens/EventScreen'
import { useCompetition } from './state/useCompetition'
import './app.css'

const DEFAULT_COMPETITION = 27550

function CompetitionApp() {
  const [params] = useSearchParams()
  const compParam = Number(params.get('comp'))
  const meetingId =
    Number.isFinite(compParam) && compParam > 0 ? compParam : DEFAULT_COMPETITION
  const competition = useCompetition(meetingId)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const ctx = useMemo(
    () => ({ competition, sidebarOpen, setSidebarOpen, meetingId }),
    [competition, sidebarOpen, meetingId],
  )

  return (
    <Routes>
      <Route path="/" element={<HomeScreen {...ctx} />} />
      <Route path="/event/:meId" element={<EventScreen competition={competition} />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <CompetitionApp />
    </HashRouter>
  )
}
