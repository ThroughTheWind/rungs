import type { CollectionEntry } from "astro:content";

export type Shelf = "research" | "design" | "decisions" | "backlog" | "root";

export const SHELVES: Record<string, string> = {
  research: "Research",
  design: "Design",
  decisions: "Decisions",
  backlog: "Backlog",
  root: "Corpus",
};

/** The top-level directory under docs/ a document sits in. */
export function shelf(id: string): Shelf {
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
  if (doc.data.title) return doc.data.title;
  const h1 = headings.find((h) => h.depth === 1);
  if (h1) return h1.text;
  return doc.id || "docs";
}
