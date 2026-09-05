---
id: WI-070
title: Make both release fragment gates executable and non-vacuous
type: feature
status: in_progress
branch: feature/WI-070-release-fragment-gates
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, WI-068, WI-071, F-039, F-041, F-044]
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

- Resolve the configured backlog integration branch deterministically as a local ref, exact
  `origin` ref, or sole other remote-tracking ref; an absent or ambiguous base fails closed and
  names why. A release candidate can be ahead of the stable line, so stable is not the work branch.
- Observe the union of merge-base-to-HEAD changes, staged changes, unstaged changes and untracked
  non-ignored files using Git argv calls rather than a shell.
- Engage only when at least one changed path matches the configured shipping-code patterns and the
  complete change set is not ignore-only.
- Satisfy the obligation only with a matching fragment that is both changed in this work and still
  exists. An inherited, deleted or ignored fragment must not satisfy it.
- Accept an exemption marker only when a changed readable file states a substantive reason whose
  first non-space character is a letter or number on the same line; a bare marker or comment closer
  is not a reason, and syntax later on that line or text on the following line cannot rescue it.
- Dispatch every implemented engine through one explicit table-section inventory shared by the
  source runner, explain path, module self-test runner and ejected runner template. Missing engine
  mappings and missing required sections fail closed; there is no whole-table fallback except the
  explicit `id-integrity` sentinel. A matching entry id narrows an array, while a subject-named
  section intentionally shared by sibling gates remains intact.
- Run all five existing change/fragment fixtures in both directions, register the corrected gate in
  Rungs itself and add a real reconstructed fragment for the upcoming v0.4.0 release.

### Impacts

- `src/engines2.ts` and `src/engines.ts` for the Git-aware engine, shared deterministic ref
  resolution and engine registration.
- A dependency-free `src/engine-table.ts`, consumed by `src/check.ts`, `src/explain.ts`,
  `src/engines.ts` and the runner template in `src/lifecycle.ts`, for exact table selection in every
  declared gate dispatch path.
- `src/selftest.ts` for a Git-backed `{ changed, fragments, exempt }` fixture builder.
- `modules/release/module.toml` and `modules/release/gates/release.toml`; the module advances from
  1.3.0 to 1.4.0. Every prior consumer-visible release-module change advanced the minor version,
  including its earlier gate-behavior repair; no bundled module has established a non-zero patch
  convention.
- `.ai/gates.toml`, `changelog.d/0.4.0.md`, focused tests, module/site claim sources and generated
  site claims affected by the 29-to-30 repository gate count.

### Approach

Factor the exact integration-ref resolver already proven by WI-067 so both Git-aware engines use one
precedence rule. The release table takes its base from `backlog.integration_branch`, the authority
for where item branches are cut and landed, rather than `release.stable_branch`; otherwise a
fragment already accumulated on a candidate would satisfy every child feature. Collect
NUL-delimited path output from explicit Git argv calls, keep each entry as Git's canonical
repository-relative name, and de-duplicate it before applying the table's path sets. Git already
uses `/` as its index separator; a literal POSIX backslash remains a filename byte rather than being
aliased to a different path. Use the merge base rather than comparing branch tips directly, so
unrelated movement on the integration line is not attributed to the working branch.

Teach the self-test builder to initialise a tiny repository, commit a base on `main`, switch to a
fixture branch and materialise the declared changed files, fragments and optional exemption. The
test must pass the engine the same literal integration branch and changelog directory that the fixture
created; unresolved template parameters are never silently guessed.

Pin F-041 through the production `check` path over a scratch Rungs registry/table containing a stale
versioned fragment, not just a direct engine call. Assert that every `ENGINES` key has one shared
mapping, unknown or missing-section dispatch throws, and the ejected runner imports that selector rather
than carrying another hand-kept map. Register the new gate locally only once its own shipping change
and fragment make the real repository pass.

### Acceptance criteria / tests

1. A shipping-code change without a changed fragment fails; adding a new matching fragment passes;
   a pre-existing or deleted fragment does not satisfy it.
2. Documentation/test/tooling-only changes pass, while mixed changes containing shipping code still
   engage the gate.
3. A reasoned exemption in a changed readable file passes; a bare marker, comment closer or reason
   deferred to the next line fails.
4. Branch, staged, unstaged and untracked changes are observed; local, `origin` and sole-other-remote
   integration bases work, while absent and ambiguous bases return explicit findings with
   `examined: 0`. A fragment inherited from the active candidate does not satisfy its child feature.
5. All five `release-changelog-fragment` fixtures execute with their declared outcomes and zero
   unrun fixtures. Registering those five fixtures does not increase the global known-unbuilt count,
   because the new builder executes all five.
6. A production runner check fails on a stale versioned fragment and reports a non-zero examined
   count; one strict selector covers every implemented engine and the generated runner contains no
   divergent key map.
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
- Cutting or publishing v0.4.0; a later release item owns that irreversible boundary after F-025's
  already-declared pre-cut condition is resolved or explicitly dispositioned.

## Execution

Not started.

## Review

Not started.
