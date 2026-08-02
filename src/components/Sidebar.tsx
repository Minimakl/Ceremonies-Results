import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronRightIcon, MedalIcon, SearchIcon } from './icons'

interface Props {
  /** Name of the competition currently loaded, if any. */
  activeName?: string
  onNavigate: () => void
}

/**
 * Persistent navigation. Deliberately short: competitions live behind a single
 * button rather than being listed here, because Roster carries thousands and a
 * sidebar full of them is exactly the overwhelm this tool exists to remove.
 */
export function Sidebar({ activeName, onNavigate }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const onCompetitions = location.pathname.startsWith('/competitions')

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

      <button
        className={onCompetitions ? 'nav__item nav__item--active' : 'nav__item'}
        onClick={() => {
          navigate('/competitions')
          onNavigate()
        }}
      >
        <SearchIcon size={15} />
        Competitions
        <ChevronRightIcon size={14} />
      </button>

      {activeName && (
        <div className="nav__current">
          <span className="nav__label">Currently set</span>
          <span className="nav__current-name">{activeName}</span>
        </div>
      )}
    </nav>
  )
}
