import { useEffect, useReducer } from 'react'

interface Props {
  lastUpdated: number | null
  stale: boolean
}

/**
 * Shows that the dashboard is reading Roster continuously, and how long ago
 * that last succeeded. Silence is the dangerous state for a live dashboard:
 * if updates stop, the operator has to be able to see that they have.
 */
export function LiveIndicator({ lastUpdated, stale }: Props) {
  const [, tick] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (lastUpdated == null) {
    // Never successfully read: say so plainly rather than implying progress.
    return stale ? (
      <span className="live live--stale">
        <span className="live__dot" aria-hidden="true" />
        Can’t reach Roster
      </span>
    ) : (
      <span className="live live--waiting">Connecting…</span>
    )
  }

  const seconds = Math.max(0, Math.round((Date.now() - lastUpdated) / 1000))
  const ago = seconds < 2 ? 'just now' : `${seconds}s ago`

  return (
    <span
      className={stale ? 'live live--stale' : 'live'}
      title={`Last read from Roster at ${new Date(lastUpdated).toLocaleTimeString()}`}
    >
      <span className="live__dot" aria-hidden="true" />
      {stale ? `Reconnecting — last update ${ago}` : `Live · updated ${ago}`}
    </span>
  )
}
