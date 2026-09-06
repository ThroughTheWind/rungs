import claims from "./generated/claims.json";

/**
 * The dated facts the site states. **Counts are no longer among them** (WI-051).
 *
 * This file used to carry `gates: { registered: 20, … }` under a note saying typed numbers are the
 * thing this repo has the most scar tissue about, and a `TODO (generate-derivable)`. The registry
 * reached 22 and the sentence stayed at 20 — the exact failure the note described, on the page that
 * argues rungs prevents it. `asOf` did its job: it was a stale number you could see. It was still
 * stale.
 *
 * What is left here is what a file can honestly hold: the outcome of **one run**, on a stated date.
 * `pass`/`fail`/`unimplemented` are not properties of the repo, they are what happened when someone
 * executed it, and deriving them would mean running the runner from inside a gate the runner runs.
 * Everything structural — how many gates are registered, which modules exist, what each profile
 * installs — comes from `generated/claims.json`, written by `npm run claims` and refused by the
 * `site-claims-current` gate when it drifts.
 */
export const SITE = {
  name: "rungs",
  tagline: "Installs and maintains a repository's agentic development system.",
  repo: "https://github.com/ThroughTheWind/rungs",
  npm: "https://www.npmjs.com/package/@rungs/cli",

  /** The date the recorded run was taken. Generated, absolute, never relative. */
  asOf: claims.run.at,

  phase: {
    label: "Phase 6 in progress",
    detail:
      "Phases 0–5 complete · research, synthesis, ADRs 0001–0006, fifteen modules, the CLI. Phase 6: detection verified against all four source repos; a real install into one is outstanding.",
  },

  /**
   * Structural: derived, gated, never typed.
   * `hooks` is separate because a hook fires on a tool call rather than in the runner, so it is
   * registered and does not appear in a `rungs check` total. Two true numbers that would read as a
   * contradiction if added together.
   */
  registered: claims.gateCount,
  hooks: claims.hookCount,
  /** Explain-only detectors (ADR-0011): registered, run by `doctor --explain` alone, never by `check`. */
  explainOnly: claims.reportOnlyCount,
  modules: claims.modules,
  profiles: claims.profiles,

  /**
   * One `rungs check` run, captured by `npm run claims` on `asOf`.
   *
   * Generated rather than typed for a reason measured during WI-051: written by hand as `22 pass`,
   * it sat beside a freshly *derived* `23 gates register` within minutes — two numbers from the same
   * page disagreeing about the same repo on the same day. A run result cannot be derived by the
   * gate that checks it (that would be the runner calling itself), so it is captured by the manual
   * step instead, where recursion is not a risk.
   */
  run: claims.run,

} as const;

export const NAV = [
  { href: "/wiki/", label: "Wiki" },
  { href: "/versions/", label: "Versions" },
  { href: "/contribute/", label: "Contribute" },
  { href: SITE.npm, label: "npm package", external: true },
  { href: SITE.repo, label: "GitHub", external: true },
] as const;
