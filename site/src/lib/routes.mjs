/**
 * The one definition of "which repo file becomes which wiki route".
 *
 * It is imported by both `src/content.config.ts` (which decides what routes exist) and
 * `src/plugins/rehype-rungs.mjs` (which decides where a markdown link points). Those two derived
 * the slug independently at first and disagreed on the very first build — every cross-link into
 * `docs/backlog/` 404'd. One definition per concept, applied to the thing that already bit.
 *
 * `.mjs` rather than `.ts` so the rehype plugin, which Astro loads from `astro.config.mjs` before
 * any TypeScript transform is available, can import it unchanged.
 */

/**
 * Documents outside `docs/` that are admitted to the wiki: the slug each takes, and the shelf it
 * files under on the index.
 *
 * Deliberately an explicit list rather than a glob. Adding a root document to the wiki should be
 * a decision someone made, visible in one line of a diff.
 *
 * - `README.md` — the project's overview, and nothing in `docs/` restates it.
 * - `CLAUDE.md` — **this repo's canonical agent policy**, which holds the evidence rule that the
 *   contribute page argues from. Note that this inverts the output contract rungs ships for
 *   scaffolded repos (README §"What you get": `AGENTS.md` canonical, `CLAUDE.md` a one-line
 *   bridge). Here `AGENTS.md` is the bridge, so it is the one that stays unpublished — a bridge
 *   is a routing file, and publishing it would put a stub on the wiki.
 *
 * The slug is `agent-policy`, not `claude`, because ADR-0001 is about not binding this project's
 * surfaces to one vendor's filename.
 */
export const ROOT_DOCS = {
  "README.md": { slug: "overview", shelf: "overview" },
  "CLAUDE.md": { slug: "agent-policy", shelf: "policy" },
};

/** Glob patterns for the wiki collection, relative to the repo root. */
export const WIKI_PATTERNS = ["docs/**/*.md", ...Object.keys(ROOT_DOCS), "!**/node_modules/**"];

/**
 * Repo-relative markdown path → wiki slug, or `null` when the file is not on the wiki.
 *
 * A `null` is not a failure; it is how `rewriteHref` decides a link belongs on GitHub instead.
 * The empty string is a real slug — it means `/wiki/` itself.
 */
export function slugForDoc(repoRelPath) {
  const path = repoRelPath.replace(/\\/g, "/").replace(/^\.\//, "");

  if (Object.hasOwn(ROOT_DOCS, path)) return ROOT_DOCS[path].slug;
  if (!path.startsWith("docs/") || !path.endsWith(".md")) return null;

  return path
    .slice("docs/".length)
    .replace(/\.md$/, "")
    .toLowerCase()
    .replace(/(^|\/)readme$/, "")
    .replace(/\/$/, "");
}

/** Root-doc slug → its shelf, for the wiki index. Empty for everything under `docs/`. */
export const ROOT_SHELVES = Object.fromEntries(Object.values(ROOT_DOCS).map((d) => [d.slug, d.shelf]));

/** Repo-relative markdown path → site route with a trailing slash, or `null` if not on the wiki. */
export function routeForDoc(repoRelPath) {
  const slug = slugForDoc(repoRelPath);
  if (slug === null) return null;
  return slug ? `/wiki/${slug}/` : "/wiki/";
}
