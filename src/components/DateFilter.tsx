import { useEffect, useRef, useState } from 'react'
import { formatDayLabel } from '../domain/dates'
import { ChevronDownIcon } from './icons'

interface Props {
  days: string[]
  selected: ReadonlySet<string>
  onToggle: (day: string) => void
  onClear: () => void
}

/**
 * Day picker for the competition. A ceremonies manager usually works one day
 * of a multi-day meet and wants to see only that day's finals; an empty
 * selection means every day.
 */
export function DateFilter({ days, selected, onToggle, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocument = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDocument)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocument)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (days.length <= 1) return null

  const label =
    selected.size === 0
      ? 'All dates'
      : selected.size === 1
        ? formatDayLabel([...selected][0])
        : `${selected.size} of ${days.length} dates`

  return (
    <div className="datefilter" ref={root}>
      <button
        className={selected.size > 0 ? 'chip chip--on' : 'chip'}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label}
        <ChevronDownIcon size={14} />
      </button>

      {open && (
        <div className="datefilter__menu" role="group" aria-label="Filter by date">
          <button
            className={
              selected.size === 0
                ? 'datefilter__row datefilter__row--all is-on'
                : 'datefilter__row datefilter__row--all'
            }
            onClick={onClear}
          >
            <span className="box" data-checked={selected.size === 0} />
            All dates
          </button>
          {days.map((day) => (
            <button
              key={day}
              className={
                selected.has(day) ? 'datefilter__row is-on' : 'datefilter__row'
              }
              onClick={() => onToggle(day)}
            >
              <span className="box" data-checked={selected.has(day)} />
              <span className="num">{formatDayLabel(day)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
