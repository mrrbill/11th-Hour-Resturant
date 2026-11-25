import { Link } from 'react-router-dom'
import { usePublicData } from '../lib/publicData'
import { hoursRows } from '../lib/hours'
import { BottomCircles, CornerCircles, label } from './ui'

export function Closed() {
  const { settings, open } = usePublicData()
  return (
    <main className="on-dark relative grid min-h-dvh place-items-center overflow-hidden bg-brand px-4 py-10 text-white">
      <CornerCircles />
      <BottomCircles />
      <div className="relative w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-extrabold">We're not taking orders right now</h1>
        <p className="mt-3 text-white/85">
          {open ? 'The kitchen has paused orders for a moment. Please check back soon.' : 'We are closed at the moment.'}
        </p>
        {settings && (
          <div className="mt-6 rounded-[16px] bg-white/10 p-4 text-left">
            <p className={`${label} text-white/80`}>Opening hours</p>
            <dl className="mt-2">
              {hoursRows(settings.opening_hours).map((r) => (
                <div key={r.label} className="flex justify-between gap-3 border-b border-dashed border-white/40 py-2 text-sm last:border-0">
                  <dt>{r.label}</dt>
                  <dd className="text-right font-semibold">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <Link to="/" className="mt-8 inline-flex min-h-12 items-center rounded-full border-2 border-white px-6 font-display text-sm font-bold uppercase tracking-[0.12em]">
          Back to menu
        </Link>
      </div>
    </main>
  )
}
