import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CornerCircles } from '../components/ui'

const LINKS = [
  { to: '/staff', label: 'Orders', end: true },
  { to: '/staff/menu', label: 'Menu & prices' },
  { to: '/staff/totals', label: 'Daily totals' },
  { to: '/staff/qr', label: 'QR code & poster' },
]

export function Layout() {
  return (
    <div className="min-h-dvh bg-lav md:flex">
      <aside className="on-dark relative shrink-0 overflow-hidden bg-brand text-white md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:flex-col print:hidden">
        <CornerCircles small />
        <div className="relative px-4 pb-2 pt-4 md:px-5 md:pt-8">
          <p className="font-display text-lg font-extrabold leading-tight">11TH HOUR</p>
          <p className="font-display text-[10px] font-bold tracking-[0.25em] text-white/80">STAFF DASHBOARD</p>
        </div>
        <nav aria-label="Staff" className="relative flex gap-1 overflow-x-auto px-2 pb-3 md:mt-6 md:flex-col md:px-3">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition md:rounded-[12px] ${
                  isActive ? 'bg-white text-brand' : 'text-white hover:bg-white/10'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="relative hidden px-3 pb-6 md:mt-auto md:block">
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="min-h-11 w-full rounded-[12px] px-4 text-left text-sm text-white/85 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
        <div className="px-4 pb-6 md:hidden print:hidden">
          <button type="button" onClick={() => void supabase.auth.signOut()} className="min-h-11 text-sm text-muted underline">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
