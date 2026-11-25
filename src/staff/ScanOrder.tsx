import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { cedis, clockTime, prettyDate, STATUS_LABEL } from '../lib/format'
import { useStaffOrders } from './staffOrders'
import { Spinner, label } from '../components/ui'
import { BackIcon, WarnIcon } from '../components/icons'
import type { Order, OrderStatus } from '../lib/types'

/** Large panel shown after scanning a customer's code (or searching by number). */
export function ScanOrder() {
  const { id = '' } = useParams()
  const { orders, today, setStatus, upsert } = useStaffOrders()
  const live = orders.find((o) => o.id === id)
  const [fetched, setFetched] = useState<Order | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => alive && setFetched((data as Order) ?? null))
    return () => {
      alive = false
    }
  }, [id])

  const order = live ?? fetched
  if (order === undefined) return <Spinner label="Finding order…" />

  if (!order) {
    return (
      <main className="px-4 py-8 md:px-8">
        <Back />
        <p role="alert" className="mt-6 rounded-[16px] bg-white p-6 text-lg font-semibold text-late">
          Order not found. Ask for the order number and search instead.
        </p>
      </main>
    )
  }

  async function go(s: OrderStatus) {
    if (!order) return
    setBusy(true)
    setErr(null)
    const e = await setStatus(order.id, s)
    if (!e && order.order_date !== today) {
      // Not on today's board — refresh our copy directly.
      const { data } = await supabase.from('orders').select('*, order_items(*)').eq('id', order.id).single()
      if (data) {
        setFetched(data as Order)
        upsert(data as Order)
      }
    }
    setErr(e)
    setBusy(false)
  }

  const btn = 'min-h-14 flex-1 rounded-full px-6 font-display text-sm font-bold uppercase tracking-[0.1em] disabled:opacity-50'

  return (
    <main className="px-4 py-6 md:px-8">
      <Back />
      <section className="mx-auto mt-4 max-w-xl rounded-[18px] bg-white p-6 shadow-md" aria-labelledby="scan-num">
        {order.order_date !== today && (
          <p className="mb-4 flex items-center gap-2 rounded-[12px] bg-peach px-3 py-2 text-sm font-semibold text-peach-ink">
            <WarnIcon /> This order is from {prettyDate(order.order_date)}, not today.
          </p>
        )}
        <p className={`${label} text-muted`}>ORDER NUMBER</p>
        <p id="scan-num" className="font-display text-[88px] font-extrabold leading-none text-brand">
          {order.order_number}
        </p>
        <p className="mt-1 text-xl font-semibold">{order.first_name ?? <em className="font-normal text-muted">No name</em>}</p>
        <p className="mt-1 text-sm text-muted">
          Placed {clockTime(order.placed_at)} · Status: <strong className="text-navy">{STATUS_LABEL[order.status]}</strong>
        </p>

        <ul className="mt-4 border-t border-dashed border-dash-light pt-3">
          {order.order_items.map((it, i) => (
            <li key={i} className="flex justify-between py-1 text-lg">
              <span>{it.dish_name}</span>
              <span className="font-semibold">{cedis(it.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between border-t border-dashed border-dash-light pt-3">
          <span className={label}>TO PAY</span>
          <span className="font-display text-3xl font-extrabold">{cedis(order.total)}</span>
        </div>

        <div className="mt-6" aria-live="polite">
          {order.status === 'ready' && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" disabled={busy} onClick={() => go('collected')} className={`${btn} bg-ok text-white`}>
                Paid &amp; collected
              </button>
              <button type="button" disabled={busy} onClick={() => go('not_collected')} className={`${btn} border-2 border-dash text-navy`}>
                Not collected
              </button>
            </div>
          )}
          {(order.status === 'new' || order.status === 'preparing') && (
            <p className="rounded-[14px] bg-lav-100 px-4 py-4 text-center text-lg font-bold text-brand">
              Not ready yet — status: {STATUS_LABEL[order.status]}
            </p>
          )}
          {order.status === 'collected' && (
            <p role="alert" className="flex items-center gap-3 rounded-[14px] bg-late px-4 py-4 text-lg font-bold text-white">
              <WarnIcon className="h-7 w-7 shrink-0" /> Already collected at {clockTime(order.closed_at)}. Do not give out food again.
            </p>
          )}
          {order.status === 'not_collected' && (
            <div className="space-y-3">
              <p className="rounded-[14px] bg-peach px-4 py-3 font-semibold text-peach-ink">
                Marked not collected at {clockTime(order.closed_at)}.
              </p>
              <button type="button" disabled={busy} onClick={() => go('collected')} className={`${btn} w-full bg-ok text-white`}>
                Paid &amp; collected
              </button>
            </div>
          )}
          {err && (
            <p role="alert" className="mt-3 text-sm font-medium text-late">
              {err}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

function Back() {
  return (
    <Link to="/staff" className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand">
      <BackIcon /> Orders
    </Link>
  )
}
