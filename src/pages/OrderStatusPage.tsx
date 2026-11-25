import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { cedis } from '../lib/format'
import { KEYS, load, save } from '../lib/storage'
import { chime, vibrate } from '../lib/sound'
import { qrSvg } from '../lib/qr'
import { scanUrl } from '../lib/site'
import { usePublicData } from '../lib/publicData'
import { BottomCircles, CornerCircles, Spinner, label } from '../components/ui'
import { CheckIcon } from '../components/icons'
import type { Order, OrderStatus } from '../lib/types'

const FINAL: OrderStatus[] = ['collected', 'not_collected']
const STEPS: { key: OrderStatus; text: string }[] = [
  { key: 'new', text: 'Received' },
  { key: 'preparing', text: 'Being prepared' },
  { key: 'ready', text: 'Ready' },
]

function stepIndex(s: OrderStatus) {
  return s === 'new' ? 0 : s === 'preparing' ? 1 : 2
}

function OrderQr({ id }: { id: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    qrSvg(scanUrl(id)).then((s) => alive && setSvg(s)).catch(() => undefined)
    return () => {
      alive = false
    }
  }, [id])
  return (
    <figure className="mt-4 flex flex-col items-center">
      <div
        className="h-32 w-32 rounded-[12px] bg-white p-1 ring-1 ring-dash-light [&>svg]:h-full [&>svg]:w-full"
        role="img"
        aria-label="QR code for staff to scan at the counter"
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <figcaption className="mt-1.5 text-xs font-semibold text-muted">Show this at the counter</figcaption>
    </figure>
  )
}

