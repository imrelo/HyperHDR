// Generates the extension icon set. No dependencies — writes PNG by hand using
// the zlib module Node already ships with.
//
//   node tools/gen-icons.js
//
// Design: a dark rounded tile with a spectrum band across the middle, which is
// what an ambilight strip looks like when it is doing its job.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT_DIR = path.join(__dirname, "..", "icons");
const SIZES = [16, 32, 48, 128];

// ---------------------------------------------------------------------------
// Minimal PNG writer (8-bit RGBA, no interlacing)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // colour type: RGBA
  ihdr[10] = 0;   // deflate
  ihdr[11] = 0;   // adaptive filtering
  ihdr[12] = 0;   // no interlace

  // each scanline is prefixed with its filter type; 0 = None
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// ---------------------------------------------------------------------------
// Artwork
// ---------------------------------------------------------------------------
const BG = [17, 20, 34];          // near-black navy
const STOPS = [                    // spectrum across the band
  [255, 62, 84],
  [255, 176, 46],
  [126, 231, 135],
  [64, 196, 255],
  [163, 122, 255]
];

function lerp(a, b, t) { return a + (b - a) * t; }

function spectrum(t) {
  const x = Math.min(0.9999, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}

// signed distance to a rounded rectangle, used for both the tile and the band
function roundRectSdf(px, py, halfW, halfH, r) {
  const qx = Math.abs(px) - (halfW - r);
  const qy = Math.abs(py) - (halfH - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const tileHalf = size * 0.46;
  const tileRadius = size * 0.22;

  // band geometry: a wide, short rounded bar through the middle
  const bandHalfW = size * 0.34;
  const bandHalfH = size * 0.13;
  const bandRadius = bandHalfH;

  // anti-aliasing width, in pixels
  const aa = Math.max(0.8, size / 48);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5 - c;
      const py = y + 0.5 - c;

      const tile = roundRectSdf(px, py, tileHalf, tileHalf, tileRadius);
      const tileA = Math.min(1, Math.max(0, 0.5 - tile / aa));
      if (tileA <= 0) continue;   // outside the tile stays transparent

      // vertical falloff makes the tile read as lit from the band outward
      const glow = Math.max(0, 1 - Math.abs(py) / (size * 0.42));
      let r = BG[0] + glow * 10;
      let g = BG[1] + glow * 12;
      let b = BG[2] + glow * 26;

      const band = roundRectSdf(px, py, bandHalfW, bandHalfH, bandRadius);
      const bandA = Math.min(1, Math.max(0, 0.5 - band / aa));
      if (bandA > 0) {
        const [sr, sg, sb] = spectrum((px + bandHalfW) / (bandHalfW * 2));
        r = lerp(r, sr, bandA);
        g = lerp(g, sg, bandA);
        b = lerp(b, sb, bandA);
      } else {
        // soft spill of the band colour onto the tile beneath it
        const spill = Math.max(0, 1 - band / (size * 0.3)) * 0.35;
        if (spill > 0) {
          const [sr, sg, sb] = spectrum((px + bandHalfW) / (bandHalfW * 2));
          r = lerp(r, sr, spill);
          g = lerp(g, sg, spill);
          b = lerp(b, sb, spill);
        }
      }

      const o = (y * size + x) * 4;
      rgba[o] = Math.round(Math.min(255, Math.max(0, r)));
      rgba[o + 1] = Math.round(Math.min(255, Math.max(0, g)));
      rgba[o + 2] = Math.round(Math.min(255, Math.max(0, b)));
      rgba[o + 3] = Math.round(tileA * 255);
    }
  }
  return rgba;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = path.join(OUT_DIR, `icon${size}.png`);
  fs.writeFileSync(file, encodePng(size, size, render(size)));
  console.log(`wrote ${path.relative(process.cwd(), file)}  (${size}x${size})`);
}
