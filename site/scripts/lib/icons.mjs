/**
 * Render the design system's bar mark (`design_system/export/assets/logo.svg`) into the raster
 * formats a browser tab needs, with no image dependency.
 *
 * The mark is five axis-aligned rectangles, so "rasterising" it is exact arithmetic: a pixel's
 * coverage is the area of its overlap with each rect. That is the whole reason this file can
 * exist without a renderer — and the reason `parseRectSvg` refuses anything that is not a rect.
 * A future mark with a `<path>` in it must fail here loudly rather than emit five blank bars that
 * still look like a favicon at 16px.
 *
 * Exported: parseRectSvg, rasterize, encodePng, encodeIco, themedSvg.
 */
import { deflateSync } from "node:zlib";

/** Parse a flat `<rect>`-only SVG. Throws on anything it cannot render exactly. */
export function parseRectSvg(source, label = "logo.svg") {
  const box = source.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!box) throw new Error(`${label}: no \`viewBox="0 0 w h"\` — cannot scale the mark.`);
  const [w, h] = [Number(box[1]), Number(box[2])];

  const rects = [...source.matchAll(/<rect\b([^>]*)>/g)].map((m) => {
    const attr = (n, dflt) => {
      const v = m[1].match(new RegExp(`${n}="(-?\\d+(?:\\.\\d+)?)"`));
      if (!v && dflt === undefined) throw new Error(`${label}: <rect> without ${n}=.`);
      return v ? Number(v[1]) : dflt;
    };
    return { x: attr("x", 0), y: attr("y", 0), w: attr("width"), h: attr("height") };
  });

  if (!rects.length) throw new Error(`${label}: no <rect> elements found.`);
  const leftover = source
    .replace(/<!--[\s\S]*?-->|<\?xml[^>]*\?>/g, "")
    .replace(/<svg[^>]*>|<\/svg>|<rect\b[^>]*>|<\/rect>/g, "")
    .trim();
  if (leftover) {
    throw new Error(`${label}: contains markup this renderer cannot draw (${leftover.slice(0, 60)}…). Rectangles only.`);
  }

  return { width: w, height: h, rects };
}

/**
 * Coverage map of the mark at `size`×`size`, as Float64 alpha in [0,1] per pixel.
 * Analytic box coverage — no supersampling, no seams between adjacent bars.
 */
export function rasterize({ width, height, rects }, size) {
  const sx = size / width;
  const sy = size / height;
  const a = new Float64Array(size * size);
  const overlap = (lo, hi, rLo, rHi) => Math.max(0, Math.min(hi, rHi) - Math.max(lo, rLo));

  for (const r of rects) {
    for (let py = 0; py < size; py++) {
      const cy = overlap(py / sy, (py + 1) / sy, r.y, r.y + r.h) * sy;
      if (cy <= 0) continue;
      for (let px = 0; px < size; px++) {
        const cx = overlap(px / sx, (px + 1) / sx, r.x, r.x + r.w) * sx;
        if (cx <= 0) continue;
        const i = py * size + px;
        a[i] = Math.min(1, a[i] + cx * cy);
      }
    }
  }
  return a;
}

const hex = (s) => {
  const m = s.match(/^#([0-9a-f]{6})$/i);
  if (!m) throw new Error(`not a #rrggbb colour: ${s}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
};

/** Composite a coverage map over an opaque ground: RGB8, row-major. */
function composite(alpha, size, inkHex, groundHex, inset = 0) {
  const ink = hex(inkHex);
  const ground = hex(groundHex);
  const out = Buffer.alloc(size * size * 3);
  const inner = size - inset * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ix = x - inset;
      const iy = y - inset;
      const a = ix >= 0 && iy >= 0 && ix < inner && iy < inner ? alpha[iy * inner + ix] : 0;
      const o = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(ground[c] + (ink[c] - ground[c]) * a);
    }
  }
  return out;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Opaque 8-bit RGB PNG. Deterministic: same input bytes in, same file out. */
export function encodePng(mark, size, { ink, ground, inset = 0 }) {
  const drawn = size - inset * 2;
  const rgb = composite(rasterize(mark, drawn), size, ink, ground, inset);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ICO container holding PNG-compressed entries (the Vista+ form; every current browser reads it). */
export function encodeIco(entries) {
  const header = Buffer.alloc(6 + entries.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  let offset = header.length;
  entries.forEach(({ size, png }, i) => {
    const e = 6 + i * 16;
    header[e] = size >= 256 ? 0 : size;
    header[e + 1] = size >= 256 ? 0 : size;
    header[e + 2] = 0; // palette size
    header[e + 3] = 0;
    header.writeUInt16LE(1, e + 4); // colour planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(png.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });

  return Buffer.concat([header, ...entries.map((e) => e.png)]);
}

/**
 * The mark as an SVG favicon that follows the browser chrome's theme.
 *
 * `currentColor` is what the export ships and what inline use wants, but a favicon has no
 * inherited colour — so this build pins both inks explicitly. Same geometry, one source.
 */
export function themedSvg(mark, { ink, inkDark }) {
  const rects = mark.rects
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`)
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${mark.width} ${mark.height}">` +
    `<style>rect{fill:${ink}}@media(prefers-color-scheme:dark){rect{fill:${inkDark}}}</style>` +
    `${rects}</svg>\n`
  );
}
