import { useState } from 'react'
import { PlateIcon } from './icons'

export const btnPrimary =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orange px-6 font-display text-sm font-bold uppercase tracking-[0.12em] text-navy transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'

export const btnOutline =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-current px-6 font-display text-sm font-bold uppercase tracking-[0.12em] transition active:scale-[0.98] disabled:opacity-50'

export const label = 'font-display text-[11px] font-bold uppercase tracking-[0.2em]'

/** Solid orange + pink circles peeking from the top-right corner of a panel. */
export function CornerCircles({ className = '', small = false }: { className?: string; small?: boolean }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute right-0 top-0 ${className}`}>
      <span className={`absolute rounded-full bg-orange ${small ? '-right-6 -top-6 h-16 w-16' : '-right-10 -top-10 h-28 w-28'}`} />
      <span className={`absolute rounded-full bg-pink ${small ? 'right-8 -top-4 h-8 w-8' : 'right-14 -top-5 h-12 w-12'}`} />
    </div>
  )
}

export function BottomCircles({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute bottom-0 left-0 ${className}`}>
      <span className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-pink" />
      <span className="absolute -bottom-4 left-20 h-10 w-10 rounded-full bg-orange" />
    </div>
  )
}

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-grid shrink-0 place-items-center rounded-full bg-brand font-display font-extrabold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      11
      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-orange" />
    </span>
  )
}

export function DishPhoto({
  src,
  alt,
  size,
  eager = false,
}: {
  src: string | null
  alt: string
  size: number
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className="grid shrink-0 place-items-center rounded-full bg-lav-200 text-brand"
        style={{ width: size, height: size }}
      >
        <PlateIcon className="h-1/2 w-1/2" />
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-lav-200 object-cover"
      style={{ width: size, height: size }}
    />
  )
}

export function Spinner({ label: text = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[40vh] place-items-center text-muted">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-lav-200 border-t-brand" />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  )
}
