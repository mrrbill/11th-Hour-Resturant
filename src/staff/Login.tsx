import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { BottomCircles, CornerCircles, btnPrimary, label } from '../components/ui'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) setError(err.message.includes('Invalid') ? 'Wrong email or password.' : err.message)
    setBusy(false)
  }

  return (
    <main className="on-dark relative grid min-h-dvh place-items-center overflow-hidden bg-brand px-4 text-white">
      <CornerCircles />
      <BottomCircles />
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-[18px] bg-white p-6 text-navy shadow-xl">
        <p className={`${label} text-muted`}>11TH HOUR · STAFF</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">Sign in</h1>
        <label htmlFor="email" className="mt-5 block text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block min-h-12 w-full rounded-[14px] border-2 border-dash-light px-4 focus:border-brand focus:outline-none"
        />
        <label htmlFor="password" className="mt-4 block text-sm font-semibold">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block min-h-12 w-full rounded-[14px] border-2 border-dash-light px-4 focus:border-brand focus:outline-none"
        />
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-late">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${btnPrimary} mt-6 w-full`}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
