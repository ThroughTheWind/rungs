---
id: WI-063
title: Resolve modules from roots outside the package, and record where each installed module came from
type: feature
status: proposed
branch:
created: 2026-08-18
updated: 2026-08-18
related: [ADR-0002, ADR-0003, ADR-0004, WI-039]
epic:
children: []
---

## Proposal (rationale)

**Modules are the product, and the CLI can only load the fifteen it ships.**
[ADR-0003 §Distribution](../../decisions/ADR-0003-module-definition-format.md) says modules are
bundled *for now*, and that the format is a plain directory "precisely so a third-party or private
module registry is possible later (Phase 7) without a format change".
[`roadmap.md`](../../roadmap.md) carries **module registry outstanding** as the last open Phase 7
row. Neither has been acted on, and the gap is smaller than either implies:

- [`loadAllModules(modulesRoot)`](../../../src/manifest.ts) already takes a root. Only three call
  sites hardcode it — [`src/cli.ts`](../../../src/cli.ts), [`src/check.ts`](../../../src/check.ts)
  and [`src/engines.ts`](../../../src/engines.ts).
- **The real format gap is the installed record, not the module directory.** `.ai/rungs.toml` keys
  modules as `[modules.<bare-name>]` with `version`, `state` and `params`, and no origin. Two
  modules named `backlog` from different roots are one key in the file `upgrade` reads. ADR-0003
  promised the *directory* format would survive a registry; it said nothing about this file, and
  this is where the change actually lands.

**What the absence costs today.** An out-of-tree module can only reach a repo through an installer
that copies a payload in and registers `kind = "command"` gates, because a declared gate resolves
its table under the CLI's own modules directory ([`src/check.ts`](../../../src/check.ts),
`loadTable`) and a missing table takes the deliberate *never green* branch in the same file. So an
external module cannot use any engine this repo already ships. For structural checks — "this section
is non-empty", "every phase carries an exit criterion" — that leaves two bad options: ship a script
into the consumer repo, which [ADR-0002](../../decisions/ADR-0002-stack-and-runtime-footprint.md)
forbids, or write shell one-liners, which is the class the platform matrix caught four defects in.
The seam deletes the workaround rather than improving it.

**Why now, and why this is not the catalogue growing.** Two modules are wanted that must *not* be
bundled: an opinionated project scaffolder, and a GitHub Issues bridge. Both are **designed, not
extracted**. Everything in [`modules/`](../../../modules/README.md) carries the implicit claim of
extraction from four repos with an incident attached, and [CLAUDE.md](../../../CLAUDE.md)'s evidence
rule is this repo's core commitment — a wrong default here is not one wrong repo, it is every repo
that trusted the default. Keeping unextracted content out of the package is what preserves that
claim; the seam is what gives "out of the package" somewhere to be.
[The 2026-08-16 external review](../../design/external-review-2026-08-16.md), claim 9, retained as a
constraint on the next release, points the same way: stop growing the catalogue.

## Decision

Awaiting a person. **Not adopted by having been written** — the plan below is drafted ahead of
acceptance and binds nothing until this section records a date and a reason.

## Plan

> **Drafted pre-acceptance**, so the decision can be made against something concrete. Nothing here
> is adopted until the Decision section says so.

### Requirements

- A modules root outside the package can be named, and `doctor`, `add`, `check` and `modules` all
  see modules from it.
- **Resolution is persistent, not per-invocation.** A root supplied only as a flag is invisible to
  the next session and to CI, and `check` would report green on a repo whose gates it silently
  failed to load.
- `.ai/rungs.toml` records **where each installed module came from**, and a repo holding two
  same-named modules from different roots is representable in it.
- `upgrade` never upgrades a module against a root it did not come from.
- A declared gate from an external module resolves its table **from that module's own root**, or is
  refused with a message naming why. It never reports green.
- `rungs modules` audits an external root under the same obligations as a bundled one —
  `[provenance]`, `applicability` on every gate, both-direction self-tests.
