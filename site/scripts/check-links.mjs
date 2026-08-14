#!/usr/bin/env node
/**
 * Gate: every internal link in the built site resolves to a route that exists, and every
 * same-page anchor resolves to an id that exists.
 *
 * This exists because the wiki's routes are derived twice — once by `generateId` in
 * content.config.ts and once by `rewriteHref` in rehype-rungs.mjs — and the two must agree
 * exactly. They disagreed on the first build. A slug scheme that drifts produces links that look
 * right in the markdown and 404 on the site, which is precisely the silent failure this repo
 * treats as the expensive kind.
 *
 * Exit 0 or 1, no logging beyond the report. Run after `npm run build`.
 */
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(dirname(fileURLToPath(import.meta.url))), "dist");

if (!existsSync(DIST)) {
  console.error("check-links: no dist/ — run `npm run build` first.");
  process.exit(1);
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const norm = (p) => (p.endsWith("/") ? p : `${p}/`);
const routeOf = (file) => norm("/" + relative(DIST, file).replace(/\\/g, "/").replace(/index\.html$/, ""));

const files = await walk(DIST);
const routes = new Set(files.map(routeOf));

const broken = [];
let checked = 0;

for (const file of files) {
  const html = await readFile(file, "utf8");
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const self = routeOf(file);

  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    if (m[1].startsWith("/_astro/")) continue; // build assets, not routes
    const [path, hash] = m[1].split("#");
    checked++;
    const target = norm(path);
    if (!routes.has(target)) broken.push(`${relative(DIST, file)} → ${m[1]}  (no such route)`);
    else if (hash && target === self && !ids.has(hash)) {
      broken.push(`${relative(DIST, file)} → #${hash}  (no such anchor)`);
    }
  }
}

console.log(`check-links: ${routes.size} routes, ${checked} internal links, ${broken.length} broken`);
for (const b of broken) console.log(`  ${b}`);
process.exit(broken.length ? 1 : 0);
