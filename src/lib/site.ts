/** The fixed public site URL encoded in QR codes. */
export function siteOrigin(): string {
  const fixed = import.meta.env.VITE_PUBLIC_SITE_URL?.trim()
  return (fixed || window.location.origin).replace(/\/+$/, '')
}

export const menuQrUrl = () => `${siteOrigin()}/?src=qr`
export const scanUrl = (orderId: string) => `${siteOrigin()}/staff/scan/${orderId}`

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/** Pulls the order uuid out of a scanned /staff/scan/<uuid> link (or a bare uuid). */
export function orderIdFromScan(text: string): string | null {
  const m = text.match(UUID_RE)
  return m ? m[0].toLowerCase() : null
}
