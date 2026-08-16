---
id: WI-051
title: Stop typing the site's gate and status numbers by hand
type: feature
status: done
branch: feature/WI-051-derive-site-claims
created: 2026-08-16
updated: 2026-08-16
related: [WI-048, WI-046, F-011]
epic: WI-048
children: []
---

## Proposal (rationale)

Acts on **claim 11** of the [second external review](../../design/external-review-2026-08-16b.md) —
the category, not the instance. The reviewer said the deployed site was stale and named artifacts
that are not there; the live page was fetched on 2026-08-16 and is current. **But a number on it is
stale, and they looked past it:**

> `20 gates register, all 20 have engines · 2026-08-15 · npx @rungs/cli check`

`rungs check` reports **21** since [WI-044](../archive/WI-044-resolve-open-findings.md) added
`site-vendored-unedited`. The figure is typed into
[`site/src/site.config.ts`](../../../site/src/site.config.ts) — whose own header comment reads:

> *These are typed numbers, which is the thing this repo has the most scar tissue about — `rift-forge`
> shipped seven false population claims out of eleven because the numbers moved and the sentences did
> not. So: one definition, and a follow-up to derive them.*
>
> `TODO (generate-derivable)`

The follow-up is this item. The dated `asOf` worked exactly as designed — a stale number you can
see — but "visibly stale" is a mitigation, not a fix, on the page that argues rungs prevents this.

The landing page carries a second hand-kept inventory with the same problem: a 15-entry `MODULES`
array with its own `TODO (generate-derivable)`, and a `PROFILES` array beside it.

## Decision

`accepted` — 2026-08-16, as a child of [WI-048](WI-048-act-on-second-external-review.md).

## Plan

### Requirements

- No number on a public surface is both typed by hand and unchecked. **Derived or gated — either is
  acceptable, silence is not.**
- The build must not depend on running the CLI against a live repo if that makes a pristine checkout
  unbuildable. A committed, gated snapshot is a legitimate answer.
- A drifted number **fails a check**, rather than rendering with an older date.
- `asOf` stays. Derivation removes the drift; the date is what lets a reader judge the claim.

### Impacts

- [`site/src/site.config.ts`](../../../site/src/site.config.ts) (`gates`, `phase`) and
  [`site/src/pages/index.astro`](../../../site/src/pages/index.astro) (`MODULES`, `PROFILES`).
- A build or gate step, and possibly a generated file.
- **Related but not the same:** [WI-046](WI-046-console-provenance.md) covers the `Console`
  blocks — text claiming to be recorded output. This covers *counts*. They may share a mechanism;
  if the same generated-snapshot approach serves both, say so in whichever lands second rather than
  building it twice.

### Approach

Two candidates, decided by whether a pristine checkout must build without the CLI:

1. **Generate at build time** from `rungs check --json` and the module manifests. Truest, and it
   couples the site build to a working CLI.
2. **Commit a generated snapshot and gate it** — the same shape as
   `site-vendored-unedited`, which already re-hashes 33 files and is proven here. Weaker coupling,
   and the drift becomes a red gate rather than a wrong page.

Leaning toward 2 for the counts, because it fails loudly at `rungs check` time — where someone is
already looking — rather than at deploy time.

Note `rungs check --json` does not exist; option 1 implies adding it.

### Acceptance criteria / tests

1. The gate count on the site equals `rungs check`'s, verified after deliberately adding a gate.
2. The module and profile lists match `modules/` and the profile definitions.
3. A hand-edited number fails a check with the expected and actual values named.
4. A pristine checkout still builds the site.
5. Both `TODO (generate-derivable)` comments are removed or replaced with what actually happens.
6. `rungs check`, `npm test`, and the site build pass.

### Out of scope

- **The `Console` transcripts.** [WI-046](WI-046-console-provenance.md).
- **Research snapshot numbers** — `3,585 commits`, `433 branches`. Those are dated historical
  measurements of other repos, correctly labelled as snapshots, and deriving them would mean
  re-measuring four repos at build time. Nothing deferred; they are correct as they are.
- **The release-state ambiguity** on the versions page. [WI-035](WI-035-public-release.md).

## Execution

