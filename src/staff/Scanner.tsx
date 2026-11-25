import { useEffect, useRef, useState } from 'react'
import { orderIdFromScan } from '../lib/site'
import { CloseIcon } from '../components/icons'

/** Camera QR scanner (html5-qrcode is loaded only when this opens). */
export function Scanner({ onResult, onClose }: { onResult: (orderId: string) => void; onClose: () => void }) {
  const [msg, setMsg] = useState('Starting camera…')
  const done = useRef(false)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const cb = useRef({ onResult, onClose })
  cb.current = { onResult, onClose }

  useEffect(() => {
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cb.current.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let scanner: import('html5-qrcode').Html5Qrcode | null = null
    let cancelled = false
    ;(async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (cancelled) return
        scanner = new Html5Qrcode('qr-reader', { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false })
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (w, h) => {
            const s = Math.floor(Math.min(w, h) * 0.7)
            return { width: s, height: s }
          } },
          (text) => {
            if (done.current) return
            const id = orderIdFromScan(text)
            if (!id) {
              setMsg("That isn't an 11th Hour order code.")
              return
            }
            done.current = true
            navigator.vibrate?.(80)
            scanner?.stop().catch(() => undefined).finally(() => cb.current.onResult(id))
          },
          () => undefined,
        )
        if (cancelled) {
          await scanner.stop().catch(() => undefined)
          return
        }
        setMsg("Point the camera at the customer's order QR code.")
      } catch (e) {
        const text = String(e)
        setMsg(
          /Permission|NotAllowed/i.test(text)
            ? 'Camera permission was blocked. Allow camera access in the browser settings, or search by order number.'
            : "Couldn't start the camera. Search by order number instead.",
        )
      }
    })()
    return () => {
      cancelled = true
      if (scanner?.isScanning) scanner.stop().catch(() => undefined)
    }
  }, [])

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="scan-title" className="fixed inset-0 z-50 flex flex-col bg-navy/95 p-4 text-white">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <h2 id="scan-title" className="font-display text-lg font-extrabold">
          Scan order code
        </h2>
        <button ref={closeBtn} type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Close scanner">
          <CloseIcon />
        </button>
      </div>
      <div className="mx-auto mt-4 w-full max-w-md overflow-hidden rounded-[18px] bg-black">
        <div id="qr-reader" className="w-full" />
      </div>
      <p aria-live="polite" className="mx-auto mt-4 max-w-md text-center text-sm text-white/90">
        {msg}
      </p>
    </div>
  )
}
