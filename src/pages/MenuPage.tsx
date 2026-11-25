import { Link } from 'react-router-dom'
import { usePublicData } from '../lib/publicData'
import { hoursRows } from '../lib/hours'
import { cedis } from '../lib/format'
import { KEYS, load } from '../lib/storage'
import { CornerCircles, DishPhoto, Logo, btnPrimary, label } from '../components/ui'
import { FacebookIcon, InstagramIcon } from '../components/icons'
import { useState } from 'react'

const HERO = '/images/jollof-rice.jpg'

export function MenuPage() {
  const { settings, dishes, loading, error, canOrder, refresh } = usePublicData()
  const [heroFailed, setHeroFailed] = useState(false)
  const activeOrder = load<string | null>(KEYS.activeOrder, null)
  const minPrice = settings?.min_price ?? 30
  const site = settings?.website?.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div className="min-h-dvh bg-lav md:grid md:place-items-center md:bg-lav-200 md:p-8">
      <article className="flex min-h-dvh w-full md:min-h-0 md:max-w-[760px] md:overflow-hidden md:rounded-[18px] md:shadow-xl">
        {/* Left indigo panel */}
        <aside className="on-dark relative flex w-[36%] shrink-0 flex-col overflow-hidden bg-brand px-3 pb-5 pt-7 text-white sm:px-6">
          <CornerCircles small />
          <h1 className="relative font-display text-[26px] font-extrabold leading-[0.95] sm:text-[40px]">
            11TH
            <br />
            HOUR
          </h1>
          <p className="relative mt-2 font-display text-xs font-bold tracking-[0.45em] sm:text-sm">MENU</p>

          {/* Plate bleeding off the left edge */}
          <div className="relative -ml-[55%] mt-6 w-[150%] sm:-ml-[45%] sm:w-[135%]">
            {heroFailed ? (
              <div className="aspect-square w-full rounded-full border-[6px] border-white/15 bg-white/10" aria-hidden="true" />
            ) : (
              <img
                src={HERO}
                alt="A plate of jollof rice with grilled chicken and fried plantain"
                width={320}
                height={320}
                fetchPriority="high"
                decoding="async"
                onError={() => setHeroFailed(true)}
                className="aspect-square w-full rounded-full border-[6px] border-white/15 object-cover"
              />
            )}
          </div>

          <section className="relative mt-6" aria-labelledby="hours-h">
            <h2 id="hours-h" className="font-display text-[10px] font-bold tracking-[0.2em] sm:text-xs">
              OPENING HOURS
            </h2>
            <dl className="mt-1">
              {hoursRows(settings?.opening_hours).map((r) => (
                <div key={r.label} className="border-b border-dashed border-white/50 py-2 last:border-0">
                  <dt className="text-[11px] text-white/85 sm:text-xs">{r.label}</dt>
                  <dd className="font-display text-[11px] font-bold sm:text-sm">{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {site && settings?.website && (
            <a href={settings.website} className="relative mt-auto break-all pt-6 text-[10px] text-white/85 underline-offset-2 hover:underline sm:text-xs">
              {site}
            </a>
          )}
        </aside>

        {/* Right lavender panel */}
        <main className="flex min-w-0 flex-1 flex-col bg-lav px-4 pb-6 pt-7 sm:px-8">
          <div className="flex items-center gap-2">
            <Logo size={36} />
          </div>
          <p className="mt-3 font-display text-[13px] font-extrabold tracking-[0.12em] text-brand sm:text-base">
            11TH HOUR RESTAURANT
          </p>
          <p className="mt-1 text-[13px] text-muted">A Love Country Church restaurant.</p>

          {activeOrder && (
            <Link
              to={`/order/${activeOrder}`}
              className="mt-4 flex min-h-11 items-center justify-between rounded-[14px] bg-brand px-4 text-sm font-semibold text-white"
            >
              You have an order in progress <span aria-hidden="true">→</span>
            </Link>
          )}

          <hr className="my-4 border-0 border-t-2 border-dashed border-dash" />

          <h2 className={`${label} text-navy`}>MAIN DISHES</h2>

          <ul className="mt-2 flex-1">
            {dishes.map((d, i) => (
              <li key={d.id} className="flex items-start gap-3 border-b border-dashed border-dash-light py-3 last:border-0">
                <DishPhoto src={d.photo_url} alt={d.name} size={60} eager={i < 2} />
                <div className="min-w-0">
                  <h3 className="font-display text-[13px] font-extrabold uppercase leading-tight tracking-wide">{d.name}</h3>
                  <p className="font-display text-xs font-bold text-brand">from {cedis(minPrice)}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">{d.description}</p>
                </div>
              </li>
            ))}
            {!dishes.length && loading && (
              <li className="space-y-3 py-3" aria-label="Loading dishes">
                {[0, 1, 2].map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="h-[60px] w-[60px] animate-pulse rounded-full bg-lav-200" />
                    <span className="h-4 flex-1 animate-pulse rounded bg-lav-200" />
                  </div>
                ))}
              </li>
            )}
            {!dishes.length && !loading && (
              <li className="py-4 text-sm text-muted">
                {error ? (
                  <>
                    Couldn't load the menu. Check your connection.{' '}
                    <button type="button" onClick={() => void refresh()} className="min-h-11 font-semibold text-brand underline">
                      Try again
                    </button>
                  </>
                ) : (
                  'No dishes available right now.'
                )}
              </li>
            )}
          </ul>

          <div className="mt-4">
            {canOrder ? (
              <Link to="/order" className={`${btnPrimary} w-full`}>
                Place an order
              </Link>
            ) : (
              <p className="rounded-full bg-lav-200 px-4 py-3 text-center font-display text-xs font-bold text-navy">
                {settings ? "We're not taking orders right now" : 'Loading…'}
              </p>
            )}
            <p className="mt-3 text-[11px] leading-snug text-muted">
              Prices are in Ghana cedis (GH₵). Menu may change from day to day.
            </p>
            <div className="mt-3 flex gap-2">
              {settings?.instagram_url && (
                <a
                  href={settings.instagram_url}
                  aria-label="11th Hour on Instagram"
                  className="grid h-11 w-11 place-items-center rounded-full bg-lav-200 text-brand"
                >
                  <InstagramIcon />
                </a>
              )}
              {settings?.facebook_url && (
                <a
                  href={settings.facebook_url}
                  aria-label="11th Hour on Facebook"
                  className="grid h-11 w-11 place-items-center rounded-full bg-lav-200 text-brand"
                >
                  <FacebookIcon />
                </a>
              )}
            </div>
          </div>
        </main>
      </article>
    </div>
  )
}
