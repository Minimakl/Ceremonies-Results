interface IconProps {
  size?: number
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false as const,
})

/** Panel toggle — shows and hides the sidebar. */
export function SidebarToggleIcon({ size = 18 }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <line x1="9.75" y1="4.5" x2="9.75" y2="19.5" />
    </svg>
  )
}

export function MedalIcon({ size = 16 }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="15" r="5.5" />
      <path d="M8.5 10 6 2.5h12L15.5 10" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 16 }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 16 }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 15 }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

export function PlusIcon({ size = 15 }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 14 }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function SearchIcon({ size = 15 }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

/** Tick, for the "Presented" action on the event screen. */
export function CheckIcon({ size = 16 }: IconProps = {}) {
  return (
    <svg {...base(size)}>
      <path d="m20 6-11 11-5-5" />
    </svg>
  )
}