Branch `feature/WI-051-derive-site-claims`, cut from `main` at `4b26d5e`. Approach 2 as the plan
leaned — a committed snapshot plus a gate — so a pristine checkout still builds without the CLI.

- [`site/scripts/claims.mjs`](../../../site/scripts/claims.mjs) derives the structural facts from
  `.ai/gates.toml`, `modules/*/module.toml` and `src/lifecycle.ts`.
- `npm run claims` writes [`site/src/generated/claims.json`](../../../site/src/generated/claims.json)
  (committed); `npm run check:claims` refuses a drifted one, registered as the
  `site-claims-current` gate. Gate count 22 → 23.
- `site.config.ts` and `index.astro` read from the snapshot. Both `TODO (generate-derivable)`
  comments are gone.

### Three things measurement changed

1. **Splitting on the bare string `[[gates]]` counted the registry's own header comment.** Two
   `# [[gates]]` examples produced 24 gates where there are 22 — a *derived* number wrong in the
   same direction as the typed one it replaced, which would have been a worse outcome than doing
   nothing. Parsing now requires the marker at line start.

2. **Registered and run are different numbers and the page must not merge them.** The registry
   declares 23; `rungs check` reports 22 + a hook, because a hook fires on a tool call rather than
   in the runner. "23 gates register, all 23 have engines" beside "22 pass" is two true statements
   that read as a contradiction, so the snapshot keeps `gateIds` and `hookIds` separate and the page
   says *"plus 1 hook that fires on a tool call"*.

3. **The run result had to be generated too, and the plan did not say so.** It was left typed —
   `run: { pass: 22 }` — on the reasoning that a run is a dated measurement like the research
   snapshots. Within minutes it read `23 gates register` beside `22 pass`, same date, same page:
   exactly the incoherence this item exists to remove, reintroduced by the part I had exempted.
   `generate-claims` now captures the run too. It *may* run `rungs check` because it is a manual
   step; `check-claims` may not, because it is a gate the runner executes and that would be
   recursion.

### Deviation from the plan

The plan scoped `MODULES` and `PROFILES` as inventories to derive. The **profile "for what" line**
stays authored — *"more than one work item in flight"* is editorial and there is nowhere in
`modules/` it could honestly be read from. The module *set* per profile is derived, so a profile
that gains a module cannot keep the old list; only the prose is hand-held, and it is prose.

## Review

Verified 2026-08-16.

**1 · The site's gate count equals the registry's, checked by deliberately adding one.** The
`site-claims-current` gate caught **its own registration** on its first run — the snapshot predated
it and the gate said so, naming the missing id. Regenerating cleared it. That is the acceptance test
performing itself. **Met.**

**2 · Module and profile lists match the repo.** Rendered in the browser after the change: five
profiles reading `instructions`, `+ gates · backlog · findings · adr · session`,
`+ ci · specs · workflows · skills · audit`, `+ release · doc-authority`,
`+ concurrency · design-sync`, and 15 module cards — **identical to the hand-typed arrays they
replaced**, which is the evidence there is no visible regression. **Met.**

**3 · A hand-edited number fails, naming expected and actual.** Set `gateCount` to 99:
`gateCount: snapshot 99 vs repo 23`, exit 1. Restored, passes. **Met.**

**4 · A pristine checkout still builds.** The snapshot is committed and the site build reads it as a
JSON import; nothing in the build path runs the CLI. `npm run build` → 119 routes, `check:links` →
1,859 links, 0 broken. **Met.**

**5 · Both `generate-derivable` TODOs are gone**, replaced by what actually happens. **Met.**

**6 · Gates, tests, build.** `rungs check` → **23 pass · 0 fail · 0 unimplemented · 0 error**;
`npm test` → 17 pass. The rendered status line and the runner now agree exactly:
*"23 gates register, plus 1 hook that fires on a tool call · 2026-08-16 · 23 pass · 0 fail"*.
**Met.**

### What is still typed

`phase.label` and `phase.detail` — *"Phase 6 in progress"* and its sentence. Prose about where the
project is, with no mechanical source; the roadmap is its authority and it is a judgement, not a
count. Left alone deliberately rather than by omission.
