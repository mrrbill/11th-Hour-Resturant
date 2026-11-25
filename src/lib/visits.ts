import { rpc } from './rest'
import { accraToday } from './format'

/** Logs one visit per source per day per device, then tidies ?src out of the URL. */
export function logVisit(): void {
  try {
    const params = new URLSearchParams(window.location.search)
    const source = params.get('src') === 'qr' ? 'qr' : 'direct'
    if (params.has('src')) {
      params.delete('src')
      const q = params.toString()
      window.history.replaceState(window.history.state, '', window.location.pathname + (q ? `?${q}` : '') + window.location.hash)
    }
    if (window.location.pathname.startsWith('/staff')) return
    const key = `11h-visit-${accraToday()}-${source}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    rpc('log_visit', { p_source: source }).catch(() => localStorage.removeItem(key))
  } catch {
    /* ignore */
  }
}
