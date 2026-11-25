/** Always "GH₵40" — whole cedis, no decimals. */
export function cedis(n: number): string {
  return `GH₵${Math.round(n).toLocaleString('en-US')}`
}

/** Ghana is UTC+0 all year (Africa/Accra), so UTC getters give local time. */
export function accraToday(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function clockTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export function prettyDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export const STATUS_LABEL: Record<string, string> = {
  new: 'Received',
  preparing: 'Preparing',
  ready: 'Ready',
  collected: 'Collected',
  not_collected: 'Not collected',
}
