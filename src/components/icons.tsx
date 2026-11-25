type P = { className?: string }

function Svg({ className = 'h-5 w-5', children, sw = 2.5 }: P & { children: React.ReactNode; sw?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const CheckIcon = (p: P) => (
  <Svg {...p} sw={3}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)
export const PlusIcon = (p: P) => (
  <Svg {...p} sw={3}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const MinusIcon = (p: P) => (
  <Svg {...p} sw={3}>
    <path d="M5 12h14" />
  </Svg>
)
export const TrashIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
  </Svg>
)
export const BackIcon = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
)
export const ArrowRightIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
)
export const InstagramIcon = (p: P) => (
  <Svg {...p} sw={2}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
  </Svg>
)
export const FacebookIcon = (p: P) => (
  <Svg {...p} sw={2}>
    <path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />
  </Svg>
)
export const PlateIcon = (p: P) => (
  <Svg {...p} sw={1.8}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
  </Svg>
)
export const ScanIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10" />
  </Svg>
)
export const SearchIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
)
export const WarnIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l10 18H2L12 3zM12 10v5M12 18h.01" />
  </Svg>
)
export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)
