// Square-crops and compresses the original dish photos for slow mobile data.
// Put originals in ./photos-original named:
//   jollof-rice.*  gari-beans.*  ampesi.*  fried-rice.*
// Run: npm run optimize-images   → writes ./public/images/<name>.jpg (~40–70 KB each)
import sharp from 'sharp'
import { readdir, mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = 'photos-original'
const OUT = 'public/images'
await mkdir(OUT, { recursive: true })

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp|heic|avif)$/i.test(f))
if (!files.length) {
  console.log(`No photos found in ${SRC}/`)
  process.exit(0)
}
for (const f of files) {
  const name = path.parse(f).name.toLowerCase()
  const out = path.join(OUT, `${name}.jpg`)
  await sharp(path.join(SRC, f))
    .rotate()
    .resize(640, 640, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 72, mozjpeg: true, progressive: true })
    .toFile(out)
  console.log(`✓ ${out}`)
}
