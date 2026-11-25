// Quick command-line QR for the menu link (the dashboard has a nicer poster).
// Run: npm run qr -- https://your-site.vercel.app
import QRCode from 'qrcode'

const base = process.argv[2]
if (!base) {
  console.error('Usage: npm run qr -- https://your-site.vercel.app')
  process.exit(1)
}
const url = new URL('/', base)
url.searchParams.set('src', 'qr')
await QRCode.toFile('menu-qr.png', url.toString(), {
  errorCorrectionLevel: 'M',
  width: 1200,
  margin: 4,
  color: { dark: '#140D48', light: '#FFFFFF' },
})
console.log(`Saved menu-qr.png → ${url}`)
