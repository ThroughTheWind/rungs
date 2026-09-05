---
id: WI-070
title: Make both release fragment gates executable and non-vacuous
type: feature
status: done
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
NUL-delimited path output from explicit Git argv calls, keep each entry as
Git's canonical repository-relative name, and de-duplicate it before applying the table's path
sets. Git already uses `/` as its index separator; a literal POSIX backslash remains a filename byte
rather than being aliased to a different path. Use the merge base rather than comparing branch tips
directly, so unrelated movement on the integration line is not attributed to the working branch.

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

Implemented in five bounded layers:

- Added dependency-free `engine-table.ts` as the single table-section inventory for production,
  explain, module self-tests and the generated runner. Unknown engines and missing sections throw;
  only `id-integrity` explicitly receives a whole table.
- Added `change-requires-file`, sharing WI-067's deterministic ref resolver and observing the union
  of merge-base-to-HEAD, staged, unstaged and non-ignored untracked paths through Git argv calls.
  Required configuration fails closed; inherited, deleted and ignored companions do not satisfy.
- Added a real Git self-test builder for the five existing release fixtures, registered the gate in
  Rungs, advanced `release` 1.3.0 → 1.4.0 and reconstructed `changelog.d/0.4.0.md` from all
  post-v0.3.1 shipping changes.
- Added focused regressions for local/remote/ambiguous refs, every Git state, table dispatch,
  stale production fragments, malformed configuration, comment-only exemptions, ignored files and
  preservation of literal POSIX backslashes in Git path names.
- Updated the generated site claims and public prose to 30 registered gates, the current source
  size and the repaired release-module behavior. The implementations for F-039 and F-041 are
  complete, but their rows remain open until this item lands. The independently observed eject
  dependency defect remains F-042, and stale inherited exemptions are recorded as F-043 rather
  than folded into this item.

## Review

Independent review initially found four false-green edges: empty required patterns disabled the
engine, comment closers could count as reasons, ignored companions lacked an explicit regression,
and unconditional backslash replacement could alias two distinct POSIX filenames. Those four were
fixed by `a23f489`. A second independent review then found that the table compared work to the
released line rather than backlog's configured integration line, allowing an older candidate
fragment to satisfy a child feature; `3e083d8` corrected the boundary and added a regression that
proves both verdicts. The final sweep approved the implementation with no remaining code blocker.
The POSIX filename integration test is intentionally skipped on Windows and awaits the required CI
matrix on the final integrated branch; its pure Git-path parser regression runs on every platform.

The first external matrix at `3df7451` passed Ubuntu, Windows and the site, and failed both macOS
`npm test` cells at WI-068's packed-consumer containment assertion. The new POSIX-backslash test
passed in those jobs; the failure instead compares macOS's lexical `/var` temporary prefix with an
installed child canonicalised through `/private/var`. That independent harness defect is F-044 and
WI-071. WI-071 subsequently landed on `main` at `6790cac`; its branch and merged-main matrices both
passed all six OS/Node cells plus the site, and two independent reviews approved its platform-aware
containment fix. This branch integrates that exact main commit. An independent final acceptance
audit approves integrated tip `79d04c7` with no remaining code or criterion blocker, and GitHub
Actions run 33954188859 passes all six OS/Node cells plus the site at that exact tip. Lifecycle-only
tip `7f0b13c` repeats the complete green matrix in run 33954333619 before landing.

Acceptance evidence on final WI-071-integrated tip `79d04c7`, measured 2026-09-05:

1. Source, staged, committed and untracked shipping changes engage; only a changed existing
   companion satisfies. Inherited, deleted and ignored fragments fail, while a modified one passes.
2. Documentation/test-only changes pass and a mixed shipping delta still engages.
3. Same-line substantive exemptions pass. Bare, next-line, quoted and HTML/C-wrapper-only markers,
   including wrappers followed by ordinary code on the same line, fail.
4. Local, exact `origin` and sole-other-remote integration bases evaluate; absent and ambiguous
   refs return a finding with `examined: 0`. A candidate's existing fragment does not satisfy a
   child feature, and literal POSIX backslashes are preserved rather than normalised into another
   path.
5. All five module fixtures report `ok`; the global warning remains 45 known unbuilt fixtures
   rather than rising by five, and still explicitly says they are not passes.
6. The production stale-fragment regression fails with one examined fragment. Every implemented
   engine has an explicit shared mapping, and the generated runner contains no private key map or
   whole-table fallback.
7. The real registry runs 30/30 with `release-changelog-fragment` examining 19 changed paths and
   `release-fragment-current` examining the reconstructed `0.4.0` fragment.
8. On the WI-071-integrated tree, combined `npm test` reports 56 pass, 0 fail and one
   expected Windows-only skip for the POSIX filename integration case. The module audit resolves all
   52 command spans across 15 dispatched commands. The site builds 144 pages; Astro reports 0
   errors/warnings/hints and 2,285 internal links with 0 broken. `npm publish --dry-run --json`
   succeeds with 108 files (including `engine-table.ts`), and `git diff --check` is clean.
