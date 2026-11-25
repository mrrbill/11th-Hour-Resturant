import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStaffOrders } from './staffOrders'
import { usePublicData } from '../lib/publicData'
import { supabase } from '../lib/supabase'
import { cedis, clockTime } from '../lib/format'
import { label } from '../components/ui'
import { ScanIcon, SearchIcon } from '../components/icons'
import { Scanner } from './Scanner'
import type { Order, OrderStatus } from '../lib/types'

const COLUMNS: { key: OrderStatus; title: string }[] = [
  { key: 'new', title: 'NEW' },
  { key: 'preparing', title: 'PREPARING' },
  { key: 'ready', title: 'READY' },
  { key: 'collected', title: 'COLLECTED' },
]

export function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function AcceptingSwitch() {
  const { settings, refresh } = usePublicData()
  const [busy, setBusy] = useState(false)
  const on = !!settings?.accepting_orders
  async function toggle() {
    setBusy(true)
    const { error } = await supabase.from('settings').update({ accepting_orders: !on }).eq('id', 1)
    if (error) alert("Couldn't change that. Check the connection.")
    await refresh()
    setBusy(false)
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      disabled={busy || !settings}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full pl-2 pr-4 text-sm font-semibold text-white transition disabled:opacity-60 ${
        on ? 'bg-ok' : 'bg-late'
      }`}
    >
      <span className={`relative h-6 w-10 rounded-full ${on ? 'bg-white/30' : 'bg-black/25'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-5' : 'left-1'}`} />
      </span>
      {on ? 'Taking orders' : 'Orders paused'}
    </button>
  )
}

function names(o: Order) {
  return o.order_items.map((i) => i.dish_name).join(', ')
}

function OrderCard({ order, now, lateAfter, flash }: { order: Order; now: number; lateAfter: number; flash: boolean }) {
  const { setStatus } = useStaffOrders()
  const [busy, setBusy] = useState(false)
  const readyMin = order.ready_at ? Math.max(0, Math.floor((now - new Date(order.ready_at).getTime()) / 60000)) : 0
  const late = order.status === 'ready' && readyMin >= lateAfter

  async function go(s: OrderStatus) {
    setBusy(true)
    const err = await setStatus(order.id, s)
    setBusy(false)
    if (err) alert(err)
  }

  const btn = 'min-h-11 w-full rounded-full px-4 font-display text-xs font-bold uppercase tracking-[0.1em] disabled:opacity-50'

  return (
    <article
      className={`rounded-[14px] border-2 bg-white p-3 shadow-sm ${flash ? 'flash border-orange' : late ? 'border-late' : 'border-transparent'}`}
      aria-label={`Order ${order.order_number}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-3xl font-extrabold text-brand">#{order.order_number}</span>
        <span className="text-xs text-muted">{clockTime(order.placed_at)}</span>
      </div>
      <p className="text-sm">{order.first_name ?? <em className="text-muted">No name</em>}</p>
      <ul className="mt-2 border-t border-dashed border-dash-light pt-2 text-sm">
        {order.order_items.map((it, i) => (
          <li key={i} className="flex justify-between gap-2 py-0.5">
            <span>{it.dish_name}</span>
            <span className="font-semibold">{cedis(it.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex justify-between border-t border-dashed border-dash-light pt-2 font-display text-sm font-extrabold">
        <span>Total</span>
        <span>{cedis(order.total)}</span>
      </div>

      {order.status === 'ready' && (
        <p className={`mt-2 rounded-full px-3 py-1 text-center text-xs font-bold ${late ? 'bg-late text-white' : 'bg-lav-100 text-brand'}`}>
          Ready {readyMin} min{late ? ' — not collected yet' : ''}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {order.status === 'new' && (
          <button type="button" disabled={busy} onClick={() => go('preparing')} className={`${btn} bg-brand text-white`}>
            Start preparing
          </button>
        )}
        {order.status === 'preparing' && (
          <button type="button" disabled={busy} onClick={() => go('ready')} className={`${btn} bg-orange text-navy`}>
            Mark ready · call out
          </button>
        )}
        {order.status === 'ready' && (
          <>
            <button type="button" disabled={busy} onClick={() => go('collected')} className={`${btn} bg-ok text-white`}>
              Paid &amp; collected
            </button>
            <button type="button" disabled={busy} onClick={() => go('not_collected')} className={`${btn} border-2 border-dash text-navy`}>
              Not collected
            </button>
          </>
        )}
      </div>
    </article>
  )
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-[14px] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-muted">{title}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-brand">{value}</p>
    </div>
  )
}

export function OrdersBoard() {
  const { orders, loading, error, highlight, setStatus } = useStaffOrders()
  const { settings } = usePublicData()
  const navigate = useNavigate()
  const now = useNow()
  const [scanning, setScanning] = useState(false)
  const [query, setQuery] = useState('')
  const [searchMsg, setSearchMsg] = useState<string | null>(null)
  const lateAfter = settings?.not_collected_minutes ?? 30

  const by = (s: OrderStatus) => orders.filter((o) => o.status === s)
  const waiting = orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status)).length
  const paid = by('collected').reduce((s, o) => s + o.total, 0)

  function search(e: FormEvent) {
    e.preventDefault()
    const n = Number(query.replace(/\D/g, ''))
    const hit = orders.find((o) => o.order_number === n)
    if (hit) {
      setSearchMsg(null)
      setQuery('')
      navigate(`/staff/scan/${hit.id}`)
    } else setSearchMsg(n ? `No order #${n} today.` : 'Type an order number.')
  }

  return (
    <main className="px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-2xl font-extrabold">Today's orders</h1>
        <AcceptingSwitch />
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-3">
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-5 font-display text-sm font-bold uppercase tracking-[0.1em] text-white"
        >
          <ScanIcon /> Scan
        </button>
        <form onSubmit={search} className="flex min-w-0 flex-1 items-start gap-2 sm:max-w-xs" role="search">
          <div className="min-w-0 flex-1">
            <label htmlFor="order-search" className="sr-only">
              Find order by number
            </label>
            <input
              id="order-search"
              inputMode="numeric"
              placeholder="Order number, e.g. 105"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block min-h-12 w-full rounded-full border-2 border-dash-light bg-white px-4 focus:border-brand focus:outline-none"
              aria-describedby="search-msg"
            />
            <p id="search-msg" aria-live="polite" className="mt-1 px-2 text-xs text-late">
              {searchMsg}
            </p>
          </div>
          <button type="submit" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lav-200 text-brand" aria-label="Find order">
            <SearchIcon />
          </button>
        </form>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat title="Orders today" value={orders.length} />
        <Stat title="Waiting to be collected" value={waiting} />
        <Stat title="Paid at counter" value={cedis(paid)} />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-[14px] bg-white p-3 text-sm font-medium text-late">
          {error}
        </p>
      )}

      <div className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        {COLUMNS.map((c) => {
          const list = by(c.key)
          return (
            <section key={c.key} className="w-[270px] shrink-0 rounded-[16px] bg-lav-100 p-3 xl:w-auto xl:flex-1" aria-labelledby={`col-${c.key}`}>
              <h2 id={`col-${c.key}`} className={`${label} flex items-center justify-between px-1 text-navy`}>
                {c.title}
                <span className="rounded-full bg-white px-2 py-0.5 text-brand">{list.length}</span>
              </h2>
              <div className="mt-3 space-y-3">
                {loading && !orders.length && <p className="px-1 text-sm text-muted">Loading…</p>}
                {c.key !== 'collected' &&
                  list.map((o) => <OrderCard key={o.id} order={o} now={now} lateAfter={lateAfter} flash={highlight.has(o.id)} />)}
                {c.key === 'collected' && (
                  <>
                    <ul className="space-y-1.5">
                      {list
                        .slice()
                        .reverse()
                        .map((o) => (
                          <li key={o.id} className="rounded-[10px] bg-white px-3 py-2 text-sm">
                            <span className="font-display font-extrabold text-brand">#{o.order_number}</span> · {o.first_name ?? 'No name'} ·{' '}
                            {names(o)} — <span className="font-semibold">{cedis(o.total)} paid</span>
                          </li>
                        ))}
                    </ul>
                    {by('not_collected').length > 0 && (
                      <div className="pt-2">
                        <p className={`${label} px-1 text-muted`}>Not collected</p>
                        <ul className="mt-1.5 space-y-1.5">
                          {by('not_collected').map((o) => (
                            <li key={o.id} className="flex items-center gap-2 rounded-[10px] bg-white/60 px-3 py-2 text-sm text-muted">
                              <span className="flex-1">
                                #{o.order_number} · {o.first_name ?? 'No name'} · {names(o)} — {cedis(o.total)}
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const err = await setStatus(o.id, 'collected')
                                  if (err) alert(err)
                                }}
                                className="min-h-11 shrink-0 rounded-full px-2 text-xs font-semibold text-brand underline"
                              >
                                Paid now
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {scanning && (
        <Scanner
          onClose={() => setScanning(false)}
          onResult={(id) => {
            setScanning(false)
            navigate(`/staff/scan/${id}`)
          }}
        />
      )}
    </main>
  )
}
