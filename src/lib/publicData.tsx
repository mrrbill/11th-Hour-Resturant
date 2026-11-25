import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { rest } from './rest'
import { isOpenNow } from './hours'
import { KEYS, load, save } from './storage'
import type { Dish, Settings } from './types'

interface PublicData {
  settings: Settings | null
  dishes: Dish[]
  loading: boolean
  error: boolean
  /** Inside opening hours */
  open: boolean
  /** Open AND staff haven't paused orders */
  canOrder: boolean
  refresh: () => Promise<void>
}

const Ctx = createContext<PublicData | null>(null)

interface Cache {
  settings: Settings | null
  dishes: Dish[]
}

export function PublicDataProvider({ children }: { children: ReactNode }) {
  // Stale-while-revalidate from localStorage so the menu paints instantly on slow data.
  const cached = load<Cache>(KEYS.publicCache, { settings: null, dishes: [] })
  const [settings, setSettings] = useState<Settings | null>(cached.settings)
  const [dishes, setDishes] = useState<Dish[]>(cached.dishes)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const refresh = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([
        rest<Settings[]>('settings?select=*&id=eq.1'),
        rest<Dish[]>('dishes?select=id,name,description,photo_url,is_available,sort_order&is_available=eq.true&order=sort_order,name'),
      ])
      if (!s[0]) throw new Error('No settings row')
      setError(false)
      setSettings(s[0])
      setDishes(d)
      save(KEYS.publicCache, { settings: s[0], dishes: d })
    } catch {
      setError(true)
    }
    setLoading(false)
    setNow(new Date())
  }, [])

  useEffect(() => {
    void refresh()
    const tick = setInterval(() => setNow(new Date()), 30_000)
    const poll = setInterval(() => void refresh(), 5 * 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(tick)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  const value = useMemo<PublicData>(() => {
    const open = isOpenNow(settings, now)
    return {
      settings,
      dishes,
      loading,
      error,
      open,
      canOrder: open && !!settings?.accepting_orders,
      refresh,
    }
  }, [settings, dishes, loading, error, now, refresh])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePublicData(): PublicData {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePublicData outside provider')
  return v
}
