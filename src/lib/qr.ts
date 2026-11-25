// Lazy-loaded so the qrcode library is only downloaded when a QR is shown.
export const QR_DARK = '#140D48'

export async function qrSvg(text: string): Promise<string> {
  const QR = await import('qrcode')
  return QR.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: QR_DARK, light: '#FFFFFF' },
  })
}

export async function qrCanvas(text: string, size: number): Promise<HTMLCanvasElement> {
  const QR = await import('qrcode')
  const canvas = document.createElement('canvas')
  await QR.toCanvas(canvas, text, {
    errorCorrectionLevel: 'Q',
    margin: 0,
    width: size,
    color: { dark: QR_DARK, light: '#FFFFFF' },
  })
  return canvas
}
