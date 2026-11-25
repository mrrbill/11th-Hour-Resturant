import { Link } from 'react-router-dom'
import { usePublicData } from '../lib/publicData'
import { useCart } from '../lib/cart'
import { cedis } from '../lib/format'
import { maxValidAmount } from '../lib/pricing'
import { StepHeader } from '../components/StepHeader'
import { DishPhoto, btnPrimary } from '../components/ui'
import { ArrowRightIcon, CheckIcon, MinusIcon, PlusIcon, TrashIcon } from '../components/icons'

export default function ChooseFood() {
  const { settings, dishes } = usePublicData()
  const cart = useCart()
  const rules = settings!
  const max = maxValidAmount(rules)

  return (
    <div className="min-h-dvh bg-lav pb-32">
      <StepHeader step="STEP 1 OF 2" title="Choose your food" backTo="/" />

      <main className="mx-auto max-w-xl px-4 pt-4">
        <p className="rounded-[14px] bg-lav-100 px-4 py-3 text-sm text-navy">
          Every plate starts at <strong>{cedis(rules.min_price)}</strong>. Tap + to add {cedis(rules.step)} for a bigger plate.
        </p>

        <ul className="mt-4 space-y-3">
          {dishes.map((d) => {
            const amount = cart.amountFor(d.id)
            const added = amount !== undefined
            return (
              <li
                key={d.id}
                className={`rounded-[16px] border-2 bg-white p-3 transition ${added ? 'border-brand' : 'border-transparent shadow-sm'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="relative">
                    <DishPhoto src={d.photo_url} alt={d.name} size={72} />
                    {added && (
                      <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-brand text-white ring-2 ring-white">
                        <CheckIcon className="h-3.5 w-3.5" />
                        <span className="sr-only">Added</span>
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-sm font-extrabold uppercase tracking-wide">{d.name}</h2>
                    <p className="mt-0.5 text-[13px] leading-snug text-muted">{d.description}</p>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  {!added ? (
                    <button
                      type="button"
                      onClick={() => cart.add(d.id)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand px-5 font-display text-xs font-bold uppercase tracking-[0.15em] text-white"
                      aria-label={`Add ${d.name}, ${cedis(rules.min_price)}`}
                    >
                      <PlusIcon className="h-4 w-4" /> Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 rounded-full bg-lav-100 p-1" role="group" aria-label={`${d.name} plate size`}>
                      <button
                        type="button"
                        onClick={() => cart.decrease(d.id)}
                        className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand shadow-sm"
                        aria-label={amount <= rules.min_price ? `Remove ${d.name}` : `Smaller plate of ${d.name}`}
                      >
                        {amount <= rules.min_price ? <TrashIcon /> : <MinusIcon />}
                      </button>
                      <span className="min-w-20 text-center font-display text-base font-extrabold text-brand" aria-live="polite">
                        {cedis(amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => cart.increase(d.id)}
                        disabled={amount >= max}
                        className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white disabled:opacity-40"
                        aria-label={`Bigger plate of ${d.name}`}
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </main>

      <div className="pb-safe fixed inset-x-0 bottom-0 border-t border-dash-light bg-white/95 px-4 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <p className="text-sm" aria-live="polite">
            <span className="text-muted">
              {cart.count} {cart.count === 1 ? 'plate' : 'plates'} ·{' '}
            </span>
            <span className="font-display font-extrabold">Total {cedis(cart.total)}</span>
          </p>
          {cart.count > 0 ? (
            <Link to="/order/review" className={btnPrimary}>
              Review order <ArrowRightIcon className="h-4 w-4" />
            </Link>
          ) : (
            <button type="button" disabled className={btnPrimary}>
              Review order <ArrowRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
