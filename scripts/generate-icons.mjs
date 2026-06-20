// One-off PWA icon generator: indigo→violet gradient background with a
// white radio-broadcast glyph (two arcs + dot), written as raw PNGs with
// no external dependencies. Run: node scripts/generate-icons.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';

function crc32(buf) {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crcB]);
}

// Brand gradient endpoints (matches --color-accent → --color-brand-2)
const G_START = [0x63, 0x66, 0xf1]; // #6366f1
const G_END = [0x8b, 0x5c, 0xf6];   // #8b5cf6

function makePNG(size, { maskable = false } = {}) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB

  const cx = size / 2;
  const cy = size / 2;
  // Maskable icons need the glyph inside the 80% safe zone
  const glyphScale = maskable ? 0.78 : 1;

  const px = [];
  for (let y = 0; y < size; y++) {
    px.push(0); // filter byte per scanline
    for (let x = 0; x < size; x++) {
      // 135° gradient background, full bleed
      const t = (x + y) / (2 * size);
      const bg = [
        Math.round(G_START[0] + (G_END[0] - G_START[0]) * t),
        Math.round(G_START[1] + (G_END[1] - G_START[1]) * t),
        Math.round(G_START[2] + (G_END[2] - G_START[2]) * t),
      ];

      // Anchor the dot below center so the arc+dot mass is visually centered
      const dx = (x - cx) / glyphScale;
      const dy = (y - (cy + size * 0.13)) / glyphScale;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx); // -PI..PI, 0 = right, -PI/2 = up

      const rOuter = size * 0.34;
      const rInner = size * 0.22;
      const stroke = size * 0.045;
      const rDot = size * 0.075;

      // Arcs open upward: keep points whose angle is within ±55° of straight up
      const upDelta = Math.abs(angle + Math.PI / 2);
      const inArcSpan = upDelta < Math.PI * 0.42;

      const onOuter = inArcSpan && Math.abs(dist - rOuter) <= stroke;
      const onInner = inArcSpan && Math.abs(dist - rInner) <= stroke;
      const inDot = dist <= rDot;

      if (onOuter || onInner || inDot) px.push(255, 255, 255);
      else px.push(bg[0], bg[1], bg[2]);
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(px), { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync('public/icons', { recursive: true });
fs.writeFileSync('public/icons/icon-192.png', makePNG(192));
fs.writeFileSync('public/icons/icon-512.png', makePNG(512));
fs.writeFileSync('public/icons/icon-maskable-192.png', makePNG(192, { maskable: true }));
fs.writeFileSync('public/icons/icon-maskable-512.png', makePNG(512, { maskable: true }));
console.log('icons written to public/icons/');
