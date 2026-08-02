import { useEffect, useRef } from 'react'

/**
 * Run `fn` immediately and then every `intervalMs` for as long as the tab is
 * visible. A ceremonies dashboard is left open for hours, so polling stops
 * while the tab is hidden and fires again the moment it comes back — the
 * operator never looks at a screen that quietly stopped updating.
 */
export function usePoll(
  fn: () => void | Promise<void>,
  intervalMs: number,
  deps: unknown[],
) {
  const saved = useRef(fn)

  useEffect(() => {
    saved.current = fn
  })

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined

    const run = () => void saved.current()
    const stop = () => {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    }
    const start = () => {
      stop()
      run()
      timer = setInterval(run, intervalMs)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', start)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', start)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps])
}
