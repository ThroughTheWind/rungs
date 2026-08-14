#!/usr/bin/env node
/**
 * Emit .br and .gz siblings for every compressible file in dist/.
 *
 * `sirv --gzip --brotli` does not compress on the fly — it looks for `index.html.br` next to
 * `index.html` and serves that when the client accepts it. Without this step those flags are
 * no-ops, which is what the site was shipping: a text-heavy corpus sent uncompressed.
 *
 * Build-time compression can afford settings a request-time compressor cannot, so brotli runs at
 * quality 11. Already-compressed formats (woff2, png, webp) are skipped — recompressing them
 * costs build time and usually makes them bigger.
 *
 * No dependency: node:zlib has both codecs.
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { brotliCompress, gzip, constants } from "node:zlib";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const br = promisify(brotliCompress);
const gz = promisify(gzip);

const DIST = join(dirname(dirname(fileURLToPath(import.meta.url))), "dist");

/** Text formats only. woff2/png/webp/ico are already compressed. */
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".mjs", ".json", ".svg", ".xml", ".txt", ".map"]);

/** Below this, the headers cost more than the saving and sirv still has to stat two extra files. */
const MIN_BYTES = 1024;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (COMPRESSIBLE.has(extname(e.name))) out.push(p);
  }
  return out;
}

const files = await walk(DIST);

let raw = 0;
let brotli = 0;
let gzipped = 0;
let written = 0;
let skipped = 0;

await Promise.all(
  files.map(async (file) => {
    const source = await readFile(file);
    if (source.byteLength < MIN_BYTES) {
      skipped++;
      return;
    }

    const [b, g] = await Promise.all([
      br(source, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11,
          [constants.BROTLI_PARAM_SIZE_HINT]: source.byteLength,
        },
      }),
      gz(source, { level: 9 }),
    ]);

    // Only keep a variant that actually wins. A .br larger than the original would be served
    // in preference to it, which is a pessimisation dressed as an optimisation.
    const keep = [];
    if (b.byteLength < source.byteLength) keep.push([`${file}.br`, b]);
    if (g.byteLength < source.byteLength) keep.push([`${file}.gz`, g]);
    if (!keep.length) {
      skipped++;
      return;
    }

    await Promise.all(keep.map(([path, body]) => writeFile(path, body)));
    written += keep.length;
    raw += source.byteLength;
    brotli += b.byteLength;
    gzipped += g.byteLength;
  }),
);

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
const pct = (n) => `${((1 - n / raw) * 100).toFixed(0)}%`;

console.log(
  `precompress: ${files.length - skipped} files, ${written} variants written · ` +
    `raw ${kb(raw)} → br ${kb(brotli)} (${pct(brotli)} off) · gzip ${kb(gzipped)} (${pct(gzipped)} off)` +
    (skipped ? ` · ${skipped} skipped (< ${MIN_BYTES}B or no gain)` : ""),
);
