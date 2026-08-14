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
