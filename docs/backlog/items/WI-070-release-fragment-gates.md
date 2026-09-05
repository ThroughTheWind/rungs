---
id: WI-070
title: Make both release fragment gates executable and non-vacuous
type: feature
status: in_progress
branch: feature/WI-070-release-fragment-gates
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, WI-068, F-039, F-041]
epic: WI-064
children: []
---

## Proposal (rationale)

The release module promises two complementary changelog safeguards, and both currently report
green without enforcing their contracts. `release-changelog-fragment` declares branch-change keys
that its `file-population` engine never reads; all five fixtures are unbuilt and the gate is absent
from Rungs' own registry. `release-fragment-current` has a working engine and self-tests, but the
production and ejected runner dispatch maps omit its table key, so the registered gate receives the
whole release table, examines zero fragments and passes vacuously.

These are producer defects surfaced by the Arena bootstrap. Releasing the exact consumer launcher
while the release checks are known false-greens would preserve the bootstrap mechanics and defeat
their release boundary.

## Decision

`accepted` — 2026-09-05. Close F-039 and F-041 together because they are independent false-green
paths in one release table and share the same production-dispatch proof. Implement a generic
Git-aware `change-requires-file` engine instead of overloading `file-population` with a second,
unrelated schema. Preserve `repo-content` applicability: the gate observes Git changes and ordinary
repository files, not Rungs-managed artifacts or a Rungs-defined document schema.

## Plan

### Requirements

- Resolve the configured stable branch deterministically as a local ref, exact `origin` ref, or
  sole other remote-tracking ref; an absent or ambiguous base fails closed and names why.
- Observe the union of merge-base-to-HEAD changes, staged changes, unstaged changes and untracked
  non-ignored files using Git argv calls rather than a shell.
- Engage only when at least one changed path matches the configured shipping-code patterns and the
  complete change set is not ignore-only.
- Satisfy the obligation only with a matching fragment that is both changed in this work and still
  exists. An inherited, deleted or ignored fragment must not satisfy it.
- Accept an exemption marker only when a changed readable file states non-whitespace reasoning
  after it; a bare marker still fails.
- Dispatch `changelog-freshness` and `change-requires-file` to their exact table sections in the
  source runner, module self-test runner and ejected runner template.
- Run all five existing change/fragment fixtures in both directions, register the corrected gate in
  Rungs itself and add a real reconstructed fragment for the upcoming v0.4.0 release.

### Impacts

- `src/engines2.ts` and `src/engines.ts` for the Git-aware engine, shared deterministic ref
  resolution and engine registration.
- `src/check.ts`, `src/engines.ts` and `src/lifecycle.ts` for exact table selection in every declared
  gate dispatch path.
- `src/selftest.ts` for a Git-backed `{ changed, fragments, exempt }` fixture builder.
- `modules/release/module.toml` and `modules/release/gates/release.toml`; the module advances from
  1.3.0 to 1.3.1 because this repairs an existing declared contract without adding a new module
  capability.
- `.ai/gates.toml`, `changelog.d/0.4.0.md`, focused tests, module/site claim sources and generated
  site claims affected by the 29-to-30 repository gate count.

### Approach

Factor the exact integration-ref resolver already proven by WI-067 so both Git-aware engines use one
precedence rule. Collect NUL-delimited path output from explicit Git argv calls, normalise separators
to repository-relative forward slashes, and de-duplicate it before applying the table's path sets.
Use the merge base rather than comparing branch tips directly, so unrelated movement on the stable
line is not attributed to the working branch.

Teach the self-test builder to initialise a tiny repository, commit a base on `main`, switch to a
fixture branch and materialise the declared changed files, fragments and optional exemption. The
test must pass the engine the same literal stable branch and changelog directory that the fixture
created; unresolved template parameters are never silently guessed.

Pin F-041 through the production `check` path over a scratch Rungs registry/table containing a stale
versioned fragment, not just a direct engine call. Separately assert the ejected runner template's
selector so its converted JSON table uses the same section. Register the new gate locally only once
its own shipping change and fragment make the real repository pass.

### Acceptance criteria / tests

1. A shipping-code change without a changed fragment fails; adding a new matching fragment passes;
   a pre-existing or deleted fragment does not satisfy it.
2. Documentation/test/tooling-only changes pass, while mixed changes containing shipping code still
   engage the gate.
3. A reasoned exemption in a changed readable file passes and a bare marker fails.
4. Branch, staged, unstaged and untracked changes are observed; local, `origin` and sole-other-remote
   bases work, while absent and ambiguous bases return explicit findings with `examined: 0`.
5. All five `release-changelog-fragment` fixtures execute with their declared outcomes, reducing the
   known unbuilt-fixture count by five.
6. A production runner check fails on a stale versioned fragment and reports a non-zero examined
   count; source, self-test and ejected table maps all select `changelog_freshness` exactly.
7. Rungs registers `release-changelog-fragment`, carries a truthful `0.4.0` fragment reconstructed
   from post-v0.3.1 commits, and passes its now-30-gate registry.
8. Focused tests, full `npm test`, the module-command audit, site claim generation/checks,
   `git diff --check`, `npm run rungs -- check` and package dry-runs pass.

### Out of scope

- F-025's post-publication same-version fragment blind spot.
- F-034's general consumer CRLF normalisation.
- Changing which paths count as user-visible shipping work beyond the release table's existing
  declared patterns.
- Repairing unrelated ejection packaging or engines; any independently observed gap is a finding,
  not an unplanned addition here.
- Cutting or publishing v0.4.0; WI-071 owns that irreversible boundary.

## Execution

Not started.

## Review

Not started.
