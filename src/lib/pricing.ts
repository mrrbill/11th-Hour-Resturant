import type { Settings } from './types'

type PriceRules = Pick<Settings, 'min_price' | 'step' | 'max_price'>

export function maxValidAmount(s: PriceRules): number {
  return s.min_price + Math.floor((s.max_price - s.min_price) / s.step) * s.step
}

/** Clamp + snap an amount to the current price rules. */
export function normalizeAmount(amount: number, s: PriceRules): number {
  const clamped = Math.min(Math.max(amount, s.min_price), maxValidAmount(s))
  return s.min_price + Math.round((clamped - s.min_price) / s.step) * s.step
}
