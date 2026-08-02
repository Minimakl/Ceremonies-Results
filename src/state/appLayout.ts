import { useOutletContext } from 'react-router-dom'

export interface AppLayoutValue {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  /** The competition currently loaded, if any — used for Back and highlighting. */
  activeMeetingId: number | null
  setActiveMeetingId: (id: number | null) => void
}

/** Shell state shared by every screen, including the Competitions browser. */
export function useAppLayout(): AppLayoutValue {
  return useOutletContext<AppLayoutValue>()
}
