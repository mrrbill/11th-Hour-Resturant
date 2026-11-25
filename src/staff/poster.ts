import { qrCanvas } from '../lib/qr'

export type PosterKind = 'a4' | 'a6'

/** Paper sizes in mm and the pixel width we render at. */
export const PAPER: Record<PosterKind, { w: number; h: number; px: number; name: string }> = {
  a4: { w: 210, h: 297, px: 1654, name: 'A4 poster' }, // ≈200 dpi
  a6: { w: 105, h: 148, px: 1240, name: 'A6 table card' }, // ≈300 dpi
}

const C = {
  indigo: '#24178A',
  navy: '#140D48',
  orange: '#FF8A1F',
  pink: '#E8459B',
  white: '#FFFFFF',
}

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('800 40px Montserrat'),
      document.fonts.load('700 40px Montserrat'),
      document.fonts.load('500 40px Inter'),
    ])
  } catch {
    /* fall back to system fonts */
  }
}

function spaced(g: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const widths = [...text].map((ch) => g.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1)
  let x = cx - total / 2
  const prev = g.textAlign
  g.textAlign = 'left'
  ;[...text].forEach((ch, i) => {
    g.fillText(ch, x, y)
    x += widths[i] + spacing
  })
  g.textAlign = prev
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

function circle(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.fillStyle = color
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
}

/**
 * Draws the poster. The layout is designed in A6 millimetres and scaled up
 * for A4 (A4 is exactly 2× A6), so both look identical.
 * QR is 52 mm on A6 and 104 mm on A4 — well above the 4 cm minimum.
 */
export async function drawPoster(
  kind: PosterKind,
  opts: { url: string; hours: { label: string; value: string }[]; siteText: string },
): Promise<HTMLCanvasElement> {
  await fontsReady()
  const paper = PAPER[kind]
  const W = paper.px
  const H = Math.round((paper.px * paper.h) / paper.w)
  const k = W / 105 // px per "A6 mm"
  const mm = (v: number) => v * k

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!
  g.textBaseline = 'alphabetic'
  g.textAlign = 'center'

  // Background + decorative circles
  g.fillStyle = C.indigo
  g.fillRect(0, 0, W, H)
  circle(g, W + mm(4), mm(-4), mm(22), C.orange)
  circle(g, W - mm(26), mm(-2), mm(9), C.pink)
  circle(g, mm(-6), H + mm(6), mm(20), C.pink)
  circle(g, mm(24), H - mm(3), mm(4.5), C.orange)

  const cx = W / 2

  // Title
  g.fillStyle = C.white
  g.font = `800 ${mm(13)}px Montserrat, Arial, sans-serif`
  g.fillText('11TH HOUR', cx, mm(22))
  g.font = `700 ${mm(5)}px Montserrat, Arial, sans-serif`
  spaced(g, 'MENU', cx, mm(30), mm(2.6))

  // QR on a white rounded square
  const card = 64
  const qr = 52
  const cardX = cx - mm(card / 2)
  const cardY = mm(35)
  g.fillStyle = C.white
  roundRect(g, cardX, cardY, mm(card), mm(card), mm(5))
  g.fill()
  const qrPx = Math.round(mm(qr))
  const q = await qrCanvas(opts.url, qrPx)
  g.imageSmoothingEnabled = false
  g.drawImage(q, Math.round(cx - qrPx / 2), Math.round(cardY + mm((card - qr) / 2)), qrPx, qrPx)
  g.imageSmoothingEnabled = true

  // Call to action
  g.fillStyle = C.white
  g.font = `800 ${mm(4.6)}px Montserrat, Arial, sans-serif`
  g.fillText('Scan to see the menu & order', cx, mm(107))

  // Orange pill
  const pillW = 78
  g.fillStyle = C.orange
  roundRect(g, cx - mm(pillW / 2), mm(110.5), mm(pillW), mm(8), mm(4))
  g.fill()
  g.fillStyle = C.navy
  g.font = `700 ${mm(3.4)}px Montserrat, Arial, sans-serif`
  g.fillText('Pay at the counter when you collect', cx, mm(115.8))

  // Opening hours
  g.fillStyle = C.white
  g.font = `700 ${mm(2.8)}px Montserrat, Arial, sans-serif`
  spaced(g, 'OPENING HOURS', cx, mm(125), mm(0.8))

  const rows = opts.hours.slice(0, 7)
  const top = 127.5
  const bottom = 141
  const rowH = Math.min(5, (bottom - top) / Math.max(rows.length, 1))
  const left = cx - mm(36)
  const right = cx + mm(36)
  rows.forEach((r, i) => {
    const y = mm(top + rowH * (i + 0.72))
    g.font = `500 ${mm(Math.min(3, rowH * 0.62))}px Inter, Arial, sans-serif`
    g.textAlign = 'left'
    g.fillText(r.label, left, y)
    g.font = `700 ${mm(Math.min(3, rowH * 0.62))}px Montserrat, Arial, sans-serif`
    g.textAlign = 'right'
    g.fillText(r.value, right, y)
    if (i < rows.length - 1) {
      g.save()
      g.strokeStyle = 'rgba(255,255,255,0.55)'
      g.lineWidth = Math.max(1, mm(0.25))
      g.setLineDash([mm(1), mm(0.8)])
      g.beginPath()
      g.moveTo(left, mm(top + rowH * (i + 1)))
      g.lineTo(right, mm(top + rowH * (i + 1)))
      g.stroke()
      g.restore()
    }
  })
  g.textAlign = 'center'

  // Site address (for people who can't scan)
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.font = `500 ${mm(2.6)}px Inter, Arial, sans-serif`
  g.fillText(opts.siteText, cx, mm(145))

  return canvas
}
