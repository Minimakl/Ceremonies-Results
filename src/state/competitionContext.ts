import { useOutletContext } from 'react-router-dom'
import type { CompetitionState } from './useCompetition'

export interface CompetitionContextValue {
  competition: CompetitionState
  meetingId: number
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

/**
 * The loaded competition, shared by the home and event screens so that
 * navigating between them keeps one schedule and one results cache.
 */
export function useCompetitionContext(): CompetitionContextValue {
  return useOutletContext<CompetitionContextValue>()
}
