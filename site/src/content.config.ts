import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { WIKI_PATTERNS, slugForDoc } from "./lib/routes.mjs";

/**
 * The wiki is the repo's own documents, read in place from the repo root. There is no copy and
 * no sync step — a second copy of the corpus is a second thing to go stale, and staleness is the
 * failure this project exists to argue against.
 *
 * The base is `..`, not `../docs`, so the root `README.md` can be published alongside the corpus.
 * Which root files are admitted is an explicit list in `lib/routes.mjs`, not a glob.
 *
 * Most documents have no frontmatter at all (the ADRs are the exception), so every field is
 * optional and the title falls back to the first H1. A schema that rejected them would only
 * push authoring cost onto the corpus.
 */
const wiki = defineCollection({
  loader: glob({
    pattern: WIKI_PATTERNS,
    base: "..",
    generateId: ({ entry }) => {
      const slug = slugForDoc(entry);
      // Unreachable via WIKI_PATTERNS. If it ever fires, the patterns and the slug rule have
      // drifted apart, and a silently mis-routed document is worse than a failed build.
      if (slug === null) throw new Error(`content.config: ${entry} matched the wiki glob but has no route.`);
      return slug;
    },
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
