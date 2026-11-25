import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { usePublicData } from '../lib/publicData'
import { supabase } from '../lib/supabase'
import { cedis } from '../lib/format'
import { KEYS, save, uuid } from '../lib/storage'
import { StepHeader } from '../components/StepHeader'
import { DishPhoto, btnPrimary, label } from '../components/ui'

const ERRORS: [string, string][] = [
  ['NOT_ACCEPTING', "Sorry — the kitchen has just paused orders. Please try again in a little while."],
  ['CLOSED', "Sorry — we've just closed for orders."],
  ['DISH_UNAVAILABLE', 'One of your dishes has just run out. Please change your order.'],
  ['INVALID_AMOUNT', 'Our prices have just changed. Please check your order and try again.'],
  ['EMPTY_ORDER', 'Please add at least one dish.'],
  ['TOO_MANY_ITEMS', 'That is a lot of plates! Please order 20 or fewer at a time.'],
  ['NAME_TOO_LONG', 'Please use a shorter name (20 letters or fewer).'],
]

export default function ReviewOrder() {
  const cart = useCart()
  const { refresh } = usePublicData()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  // Same key reused on retries, so a flaky connection can never create two orders.
  const clientRef = useRef(uuid())

  if (cart.count === 0 && !submitting) return <Navigate to="/order" replace />

  async function placeOrder() {
    if (inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('place_order', {
      items: cart.lines.map((l) => ({ dish_id: l.dish.id, amount: l.amount })),
      first_name: name.trim() || null,
      client_ref: clientRef.current,
    })
    if (rpcError || !data) {
      const msg = rpcError?.message ?? ''
      const known = ERRORS.find(([code]) => msg.includes(code))
      setError(known ? known[1] : "We couldn't reach the kitchen. Check your connection and try again.")
      if (known) {
        void refresh()
        clientRef.current = uuid()
      }
      inFlight.current = false
      setSubmitting(false)
      return
    }
    const order = data as { id: string; order_number: number; total: number }
    save(KEYS.activeOrder, order.id)
    cart.clear()
    navigate(`/order/${order.id}`, { replace: true })
  }

  return (
    <div className="min-h-dvh bg-lav pb-10">
      <StepHeader step="STEP 2 OF 2" title="Your order" backTo="/order" />

      <main className="mx-auto max-w-xl px-4 pt-4">
        <section className="rounded-[16px] bg-white p-4 shadow-sm" aria-label="Order summary">
          <ul>
            {cart.lines.map((l) => (
              <li key={l.dish.id} className="flex items-center gap-3 border-b border-dashed border-dash-light py-3 first:pt-0">
                <DishPhoto src={l.dish.photo_url} alt={l.dish.name} size={48} />
                <span className="flex-1 font-display text-sm font-bold uppercase tracking-wide">{l.dish.name}</span>
                <span className="font-display font-extrabold">{cedis(l.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between pt-3">
            <span className={label}>TOTAL</span>
            <span className="font-display text-xl font-extrabold text-brand">{cedis(cart.total)}</span>
          </div>
        </section>

        <Link to="/order" className="mt-3 inline-flex min-h-11 items-center font-display text-xs font-bold uppercase tracking-[0.15em] text-brand">
          + Add or change food
        </Link>

        <div className="mt-4">
          <label htmlFor="first-name" className="block text-sm font-semibold">
            Your first name (optional)
          </label>
          <input
            id="first-name"
            type="text"
            inputMode="text"
            autoComplete="given-name"
            autoCapitalize="words"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ama"
            aria-describedby="first-name-help"
            className="mt-1.5 block min-h-12 w-full rounded-[14px] border-2 border-dash-light bg-white px-4 text-base placeholder:text-muted/70 focus:border-brand focus:outline-none"
          />
          <p id="first-name-help" className="mt-1.5 text-[13px] text-muted">
            We'll call it out with your order number when your food is ready.
          </p>
        </div>

        <p className="mt-5 rounded-[14px] bg-peach px-4 py-3 text-sm text-peach-ink">
          <strong>No payment now.</strong> You pay at the counter when you collect your food.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-[14px] border-2 border-late/30 bg-white px-4 py-3 text-sm font-medium text-late">
            {error}
          </p>
        )}

        <button type="button" onClick={placeOrder} disabled={submitting} className={`${btnPrimary} mt-5 w-full`}>
          {submitting ? 'Placing order…' : `Place order · ${cedis(cart.total)}`}
        </button>
      </main>
    </div>
  )
}
