import { useNavigate } from 'react-router-dom'
import { MedalIcon, PlusIcon } from './icons'

const REFERENCE_COMPETITIONS = [
  { id: 27550, name: '2026 Australian Athletics Championships' },
  { id: 27236, name: '2026 Maurie Plant Meet Melbourne' },
  { id: 27351, name: '2025 WA All Schools Championships' },
]

interface Props {
  meetingId: number
  onNavigate: () => void
}

/** Persistent navigation — the same on the board and inside an event. */
export function Sidebar({ meetingId, onNavigate }: Props) {
  const navigate = useNavigate()

  const open = (id: number) => {
    navigate(`/c/${id}`)
    onNavigate()
  }

  return (
    <nav className="nav">
      <div className="brand">
        <span className="brand__mark">
          <MedalIcon size={16} />
        </span>
        <span className="brand__text">
          <span className="brand__name">Ceremonies</span>
          <span className="brand__sub">Finals dashboard</span>
        </span>
      </div>

      <div className="nav__label">Competitions</div>
      {REFERENCE_COMPETITIONS.map((c) => (
        <button
          key={c.id}
          className={c.id === meetingId ? 'nav__item nav__item--active' : 'nav__item'}
          onClick={() => open(c.id)}
        >
          <span className="nav__dot" />
          {c.name}
        </button>
      ))}

      <form
        className="nav__form"
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          const id = Number(new FormData(form).get('comp'))
          if (Number.isFinite(id) && id > 0) {
            open(id)
            form.reset()
          }
        }}
      >
        <input
          name="comp"
          inputMode="numeric"
          placeholder="Competition ID"
          aria-label="Open a Roster competition by ID"
        />
        <button type="submit" aria-label="Open competition">
          <PlusIcon />
        </button>
      </form>
    </nav>
  )
}
