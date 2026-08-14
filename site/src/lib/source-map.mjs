/**
 * slug → the repo file it was rendered from.
 *
 * The wiki needs to state each page's source path, and it must be the *real* one: slugs are
 * lowercased, so `decisions/adr-0006-the-name` cannot be turned back into
 * `docs/decisions/ADR-0006-the-name.md` by string manipulation. Guessing produces a path that
 * looks right, resolves on Windows, and 404s on Linux — and a wrong provenance line on this site
 * is worse than none, because the whole page is an argument that provenance is checked.
 *
 * So the map is built by walking the same files the collection loads and applying the same
 * `slugForDoc`. It cannot drift from the routing, and a collision fails the build rather than
 * silently dropping a document.
 */
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ROOT_DOCS, slugForDoc } from "./routes.mjs";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url)).replace(/\\/g, "/").replace(/\/$/, "");

function walk(relDir) {
  const out = [];
  for (const e of readdirSync(`${ROOT}/${relDir}`, { withFileTypes: true })) {
    const rel = `${relDir}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(rel));
    else if (e.name.endsWith(".md")) out.push(rel);
  }
  return out;
}

const bySlug = new Map();
for (const path of [...Object.keys(ROOT_DOCS), ...walk("docs")]) {
  const slug = slugForDoc(path);
  if (slug === null) continue;
  const clash = bySlug.get(slug);
  if (clash) throw new Error(`source-map: ${path} and ${clash} both resolve to /wiki/${slug} — slugs must be unique.`);
  bySlug.set(slug, path);
}

/** Repo-relative path for a wiki slug, or null if the slug is not a rendered document. */
export function sourceFor(slug) {
  return bySlug.get(slug) ?? null;
}
