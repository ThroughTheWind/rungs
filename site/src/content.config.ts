import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * The wiki is the repo's own documents, read in place from `../docs`. There is no copy and no
 * sync step — a second copy of the corpus is a second thing to go stale, and staleness is the
 * failure this project exists to argue against.
 *
 * Most documents have no frontmatter at all (the ADRs are the exception), so every field is
 * optional and the title falls back to the first H1. A schema that rejected them would only
 * push authoring cost onto the corpus.
 */
const wiki = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/node_modules/**"],
    base: "../docs",
    // Must match rewriteHref() in src/plugins/rehype-rungs.mjs exactly, or cross-links 404.
    generateId: ({ entry }) =>
      entry
        .replace(/\.md$/, "")
        .toLowerCase()
        .replace(/(^|\/)readme$/, "")
        .replace(/\/$/, ""),
  }),
  schema: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    status: z.enum(["accepted", "proposed", "superseded", "rejected"]).optional(),
    // TEMPLATE.md files are part of the corpus — contributors link to them — and they carry a
    // literal `YYYY-MM-DD` placeholder. Allowing exactly that token keeps them in the wiki
    // without loosening the field: any other malformed date still fails the build.
    date: z.union([z.coerce.date(), z.literal("YYYY-MM-DD")]).optional(),
  }),
});

export const collections = { wiki };
