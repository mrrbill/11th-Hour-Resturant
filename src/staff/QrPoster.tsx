import { useEffect, useState } from 'react'
import { usePublicData } from '../lib/publicData'
import { hoursRows } from '../lib/hours'
import { menuQrUrl, siteOrigin } from '../lib/site'
import { btnOutline, btnPrimary, label } from '../components/ui'
import { drawPoster, PAPER, type PosterKind } from './poster'

interface Rendered {
  kind: PosterKind
  canvas: HTMLCanvasElement
  dataUrl: string
}

function download(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function QrPoster() {
  const { settings } = usePublicData()
  const [posters, setPosters] = useState<Rendered[]>([])
  const [printing, setPrinting] = useState<Rendered | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const url = menuQrUrl()
  const hoursKey = JSON.stringify(settings?.opening_hours ?? null)

  useEffect(() => {
    if (!settings) return
    let alive = true
    const opts = { url, hours: hoursRows(settings.opening_hours), siteText: siteOrigin().replace(/^https?:\/\//, '') }
    Promise.all((['a4', 'a6'] as PosterKind[]).map(async (kind) => {
      const canvas = await drawPoster(kind, opts)
      return { kind, canvas, dataUrl: canvas.toDataURL('image/png') }
    })).then((r) => alive && setPosters(r))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, hoursKey])

  // Print just the chosen poster at its real paper size
  useEffect(() => {
    if (!printing) return
    const style = document.createElement('style')
    style.textContent = `@page { size: ${printing.kind.toUpperCase()} portrait; margin: 0 }`
    document.head.appendChild(style)
    const done = () => setPrinting(null)
    window.addEventListener('afterprint', done)
    const t = setTimeout(() => window.print(), 100)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', done)
      style.remove()
    }
  }, [printing])

  async function pdf(p: Rendered) {
    setBusy(`pdf-${p.kind}`)
    try {
      const { jsPDF } = await import('jspdf')
      const paper = PAPER[p.kind]
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: p.kind })
      doc.addImage(p.dataUrl, 'PNG', 0, 0, paper.w, paper.h, undefined, 'FAST')
      doc.save(`11th-hour-${p.kind}.pdf`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="px-4 py-6 md:px-8 print:p-0">
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-extrabold">QR code &amp; poster</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          The QR code opens <strong className="break-all text-navy">{url}</strong>. It never changes, so printed posters keep working. Scans are
          counted on the Daily totals page.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {(['a4', 'a6'] as PosterKind[]).map((kind) => {
            const p = posters.find((x) => x.kind === kind)
            return (
              <section key={kind} className="rounded-[16px] bg-white p-4 shadow-sm" aria-label={PAPER[kind].name}>
                <h2 className={`${label} text-navy`}>{PAPER[kind].name}</h2>
                <p className="text-xs text-muted">
                  {PAPER[kind].w} × {PAPER[kind].h} mm · QR {kind === 'a4' ? '10.4' : '5.2'} cm wide
                </p>
                <div className="mt-3 grid place-items-center rounded-[12px] bg-lav-100 p-4">
                  {p ? (
                    <img
                      src={p.dataUrl}
                      alt={`${PAPER[kind].name} preview: 11th Hour menu QR code with opening hours`}
                      className={`w-full shadow-md ${kind === 'a4' ? 'max-w-[320px]' : 'max-w-[220px]'}`}
                    />
                  ) : (
                    <div className="aspect-[210/297] w-full max-w-[240px] animate-pulse rounded bg-lav-200" />
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={!p} onClick={() => p && download(p.dataUrl, `11th-hour-${kind}.png`)} className={`${btnPrimary} min-h-11 px-4`}>
                    Download PNG
                  </button>
                  <button type="button" disabled={!p || busy === `pdf-${kind}`} onClick={() => p && pdf(p)} className={`${btnOutline} min-h-11 px-4 text-brand`}>
                    {busy === `pdf-${kind}` ? 'Making PDF…' : 'Download PDF'}
                  </button>
                  <button type="button" disabled={!p} onClick={() => p && setPrinting(p)} className={`${btnOutline} min-h-11 px-4 text-brand`}>
                    Print
                  </button>
                </div>
              </section>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-muted">
          Tip: print at “Actual size” / 100% (not “Fit to page”) so the QR stays the right size.
        </p>
      </div>

      {printing && (
        <div id="print-area" className="hidden print:block">
          <img src={printing.dataUrl} alt="" />
        </div>
      )}
    </main>
  )
}
