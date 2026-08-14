import type { CollectionEntry } from "astro:content";

import { ROOT_SHELVES } from "./routes.mjs";

export type Shelf = "overview" | "policy" | "research" | "design" | "decisions" | "backlog" | "root";

export const SHELVES: Record<string, string> = {
  overview: "Overview",
  policy: "Working rules",
  research: "Research",
  design: "Design",
  decisions: "Decisions",
  backlog: "Backlog",
  root: "Corpus",
};

/** Reading order on the wiki index: the overview first, then the corpus by depth of commitment. */
export const SHELF_ORDER: Shelf[] = [
  "overview",
  "policy",
  "research",
  "design",
  "decisions",
  "backlog",
  "root",
];

/** The shelf a document files under — declared for root documents, derived from the path otherwise. */
export function shelf(id: string): Shelf {
  const root = (ROOT_SHELVES as Record<string, Shelf>)[id];
  if (root) return root;
  const top = id.split("/")[0];
  return (["research", "design", "decisions", "backlog"] as const).includes(top as never)
    ? (top as Shelf)
    : "root";
}

type Heading = { depth: number; text: string; slug: string };

/**
 * Title, in order of authority: frontmatter, then the document's own H1, then the path.
 *
 * Only the ADRs carry frontmatter, so the H1 fallback is the normal case rather than the
 * exception. Falling back to the path is visibly ugly on purpose — a document with neither a
 * title nor an H1 should look wrong.
 */
export function docTitle(doc: CollectionEntry<"wiki">, headings: Heading[]): string {
  const raw = doc.data.title ?? headings.find((h) => h.depth === 1)?.text ?? doc.id ?? "";
  return stripProductSuffix(raw) || doc.id || "docs";
}

/**
 * A per-page meta description, taken from the document's own opening prose.
 *
 * Every page shipped the same site tagline before this, which tells a search result nothing about
 * which of 34 pages it is looking at. Most documents in this corpus open with a scope blockquote
 * ("Authoritative for: …"), which is the best one-line summary available and is preferred over
 * the first paragraph for exactly that reason.
 *
 * Returns null when nothing usable is found, so the caller falls back rather than emitting a
 * description built from a table row or a code fence.
 */
export function docDescription(doc: CollectionEntry<"wiki">, max = 155): string | null {
  const body = (doc.body ?? "")
    .replace(/^---\n[\s\S]*?\n---\n/, "") // frontmatter
    .replace(/<!--[\s\S]*?-->/g, ""); // html comments, including the managed markers

  // An ADR opens with Context, so the default would describe the problem rather than the ruling —
  // ADR-0006 introduced itself as "ai-cli was a Phase 0 working title", which names the rejected
  // option. What an ADR is *about* is its Decision.
  const decision = body.match(/^##\s+Decision\s*$([\s\S]*?)(?=^##\s|\Z)/m);
  if (decision) {
    // The ruling itself is often one short sentence ("The tool is named `rungs`."), so blocks are
    // joined rather than taking the first that clears the length floor — otherwise the snippet
    // starts a sentence after the decision it is meant to state.
    const joined = joinProse(decision[1], max);
    if (joined) return joined;
  }
  return firstProse(body, max);
}

function joinProse(body: string, max: number): string | null {
  const parts: string[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const text = block.trim();
    if (!text || /^(#|```|\||-{3,}|<|[-*+]\s|\d+\.\s)/.test(text)) continue;
    parts.push(stripMarkdown(text.replace(/^>\s?/gm, "")));
    if (parts.join(" ").length >= max) break;
  }
  const all = parts.join(" ").trim();
  return all.length >= 20 ? truncate(all, max) : null;
}

function firstProse(body: string, max: number): string | null {
  for (const block of body.split(/\n\s*\n/)) {
    const text = block.trim();
    if (!text) continue;
    if (/^(#|```|\||-{3,}|<)/.test(text)) continue; // heading, fence, table, rule, raw html
    if (/^[-*+]\s|^\d+\.\s/.test(text)) continue; // list — rarely reads as a summary

    const clean = stripMarkdown(text.replace(/^>\s?/gm, ""));
    if (clean.length < 40) continue; // too short to be the summary; keep looking
    return truncate(clean, max);
  }
  return null;
}

function stripMarkdown(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → their text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cut at a word boundary — a description sliced mid-word reads as broken, not as truncated. */
function truncate(s: string, max: number): string {
  // A description that ends on a colon promises a list the snippet will not show.
  const text = s.replace(/\s*:$/, ".");
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[,;:.—-]+$/, "")}…`;
}

/**
 * Drop a trailing "— rungs" from a heading.
 *
 * Root documents name the project in their H1 because they are read as files (`CLAUDE.md —
 * rungs`). On a site that is already the project, that suffix compounds: the page title came out
 * as "CLAUDE.md — rungs — rungs wiki". Only a *trailing* occurrence is stripped, so
 * ADR-0006's "The name: `rungs`, and why…" keeps its own.
 */
function stripProductSuffix(title: string): string {
  return title.replace(/\s*[—–-]\s*rungs\s*$/i, "").trim();
}
