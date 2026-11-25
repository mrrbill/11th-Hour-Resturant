import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { usePublicData } from '../lib/publicData'
import { compressImage } from '../lib/image'
import { cedis } from '../lib/format'
import { DAY_NAMES, WEEK_ORDER } from '../lib/hours'
import { DishPhoto, btnPrimary, label } from '../components/ui'
import type { DayHours, Dish, Settings } from '../lib/types'

const input =
  'block min-h-11 w-full rounded-[12px] border-2 border-dash-light bg-white px-3 text-base focus:border-brand focus:outline-none'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[16px] bg-white p-4 shadow-sm md:p-6" aria-label={title}>
      <h2 className={`${label} text-navy`}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Toggle({ checked, onChange, text }: { checked: boolean; onChange: (v: boolean) => void; text: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
    >
      <span className={`relative h-6 w-10 rounded-full transition ${checked ? 'bg-ok' : 'bg-dash'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </span>
      {text}
    </button>
  )
}

function Saved({ msg }: { msg: string | null }) {
  return (
    <span aria-live="polite" className={`text-sm font-medium ${msg?.startsWith('✓') ? 'text-ok' : 'text-late'}`}>
      {msg}
    </span>
  )
}

/* ------------------------------------------------------------------ Dishes */

function DishEditor({
  dish,
  first,
  last,
  onMove,
  onChanged,
}: {
  dish: Dish
  first: boolean
  last: boolean
  onMove: (dir: -1 | 1) => void
  onChanged: () => void
}) {
  const [d, setD] = useState(dish)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => setD(dish), [dish])
  const dirty = d.name !== dish.name || d.description !== dish.description || d.is_available !== dish.is_available

  async function save(patch: Partial<Dish> = { name: d.name.trim(), description: d.description.trim(), is_available: d.is_available }) {
    setBusy(true)
    const { error } = await supabase.from('dishes').update(patch).eq('id', dish.id)
    setBusy(false)
    setMsg(error ? "Couldn't save." : '✓ Saved')
    if (!error) onChanged()
  }

  async function upload(file: File) {
    setBusy(true)
    setMsg('Uploading…')
    try {
      const blob = await compressImage(file)
      const path = `${dish.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('dish-photos').upload(path, blob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
      })
      if (error) throw error
      const { data } = supabase.storage.from('dish-photos').getPublicUrl(path)
      await save({ photo_url: data.publicUrl })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Upload failed.')
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Delete "${dish.name}"? Past orders keep their dish name.`)) return
    const { error } = await supabase.from('dishes').delete().eq('id', dish.id)
    if (error) setMsg("Couldn't delete.")
    else onChanged()
  }

  return (
    <li className={`rounded-[14px] border-2 p-3 ${d.is_available ? 'border-dash-light' : 'border-dashed border-dash bg-lav-100'}`}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <DishPhoto src={d.photo_url} alt={d.name} size={84} />
          <label className="cursor-pointer rounded-full bg-lav-200 px-3 py-2 text-xs font-semibold text-brand focus-within:outline focus-within:outline-2 focus-within:outline-brand">
            Change photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void upload(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <label htmlFor={`n-${dish.id}`} className="text-xs font-semibold text-muted">
              Name
            </label>
            <input id={`n-${dish.id}`} className={input} maxLength={60} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`d-${dish.id}`} className="text-xs font-semibold text-muted">
              Description (one line)
            </label>
            <input
              id={`d-${dish.id}`}
              className={input}
              maxLength={160}
              value={d.description}
              onChange={(e) => setD({ ...d, description: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle checked={d.is_available} onChange={(v) => setD({ ...d, is_available: v })} text={d.is_available ? 'Available' : 'Hidden'} />
            <span className="flex-1" />
            <button type="button" disabled={first} onClick={() => onMove(-1)} className="h-11 w-11 rounded-full bg-lav-100 disabled:opacity-40" aria-label={`Move ${dish.name} up`}>
              ↑
            </button>
            <button type="button" disabled={last} onClick={() => onMove(1)} className="h-11 w-11 rounded-full bg-lav-100 disabled:opacity-40" aria-label={`Move ${dish.name} down`}>
              ↓
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy || !dirty || !d.name.trim()} onClick={() => save()} className={`${btnPrimary} min-h-11 px-5`}>
              Save
            </button>
            <button type="button" onClick={remove} className="min-h-11 text-sm font-semibold text-late underline">
              Delete
            </button>
            <Saved msg={msg} />
          </div>
        </div>
      </div>
    </li>
  )
}

function DishesSection() {
  const { refresh } = usePublicData()
  const [dishes, setDishes] = useState<Dish[]>([])
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('dishes').select('*').order('sort_order').order('name')
    setDishes((data as Dish[]) ?? [])
  }, [])
  useEffect(() => void load(), [load])

  const changed = () => {
    void load()
    void refresh()
  }

  async function move(i: number, dir: -1 | 1) {
    const list = dishes.slice()
    const j = i + dir
    ;[list[i], list[j]] = [list[j], list[i]]
    setDishes(list)
    await Promise.all(list.map((d, idx) => supabase.from('dishes').update({ sort_order: idx + 1 }).eq('id', d.id)))
    changed()
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const { error } = await supabase
      .from('dishes')
      .insert({ name: name.trim(), description: desc.trim(), sort_order: dishes.length + 1, is_available: true })
    if (error) alert("Couldn't add the dish.")
    else {
      setName('')
      setDesc('')
      changed()
    }
  }

  return (
    <Card title="Dishes">
      <ul className="space-y-3">
        {dishes.map((d, i) => (
          <DishEditor key={d.id} dish={d} first={i === 0} last={i === dishes.length - 1} onMove={(dir) => move(i, dir)} onChanged={changed} />
        ))}
      </ul>
      <form onSubmit={add} className="mt-5 rounded-[14px] bg-lav-100 p-3">
        <p className="text-sm font-semibold">Add a dish</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <div>
            <label htmlFor="new-name" className="sr-only">
              New dish name
            </label>
            <input id="new-name" className={input} placeholder="Name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="new-desc" className="sr-only">
              New dish description
            </label>
            <input id="new-desc" className={input} placeholder="One-line description" maxLength={160} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <button type="submit" className={`${btnPrimary} min-h-11`}>
            Add
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">Add a photo after the dish is created.</p>
      </form>
    </Card>
  )
}

/* ---------------------------------------------------------------- Settings */

function useSettingsSaver() {
  const { refresh } = usePublicData()
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function save(patch: Partial<Settings>) {
    setBusy(true)
    const { error } = await supabase.from('settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1)
    setBusy(false)
    setMsg(error ? `Couldn't save: ${error.message}` : '✓ Saved')
    if (!error) void refresh()
  }
  return { save, msg, setMsg, busy }
}

function PricesSection({ s }: { s: Settings }) {
  const [min, setMin] = useState(String(s.min_price))
  const [step, setStep] = useState(String(s.step))
  const [max, setMax] = useState(String(s.max_price))
  const [mins, setMins] = useState(String(s.not_collected_minutes))
  const { save, msg, setMsg, busy } = useSettingsSaver()

  function submit(e: FormEvent) {
    e.preventDefault()
    const v = { min_price: +min, step: +step, max_price: +max, not_collected_minutes: +mins }
    if (![v.min_price, v.step, v.max_price, v.not_collected_minutes].every((n) => Number.isInteger(n) && n > 0))
      return setMsg('Use whole numbers above 0.')
    if (v.max_price < v.min_price) return setMsg('Max price must be at least the min price.')
    void save(v)
  }

  const field = (id: string, text: string, val: string, set: (v: string) => void, suffix = 'GH₵') => (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-muted">
        {text}
      </label>
      <div className="relative">
        <input id={id} className={`${input} pr-14`} inputMode="numeric" value={val} onChange={(e) => set(e.target.value.replace(/\D/g, ''))} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span>
      </div>
    </div>
  )

  const preview: number[] = []
  if (+step > 0 && +max >= +min) for (let a = +min; a <= +max && preview.length < 12; a += +step) preview.push(a)

  return (
    <Card title="Prices">
      <form onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {field('min', 'Min plate price', min, setMin)}
          {field('step', 'Step (+ button)', step, setStep)}
          {field('max', 'Max plate price', max, setMax)}
          {field('ncm', 'Not collected after', mins, setMins, 'min')}
        </div>
        <p className="mt-3 text-xs text-muted">Plate sizes customers can pick: {preview.map(cedis).join(' · ')}</p>
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={busy} className={`${btnPrimary} min-h-11`}>
            Save prices
          </button>
          <Saved msg={msg} />
        </div>
      </form>
    </Card>
  )
}

function HoursSection({ s }: { s: Settings }) {
  const [hours, setHours] = useState<DayHours[]>(s.opening_hours)
  const { save, msg, setMsg, busy } = useSettingsSaver()
  const set = (i: number, patch: Partial<DayHours>) => setHours((h) => h.map((d, k) => (k === i ? { ...d, ...patch } : d)))

  function submit(e: FormEvent) {
    e.preventDefault()
    const bad = hours.findIndex((d) => !d.closed && !(d.open < d.close))
    if (bad !== -1) return setMsg(`${DAY_NAMES[bad]}: closing time must be after opening time.`)
    void save({ opening_hours: hours })
  }

  return (
    <Card title="Opening hours (Ghana time)">
      <form onSubmit={submit}>
        <div className="space-y-2">
          {WEEK_ORDER.map((i) => {
            const d = hours[i]
            return (
              <fieldset key={i} className="grid grid-cols-2 items-center gap-2 border-b border-dashed border-dash-light pb-2 sm:grid-cols-[110px_auto_1fr_1fr_2fr]">
                <legend className="sr-only">{DAY_NAMES[i]}</legend>
                <span className="font-semibold">{DAY_NAMES[i]}</span>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.closed} onChange={(e) => set(i, { closed: e.target.checked })} className="h-5 w-5 accent-brand" />
                  Closed
                </label>
                <label className="text-xs text-muted">
                  Opens
                  <input type="time" className={input} value={d.open} disabled={d.closed} onChange={(e) => set(i, { open: e.target.value })} />
                </label>
                <label className="text-xs text-muted">
                  Closes
                  <input type="time" className={input} value={d.close} disabled={d.closed} onChange={(e) => set(i, { close: e.target.value })} />
                </label>
                <label className="col-span-2 text-xs text-muted sm:col-span-1">
                  Menu text instead of times (optional)
                  <input className={input} placeholder="e.g. after service" maxLength={30} value={d.note} disabled={d.closed} onChange={(e) => set(i, { note: e.target.value })} />
                </label>
              </fieldset>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-muted">Orders are only accepted between the opening and closing times, even if menu text is shown.</p>
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={busy} className={`${btnPrimary} min-h-11`}>
            Save hours
          </button>
          <Saved msg={msg} />
        </div>
      </form>
    </Card>
  )
}

function LinksSection({ s }: { s: Settings }) {
  const [v, setV] = useState({ instagram_url: s.instagram_url ?? '', facebook_url: s.facebook_url ?? '', website: s.website ?? '' })
  const { save, msg, setMsg, busy } = useSettingsSaver()
  function submit(e: FormEvent) {
    e.preventDefault()
    const vals = Object.values(v).filter(Boolean)
    if (vals.some((u) => !/^https?:\/\//i.test(u))) return setMsg('Links must start with https://')
    void save({ instagram_url: v.instagram_url || null, facebook_url: v.facebook_url || null, website: v.website || null })
  }
  const rows: [keyof typeof v, string][] = [
    ['instagram_url', 'Instagram'],
    ['facebook_url', 'Facebook'],
    ['website', 'Church website'],
  ]
  return (
    <Card title="Links">
      <form onSubmit={submit} className="space-y-3">
        {rows.map(([k, t]) => (
          <div key={k}>
            <label htmlFor={k} className="text-xs font-semibold text-muted">
              {t}
            </label>
            <input id={k} type="url" className={input} value={v[k]} placeholder="https://" onChange={(e) => setV({ ...v, [k]: e.target.value })} />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className={`${btnPrimary} min-h-11`}>
            Save links
          </button>
          <Saved msg={msg} />
        </div>
      </form>
    </Card>
  )
}

export default function MenuAdmin() {
  const { settings } = usePublicData()
  return (
    <main className="space-y-5 px-4 py-6 md:px-8">
      <h1 className="font-display text-2xl font-extrabold">Menu &amp; prices</h1>
      <DishesSection />
      {settings && (
        <>
          <PricesSection s={settings} />
          <HoursSection s={settings} />
          <LinksSection s={settings} />
        </>
      )}
    </main>
  )
}
