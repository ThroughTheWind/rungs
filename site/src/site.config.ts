/**
 * Every dated fact the site states, in one place.
 *
 * These are typed numbers, which is the thing this repo has the most scar tissue about —
 * `rift-forge` shipped seven false population claims out of eleven because the numbers moved and
 * the sentences did not. So: one definition, and a follow-up to derive them.
 *
 * TODO (`generate-derivable`): `gates` and `phase` should come from `npx @rungs/cli check --json` and
 * the README at build time, not from this file. Until they do, `asOf` is what makes them safe to
 * read — a stale number with a visible date is a stale number you can see.
 */
export const SITE = {
  name: "rungs",
  tagline: "Installs and maintains a repository's agentic development system.",
  repo: "https://github.com/ThroughTheWind/rungs",

  /** The date every measurement below was taken. Absolute, never relative. */
  asOf: "2026-08-14",

  phase: {
    label: "Phase 5 in progress",
    detail: "Phases 0–4 complete · research, synthesis, ADRs 0001–0006, all fifteen modules authored",
  },

  /** From `rungs check` on 2026-08-14: "20 pass · 0 fail · 0 unimplemented · 0 error". */
  gates: { registered: 20, withEngines: 20, pass: 20, fail: 0, unimplemented: 0 },

  /** ADR-0006's open consequence. It is on the site because it is unresolved, not despite it. */
  openTrigger:
    "The managed-marker prefix is the product name, so renaming would orphan every block already written into a scaffolded repo — ADR-0006's open follow-up.",
} as const;

export const NAV = [
  { href: "/wiki/", label: "Wiki" },
  { href: "/contribute/", label: "Contribute" },
  { href: SITE.repo, label: "GitHub", external: true },
] as const;
