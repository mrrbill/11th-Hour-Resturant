import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { PublicDataProvider, usePublicData } from './lib/publicData'
import { CartProvider } from './lib/cart'
import { KEYS, load } from './lib/storage'
import { MenuPage } from './pages/MenuPage'
import { Closed } from './components/Closed'
import { Spinner } from './components/ui'

// Everything except the menu is split out so the first load stays small.
const ChooseFood = lazy(() => import('./pages/ChooseFood'))
const ReviewOrder = lazy(() => import('./pages/ReviewOrder'))
const OrderStatusPage = lazy(() => import('./pages/OrderStatusPage'))
const StaffApp = lazy(() => import('./staff/StaffApp'))

/** Reopening the site jumps back to an order that is still in progress (once per load). */
function ResumeActiveOrder() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    const active = load<string | null>(KEYS.activeOrder, null)
    if (active && (pathname === '/' || pathname === '/order')) navigate(`/order/${active}`)
  }, [navigate, pathname])
  return null
}

function OrderGate({ children }: { children: ReactNode }) {
  const { settings, loading, canOrder } = usePublicData()
  if (!settings && loading) return <Spinner />
  if (!canOrder) return <Closed />
  return <>{children}</>
}

function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Page not found</h1>
        <Link to="/" className="mt-4 inline-block font-semibold text-brand underline">
          Go to the menu
        </Link>
      </div>
    </main>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <PublicDataProvider>
        <CartProvider>
          <ResumeActiveOrder />
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/" element={<MenuPage />} />
              <Route
                path="/order"
                element={
                  <OrderGate>
                    <ChooseFood />
                  </OrderGate>
                }
              />
              <Route
                path="/order/review"
                element={
                  <OrderGate>
                    <ReviewOrder />
                  </OrderGate>
                }
              />
              <Route path="/order/:id" element={<OrderStatusPage />} />
              <Route path="/staff/*" element={<StaffApp />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </CartProvider>
      </PublicDataProvider>
    </BrowserRouter>
  )
}
