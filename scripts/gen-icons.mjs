/**
 * Generates placeholder PWA icons using only Node built-ins (zlib).
 * Outputs solid #16a34a squares: icon-192.png, icon-512.png, icon-512-maskable.png
 * Run: node scripts/gen-icons.mjs  (or: npm run gen-icons)
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return (buf) => {
    let c = 0xffffffff
    for (const b of buf) c = (c >>> 8) ^ t[(c ^ b) & 0xff]
    return (c ^ 0xffffffff) >>> 0
  }
})()

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const tb = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(Buffer.concat([tb, data])))
  return Buffer.concat([len, tb, data, crc])
}

function makePNG(size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB
  const row = Buffer.alloc(1 + size * 3)
  for (let x = 0; x < size; x++) { row[1 + x*3] = r; row[2 + x*3] = g; row[3 + x*3] = b }
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const GREEN = [0x16, 0xa3, 0x4a]
writeFileSync(join(outDir, 'icon-192.png'),          makePNG(192, GREEN))
writeFileSync(join(outDir, 'icon-512.png'),          makePNG(512, GREEN))
writeFileSync(join(outDir, 'icon-512-maskable.png'), makePNG(512, GREEN))
console.log('Icons written to public/icons/')
