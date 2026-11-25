import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { KEYS, load, save } from './storage'
import { usePublicData } from './publicData'
import { maxValidAmount, normalizeAmount } from './pricing'
import type { Dish } from './types'

/** dish id → plate amount in cedis */
type CartMap = Record<string, number>

export interface CartLine {
  dish: Dish
  amount: number
}

interface CartApi {
  lines: CartLine[]
  total: number
  count: number
  amountFor: (dishId: string) => number | undefined
  add: (dishId: string) => void
  increase: (dishId: string) => void
  decrease: (dishId: string) => void
  remove: (dishId: string) => void
  clear: () => void
}

const Ctx = createContext<CartApi | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { settings, dishes } = usePublicData()
  const [cart, setCart] = useState<CartMap>(() => load<CartMap>(KEYS.cart, {}))

  useEffect(() => save(KEYS.cart, cart), [cart])

  const rules = settings ?? { min_price: 30, step: 10, max_price: 100 }

  // Only dishes that are still available, with amounts snapped to current rules.
  const lines = useMemo<CartLine[]>(
    () =>
      dishes
        .filter((d) => cart[d.id] !== undefined)
        .map((d) => ({ dish: d, amount: normalizeAmount(cart[d.id], rules) })),
    [dishes, cart, rules],
  )

  const add = useCallback((id: string) => setCart((c) => ({ ...c, [id]: rules.min_price })), [rules.min_price])
  const remove = useCallback(
    (id: string) =>
      setCart((c) => {
        const next = { ...c }
        delete next[id]
        return next
      }),
    [],
  )
  const increase = useCallback(
    (id: string) =>
      setCart((c) => ({ ...c, [id]: Math.min(normalizeAmount(c[id] ?? rules.min_price, rules) + rules.step, maxValidAmount(rules)) })),
    [rules],
  )
  const decrease = useCallback(
    (id: string) =>
      setCart((c) => {
        const cur = normalizeAmount(c[id] ?? rules.min_price, rules)
        if (cur <= rules.min_price) {
          const next = { ...c }
          delete next[id]
          return next
        }
        return { ...c, [id]: cur - rules.step }
      }),
    [rules],
  )
  const clear = useCallback(() => setCart({}), [])

  const value = useMemo<CartApi>(
    () => ({
      lines,
      total: lines.reduce((s, l) => s + l.amount, 0),
      count: lines.length,
      amountFor: (id) => lines.find((l) => l.dish.id === id)?.amount,
      add,
      increase,
      decrease,
      remove,
      clear,
    }),
    [lines, add, increase, decrease, remove, clear],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart(): CartApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCart outside provider')
  return v
}
