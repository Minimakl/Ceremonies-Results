import { useOutletContext } from 'react-router-dom'
import type { CompetitionState } from './useCompetition'
import type { FinalEvent } from '../domain/model'

export interface CompetitionContextValue {
  competition: CompetitionState
  meetingId: number
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  /** Every day the competition's finals fall on, in the venue timezone. */
  days: string[]
  /** Selected days; empty means every day. */
  selectedDays: ReadonlySet<string>
  toggleDay: (day: string) => void
  clearDays: () => void
  /** Finals narrowed to the selected days — what every screen should show. */
  visibleFinals: FinalEvent[]
}

/**
 * The loaded competition, shared by the screens so that navigating between
 * them keeps one schedule, one results cache and one date selection.
 */
export function useCompetitionContext(): CompetitionContextValue {
  return useOutletContext<CompetitionContextValue>()
}