- **No network, at any point.** Roots are local paths; resolution fetches nothing.
- Repos scaffolded before this change are unaffected: a `rungs.toml` with no origin still loads, and
  the fifteen bundled modules behave identically.

### Impacts

- [`src/cli.ts`](../../../src/cli.ts), [`src/check.ts`](../../../src/check.ts),
  [`src/engines.ts`](../../../src/engines.ts) — the three hardcoded roots, and both
  table-resolution paths (the runner's `loadTable`, and the self-test engine's).
- [`src/lifecycle.ts`](../../../src/lifecycle.ts) — the `.ai/rungs.toml` writer, and the upgrade
  path that reads it.
- [ADR-0003](../../decisions/ADR-0003-module-definition-format.md) — an amendment or a note. The
  directory format survives unchanged; the installed record does not, which is the half the ADR
  never promised.
- [`README.md`](../../../README.md) command and option tables, and the Phase 7 row in
  [`roadmap.md`](../../roadmap.md). Both carry claims held by `docs-version-claims`.
- `test/package.test.js` — a consumer fixture installing from an external root.

### Approach

**Declare roots in `.ai/rungs.toml`, with a flag only for the first install.** A repo-level
declaration is read by every command on every run; a flag has to be remembered by every future
session and every CI invocation, and the failure when it is forgotten is silent. Alternative
considered and rejected for exactly that reason: `--modules` alone.

**Refuse collisions in v1 rather than namespacing them.** Namespaced ids (`<source>/<module>`) are
the eventual answer, but they touch the registry, the installed record, and every message that names
a module. Refusing a name that already exists is one message, cannot be wrong, and defers the design
until two roots actually collide.

**Deliberately below [ADR-0003](../../decisions/ADR-0003-module-definition-format.md) revisit
trigger 2.** That trigger fires when *a third-party module ecosystem appears* and requires its own
ADR for distribution and versioning. This item ships local roots with no discovery, no index, no
publishing and no fetching — private extension, not an ecosystem. The judgement is recorded here so
the next reader can check it rather than infer it. If publishing follows, the ADR is written then,
and this item must not pre-empt its choices.

**Open, and to be decided before implementation rather than during:** whether `eject` materialises
tables from an external root or refuses. `eject` is a promise, not a courtesy, and an ejected repo
whose gates point at a directory it no longer owns is a broken promise wearing a green tick.

### Acceptance criteria / tests

1. On a scratch consumer, a module living outside the package installs and `rungs check` runs its
   **declared** gate green — demonstrated failing first against a root whose table is missing, with
   the failure naming the root.
2. That consumer's `.ai/rungs.toml` records the module's origin, and a repo scaffolded before this
   change still loads with `upgrade --apply` a no-op on it.
3. A module whose name collides with a bundled one is refused, with both roots named.
4. `rungs modules` over the external root reports the same manifest issues it reports for a bundled
   one — demonstrated with one module missing `applicability` and one missing
   `[provenance].incident`.
5. This repo is unchanged: `rungs check` 29 pass · 0 fail, and the platform matrix passes on all
   three operating systems.
6. No network call is added. Verified by reading the diff — stated as read, not as measured.

### Out of scope

- **Publishing, discovery, a registry index, or fetching from npm or git.** That is ADR-0003 revisit
  trigger 2 and needs its own ADR. **No follow-up item is opened**, because whether to cross that
  line is a decision somebody makes, not work already deferred.
- **The two modules themselves.** They are authored in a separate repository; neither is written
  here. This item is the seam only.
- **Any change to what `[provenance]` requires.** Recorded as [F-037](../FINDINGS.md) rather than
  taken on here, and **fixed under that finding on 2026-08-18**: `[provenance].kind` now
  distinguishes `extracted` from `designed`. Still out of scope for this item, and no longer a
  prerequisite for it.
- **`[conflicts]`**, which was parsed and read by nothing. Recorded as [F-038](../FINDINGS.md) and
  **fixed under it on 2026-08-18** — `add` refuses a declared conflict, symmetrically. Named here
  because a GitHub Issues module wants `conflicts = ["backlog"]`, not because this item touches it.

## Execution

Not started.

## Review

Not started.
