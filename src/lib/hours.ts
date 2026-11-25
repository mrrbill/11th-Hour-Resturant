import type { DayHours, Settings } from './types'

const LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Display order: Monday first, Sunday last. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const DAY_NAMES = LONG

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`
}

export function isOpenNow(settings: Settings | null, now = new Date()): boolean {
  if (!settings) return false
  const day = settings.opening_hours?.[now.getUTCDay()]
  if (!day || day.closed) return false
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes()
  return mins >= toMinutes(day.open) && mins < toMinutes(day.close)
}

function describe(d: DayHours): string {
  if (d.closed) return 'Closed'
  if (d.note?.trim()) return d.note.trim()
  return `${fmtTime(d.open)} – ${fmtTime(d.close)}`
}

/** Groups consecutive days with identical hours: "Tue – Sat · 11am – 8pm". */
export function hoursRows(hours: DayHours[] | undefined): { label: string; value: string }[] {
  if (!hours || hours.length !== 7) return []
  const rows: { label: string; value: string }[] = []
  let i = 0
  while (i < 7) {
    const start = WEEK_ORDER[i]
    let j = i
    while (j + 1 < 7 && describe(hours[WEEK_ORDER[j + 1]]) === describe(hours[start])) j++
    const end = WEEK_ORDER[j]
    rows.push({
      label: i === j ? LONG[start] : `${SHORT[start]} – ${SHORT[end]}`,
      value: describe(hours[start]),
    })
    i = j + 1
  }
  return rows
}
