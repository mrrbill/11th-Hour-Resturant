import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { accraToday, cedis, prettyDate } from '../lib/format'
import { label } from '../components/ui'
import type { Order } from '../lib/types'

interface Report {
  orders: Order[]
  qrVisits: number
  allVisits: number
}

export default function Totals() {
  const [date, setDate] = useState(accraToday())
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setReport(null)
    setError(false)
    Promise.all([
      supabase.from('orders').select('*, order_items(*)').eq('order_date', date).order('order_number'),
      supabase.from('visits').select('id', { count: 'exact', head: true }).eq('visit_date', date).eq('source', 'qr'),
      supabase.from('visits').select('id', { count: 'exact', head: true }).eq('visit_date', date),
    ]).then(([o, qr, all]) => {
      if (!alive) return
      if (o.error) return setError(true)
      setReport({ orders: o.data as Order[], qrVisits: qr.count ?? 0, allVisits: all.count ?? 0 })
    })
    return () => {
      alive = false
    }
  }, [date])

  const o = report?.orders ?? []
  const collected = o.filter((x) => x.status === 'collected')
  const notCollected = o.filter((x) => x.status === 'not_collected')
  const open = o.length - collected.length - notCollected.length
  const money = collected.reduce((s, x) => s + x.total, 0)

  const dishMap = new Map<string, { plates: number; paid: number }>()
  for (const ord of o) {
    for (const it of ord.order_items) {
      const cur = dishMap.get(it.dish_name) ?? { plates: 0, paid: 0 }
      cur.plates += 1
      if (ord.status === 'collected') cur.paid += it.amount
      dishMap.set(it.dish_name, cur)
    }
  }
  const top = [...dishMap.entries()].sort((a, b) => b[1].plates - a[1].plates)

  const stat = (t: string, v: string | number, sub?: string) => (
    <div className="rounded-[14px] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-muted">{t}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-brand">{v}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )

  return (
    <main className="px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end gap-4">
        <h1 className="mr-auto font-display text-2xl font-extrabold">Daily totals</h1>
        <div>
          <label htmlFor="day" className="block text-xs font-semibold text-muted">
            Date
          </label>
          <input
            id="day"
            type="date"
            value={date}
            max={accraToday()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="min-h-11 rounded-[12px] border-2 border-dash-light bg-white px-3 focus:border-brand focus:outline-none"
          />
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">{prettyDate(date)}</p>

      {error && (
        <p role="alert" className="mt-4 text-late">
          Couldn't load this day. Check the connection.
        </p>
      )}
      {!report && !error && <p className="mt-6 text-muted">Loading…</p>}

      {report && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {stat('Orders', o.length)}
            {stat('Collected', collected.length)}
            {stat('Not collected', notCollected.length, open ? `${open} still open` : undefined)}
            {stat('Money taken', cedis(money), 'collected orders only')}
            {stat('Menu QR scans', report.qrVisits, `of ${report.allVisits} visits`)}
          </div>

          <section className="mt-6 rounded-[16px] bg-white p-4 shadow-sm md:p-6" aria-labelledby="top-h">
            <h2 id="top-h" className={`${label} text-navy`}>
              TOP DISHES
            </h2>
            {top.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No orders on this day.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th scope="col" className="py-2 font-semibold">Dish</th>
                    <th scope="col" className="py-2 text-right font-semibold">Plates ordered</th>
                    <th scope="col" className="py-2 text-right font-semibold">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map(([name, v]) => (
                    <tr key={name} className="border-t border-dashed border-dash-light">
                      <td className="py-2.5 font-semibold">{name}</td>
                      <td className="py-2.5 text-right tabular-nums">{v.plates}</td>
                      <td className="py-2.5 text-right tabular-nums">{cedis(v.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  )
}
