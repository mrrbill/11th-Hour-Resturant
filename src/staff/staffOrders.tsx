import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { accraToday } from '../lib/format'
import { chime } from '../lib/sound'
import type { Order, OrderStatus } from '../lib/types'

interface Api {
  today: string
  orders: Order[]
  loading: boolean
  error: string | null
  highlight: Set<string>
  /** Returns an error message, or null on success. */
  setStatus: (id: string, status: OrderStatus) => Promise<string | null>
  reload: () => Promise<void>
  upsert: (o: Order) => void
}

const Ctx = createContext<Api | null>(null)

const ERR: Record<string, string> = {
  BAD_TRANSITION: 'That order has already moved on — the board has been refreshed.',
  NOT_STAFF: 'Your login has expired. Please sign in again.',
  ORDER_NOT_FOUND: 'Order not found.',
}

export function StaffOrdersProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(accraToday())
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<Set<string>>(new Set())
  const known = useRef<Set<string>>(new Set())

  // Roll over to the new day at midnight (Accra)
  useEffect(() => {
    const t = setInterval(() => setToday(accraToday()), 30_000)
    return () => clearInterval(t)
  }, [])

  const reload = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_date', today)
      .order('order_number')
    if (err) setError("Couldn't load orders. Check the internet connection.")
    else {
      setError(null)
      const list = data as Order[]
      list.forEach((o) => known.current.add(o.id))
      setOrders(list)
    }
    setLoading(false)
  }, [today])

  const upsert = useCallback((o: Order) => {
    setOrders((list) => {
      const i = list.findIndex((x) => x.id === o.id)
      if (i === -1) return o.order_date === today ? [...list, o].sort((a, b) => a.order_number - b.order_number) : list
      const next = list.slice()
      next[i] = { ...list[i], ...o, order_items: o.order_items?.length ? o.order_items : list[i].order_items }
      return next
    })
  }, [today])

  const flash = useCallback((id: string) => {
    setHighlight((h) => new Set(h).add(id))
    setTimeout(
      () =>
        setHighlight((h) => {
          const n = new Set(h)
          n.delete(id)
          return n
        }),
      8000,
    )
  }, [])

  useEffect(() => {
    void reload()
    const ch = supabase
      .channel(`staff-orders-${today}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `order_date=eq.${today}` },
        async ({ new: row }) => {
          const id = (row as Order).id
          if (known.current.has(id)) return
          known.current.add(id)
          const { data } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).single()
          upsert((data as Order) ?? { ...(row as Order), order_items: [] })
          chime(2)
          flash(id)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_date=eq.${today}` },
        ({ new: row }) => upsert({ ...(row as Order), order_items: [] }),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void reload() // catch anything missed while reconnecting
      })
    const onVis = () => document.visibilityState === 'visible' && void reload()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      void supabase.removeChannel(ch)
    }
  }, [today, reload, upsert, flash])

  const setStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const before = orders.find((o) => o.id === id)
      if (before) upsert({ ...before, status, order_items: [] })
      const { data, error: err } = await supabase.rpc('set_order_status', { p_order_id: id, p_status: status })
      if (err) {
        await reload()
        const code = Object.keys(ERR).find((k) => err.message.includes(k))
        return code ? ERR[code] : "Couldn't update the order. Check the connection and try again."
      }
      upsert({ ...(data as Order), order_items: [] })
      return null
    },
    [orders, upsert, reload],
  )

  const value = useMemo(
    () => ({ today, orders, loading, error, highlight, setStatus, reload, upsert }),
    [today, orders, loading, error, highlight, setStatus, reload, upsert],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStaffOrders(): Api {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStaffOrders outside provider')
  return v
}
