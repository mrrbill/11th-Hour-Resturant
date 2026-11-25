import { lazy, Suspense, useEffect, useState } from 'react'
import { Route, Routes, useMatch } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/ui'
import { OrderStatusView } from '../pages/OrderStatusPage'
import { Login } from './Login'
import { Layout } from './Layout'
import { StaffOrdersProvider } from './staffOrders'
import { OrdersBoard } from './OrdersBoard'
import { ScanOrder } from './ScanOrder'

const MenuAdmin = lazy(() => import('./MenuAdmin'))
const Totals = lazy(() => import('./Totals'))
const QrPoster = lazy(() => import('./QrPoster'))

export default function StaffApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [isStaff, setIsStaff] = useState<boolean | undefined>(undefined)
  const scanMatch = useMatch('/staff/scan/:id')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    if (!uid) {
      setIsStaff(undefined)
      return
    }
    let alive = true
    supabase
      .from('staff')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data, error }) => alive && setIsStaff(!error && !!data))
    return () => {
      alive = false
    }
  }, [uid])

  if (session === undefined || (session && isStaff === undefined)) return <Spinner />

  if (!session || !isStaff) {
    // A customer who opens their own order QR link just sees their order screen.
    if (scanMatch?.params.id) return <OrderStatusView id={scanMatch.params.id} />
    if (!session) return <Login />
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <h1 className="font-display text-xl font-extrabold">This account doesn't have staff access</h1>
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="mt-4 min-h-11 font-semibold text-brand underline"
          >
            Sign out
          </button>
        </div>
      </main>
    )
  }

  return (
    <StaffOrdersProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OrdersBoard />} />
          <Route path="scan/:id" element={<ScanOrder />} />
          <Route
            path="menu"
            element={
              <Suspense fallback={<Spinner />}>
                <MenuAdmin />
              </Suspense>
            }
          />
          <Route
            path="totals"
            element={
              <Suspense fallback={<Spinner />}>
                <Totals />
              </Suspense>
            }
          />
          <Route
            path="qr"
            element={
              <Suspense fallback={<Spinner />}>
                <QrPoster />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </StaffOrdersProvider>
  )
}