export function OrderStatusView({ id }: { id: string }) {
  const { settings } = usePublicData()
  const [order, setOrder] = useState<Order | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'offline'>('loading')
  const prevStatus = useRef<OrderStatus | null>(null)
  const orderRef = useRef<Order | null>(null)

  const apply = useCallback((o: Order) => {
    orderRef.current = o
    if (prevStatus.current && prevStatus.current !== 'ready' && o.status === 'ready') {
      chime(3)
      vibrate([300, 150, 300, 150, 300])
    }
    prevStatus.current = o.status
    setOrder(o)
    if (FINAL.includes(o.status) && load<string | null>(KEYS.activeOrder, null) === o.id) save(KEYS.activeOrder, null)
  }, [])

  const fetchOrder = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_order', { p_id: id })
    if (error) {
      setState((s) => (s === 'ok' ? 'ok' : 'offline'))
      return
    }
    if (!data) {
      setState('missing')
      if (load<string | null>(KEYS.activeOrder, null) === id) save(KEYS.activeOrder, null)
      return
    }
    apply(data as Order)
    setState('ok')
  }, [id, apply])

  // Initial load + polling fallback (slow / flaky networks, or realtime blocked)
  useEffect(() => {
    void fetchOrder()
    const t = setInterval(() => {
      if (!prevStatus.current || !FINAL.includes(prevStatus.current)) void fetchOrder()
    }, 20_000)
    const onVis = () => document.visibilityState === 'visible' && void fetchOrder()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [fetchOrder])

  // Live status via Supabase Realtime broadcast on channel "order:<uuid>"
  useEffect(() => {
    const ch = supabase
      .channel(`order:${id}`)
      .on('broadcast', { event: 'status' }, ({ payload }) => {
        if (orderRef.current) apply({ ...orderRef.current, ...(payload as Partial<Order>) })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [id, apply])

  if (state === 'loading') return <Spinner label="Loading your order…" />
  if (state === 'missing' || state === 'offline' || !order) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <h1 className="font-display text-xl font-extrabold">
            {state === 'offline' ? "Can't load your order" : 'Order not found'}
          </h1>
          <p className="mt-2 text-muted">
            {state === 'offline' ? 'Check your connection and try again.' : 'This order link is not valid.'}
          </p>
          {state === 'offline' && (
            <button type="button" onClick={() => void fetchOrder()} className="mt-4 min-h-11 font-semibold text-brand underline">
              Try again
            </button>
          )}
          <div>
            <Link to="/" className="mt-4 inline-block min-h-11 font-semibold text-brand underline">
              Back to menu
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const ready = order.status === 'ready'
  const minutes = settings?.not_collected_minutes ?? 30

  return (
    <main className="on-dark relative min-h-dvh overflow-hidden bg-brand text-white">
      <CornerCircles />
      <BottomCircles />
      <div className="relative mx-auto flex max-w-md flex-col items-center px-4 pb-12 pt-10 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-brand">
          <CheckIcon className="h-8 w-8" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold">
          {order.first_name ? `Order placed, ${order.first_name}!` : 'Order placed!'}
        </h1>
        <p className="mt-1 text-white/85">Keep this number. We'll call it out.</p>

        <section
          className={`mt-6 w-full rounded-[18px] p-5 text-navy shadow-lg transition-colors ${ready ? 'bg-orange' : 'bg-white'}`}
          aria-labelledby="num-label"
        >
          <p id="num-label" className={`${label} ${ready ? 'text-navy' : 'text-muted'}`}>
            YOUR ORDER NUMBER
          </p>
          <p className={`font-display text-[96px] font-extrabold leading-none tracking-tight ${ready ? 'text-navy' : 'text-brand'}`}>
            {order.order_number}
          </p>

          {/* Live status */}
          <div aria-live="assertive" className="mt-4">
            {order.status === 'collected' ? (
              <p className="rounded-full bg-lav-100 py-2 font-display text-sm font-bold">Collected — enjoy your meal!</p>
            ) : order.status === 'not_collected' ? (
              <p className="rounded-full bg-lav-100 py-2 font-display text-sm font-bold">This order was not collected.</p>
            ) : ready ? (
              <p className="rounded-[14px] bg-navy px-3 py-3 font-display text-lg font-extrabold text-white">
                READY! Come to the counter
              </p>
            ) : (
              <ol className="flex items-center justify-center gap-1 text-[11px] font-semibold sm:text-xs">
                {STEPS.map((s, i) => {
                  const cur = stepIndex(order.status)
                  const done = i <= cur
                  return (
                    <li key={s.key} className="flex items-center gap-1">
                      <span
                        className={`rounded-full px-2.5 py-1.5 ${i === cur ? 'bg-brand text-white' : done ? 'bg-lav-200 text-brand' : 'bg-lav-100 text-muted'}`}
                        aria-current={i === cur ? 'step' : undefined}
                      >
                        {s.text}
                      </span>
                      {i < STEPS.length - 1 && <span aria-hidden="true" className="text-dash">→</span>}
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {!FINAL.includes(order.status) && <OrderQr id={order.id} />}

          <ul className="mt-4 text-left">
            {order.order_items.map((it, i) => (
              <li
                key={i}
                className={`flex justify-between border-b border-dashed py-2 text-sm ${ready ? 'border-navy/30' : 'border-dash-light'}`}
              >
                <span className="font-semibold">{it.dish_name}</span>
                <span className="font-display font-bold">{cedis(it.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between">
            <span className={label}>PAY AT COUNTER</span>
            <span className="font-display text-2xl font-extrabold">{cedis(order.total)}</span>
          </div>
        </section>

        <p className="mt-5 text-sm text-white/85">
          Please stay nearby. Food not collected within {minutes} minutes may be given out.
        </p>

        <Link
          to="/"
          className="mt-6 inline-flex min-h-12 items-center rounded-full border-2 border-white px-6 font-display text-sm font-bold uppercase tracking-[0.12em]"
        >
          Back to menu
        </Link>
      </div>
    </main>
  )
}

export default function OrderStatusPage() {
  const { id = '' } = useParams()
  return <OrderStatusView key={id} id={id} />
}
