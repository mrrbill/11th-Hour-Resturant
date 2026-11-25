// Minimal PostgREST calls for the public menu page, so the first page load
// doesn't need the full supabase-js client (auth + realtime). The client is
// loaded later, only on the ordering and staff pages.
const BASE = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers || {}) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (res.status === 204 ? null : await res.json()) as T
}

export function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  return rest<T>(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })
}
