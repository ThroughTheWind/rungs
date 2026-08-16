---
id: WI-051
title: Stop typing the site's gate and status numbers by hand
type: feature
status: planned
branch:
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

Not started.

## Review

Not started.
