---
id: WI-071
title: Canonicalize packed-consumer containment checks
type: chore
status: done
branch: chore/WI-071-canonical-consumer-paths
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, WI-068, WI-070, F-044]
epic: WI-064
children: []
---

## Proposal (rationale)

WI-068's packed existing-repository journey installs the candidate and its runtime dependency into
an isolated temporary prefix, then proves both resolved inside that prefix rather than the producer
checkout. The first macOS matrix run exposed a test-harness false negative: Node canonicalises the
installed child through `/private/var`, while the parent remains the lexical `/var` path returned by
the operating system. Comparing those two spellings reports that the child escaped even though they
name the same filesystem tree.

This blocks WI-070's required cross-platform evidence and therefore the Arena bootstrap. Weakening
or deleting the containment assertions would make the journey green by removing the isolation proof;
the comparison must instead put both paths into one canonical namespace.

## Decision

`accepted` — 2026-09-05. Fix F-044 as a separate child because it belongs to WI-068's generic
consumer harness, not WI-070's release-gate implementation. Land this item on `main`, then merge the
updated `main` into WI-070 and rerun that candidate's complete matrix.

## Plan

### Requirements

- Canonicalise both sides of every containment decision through the filesystem where possible, so
  an aliased ancestor and its real descendant compare as one tree.
- Preserve non-throwing behavior for arbitrary nonexistent PATH entries by canonicalising their
  deepest existing ancestor and reattaching the missing suffix without looping at a filesystem root.
- Preserve each platform's filesystem lookup order across aliases and `..`: POSIX follows an
  existing symlink before applying the next component, while Windows lexically normalises `..`
  before traversing a junction. Interpret relative entries from the consumer directory.
- Match Windows executable lookup for rooted, drive-absolute and exactly whole-entry-quoted paths;
  reject drive-relative, unmatched-quote and interior-quote forms that cannot be classified safely.
- Canonicalise existing tool, producer and cleanup roots strictly; a tolerant fallback used for PATH
  probing must never make a critical isolation or recursive-delete guard pass.
- Keep every candidate/dependency integrity, producer-exclusion and guarded-cleanup assertion at
  least as strict as it is now; none may be removed or skipped.
- Reproduce aliased entry and escape paths in an automated regression, including existing and
  missing descendants on both sides of the containment boundary.

### Impacts

- `test/package.test.js` only for containment helpers and regressions.
- F-044, this item and WI-070's review evidence for the resulting matrix.
- No package runtime, bundled module, consumer file or public API changes.

### Approach

Separate the relative-path boundary predicate from path canonicalisation. Critical existing paths
use `realpathSync` directly before the predicate. POSIX PATH probing starts at the canonical root or
consumer directory and walks components in filesystem order, resolving existing aliases before a
following `..`; after the first missing component it appends a safe unresolved suffix. Windows PATH
probing first applies Windows lexical resolution relative to the consumer, then canonicalises the
deepest existing ancestor, matching the platform's junction semantics. Strip exactly one matching
whole-entry quote pair on Windows. Any canonicalisation error, ambiguous drive-relative path,
unmatched/interior quote or `..` after a missing POSIX component is unclassifiable and is dropped.

Create a temporary real directory plus a directory alias, using a POSIX symlink or Windows junction.
Prove an existing canonical child and a missing alias descendant are inside, while existing and
missing siblings are outside. Add an alias from inside the parent to the outside sibling to prove
canonicalisation cannot make an escape look contained. Retain the real packed journey as the macOS
end-to-end regression because it is the exact failure that motivated the helper.

### Acceptance criteria / tests

1. An aliased parent contains the same tree's canonical existing child and an alias-spelled missing
   descendant; existing and missing outside siblings remain outside without throwing.
2. An alias from inside the parent to an outside sibling, including a missing descendant below that
   alias, remains outside.
3. PATH filtering tolerates nonexistent entries, removes an aliased entry that resolves inside the
   producer checkout, honours the platform's alias/junction-plus-`..` semantics, and interprets
   relative entries from the consumer directory. Windows coverage includes root-relative,
   drive-relative and quoted entries, including delimiter-containing quoted input that splits into
   unsafe unmatched fragments and must fail closed.
4. The packed journey still proves exact candidate and dependency integrity, resolution inside the
   canonical isolated prefix and outside the canonical producer, preservation of producer bytes and
   Git state, byte-idempotent upgrades, and guarded removal of only the temporary child.
5. Focused package tests, full `npm test`, package dry-run, `git diff --check` and the Rungs gate
   registry pass without weakening or skipping an isolation assertion.
6. The exact pushed SHA passes Node 22.18 and Node 22 on Ubuntu, macOS and Windows, and the site job
   passes at the same SHA.

### Out of scope

- Product-code path semantics; this item changes only a package-test helper.
- F-034's consumer line-ending normalisation, F-042's eject dependency closure, F-043's inherited
  exemption scope or F-025's release-consumption boundary.
- Any relaxation of candidate/dependency isolation or recursive-delete safety checks.
- Cutting, tagging or publishing v0.4.0; later bootstrap items own the release boundary.

## Execution

The first implementation was deliberately exercised as a provisional branch stacked on WI-070 so
the macOS hypothesis could be tested quickly. It produced two all-green seven-job matrices, but an
independent process review found that topology violated this repository's requirement that planning
ride `main` and code branches start there. The WI-070/WI-071 and F-043/F-044 reservations were first
landed on `main` in `bf76c3a` through `5d3acae`; this branch was then rebased onto that exact main tip
and its remote replaced with `--force-with-lease`. The provisional history remains recoverable from
WI-070 and the recorded Actions runs, but it is not landing authority.

On the corrected branch, `0bb085e` adds deepest-existing-ancestor canonicalisation and a
symlink/junction regression; `deed319` adds the outbound escape case. `033be92` separates the pure
canonical boundary predicate, tolerant PATH probing and strict existing-path containment. Candidate,
dependency and producer assertions now use strict `realpathSync` on both operands; rollback and
recursive-delete guards compare paths that were already strictly canonicalised. Tolerant fallback is
confined to arbitrary PATH entries.

Successive independent reviews then found that one algorithm could not model both operating-system
families. POSIX follows a symlink before a subsequent `..`; Windows resolves `..` lexically before it
traverses a junction, and root-relative entries inherit the consumer's drive or share. Windows also
accepts a matching quote pair around a whole PATH entry. Final code commit `3c68dfb` therefore walks
POSIX components in filesystem order, uses Windows lexical resolution before deepest-existing
canonicalisation, resolves relative entries from the consumer, handles both junction-plus-`..`
directions, strips exactly one Windows whole-entry quote pair and drops every unclassifiable form.
The regression includes absolute, relative, missing, root-relative, drive-relative, symmetric
alias/junction-plus-`..`, matching-quote, unmatched-quote and delimiter-split quoted cases.

## Review

An initial code review approved `033be92`, but separate final reviews found the POSIX
alias-plus-`..`, relative-PATH, Windows root-relative, Windows junction-order and quoted-Windows-PATH
false greens described in Execution and requested changes despite earlier all-green matrices. Those
matrices are deliberately not landing authority. Two independent final reviews approve exact code
SHA `3c68dfb` with no remaining containment, cleanup, parsing or scope blocker after reproducing
Windows quoted lookup and both junction-plus-`..` directions. Final pushed tip `fb6f034` contains
that code plus only its lifecycle record. Acceptance evidence on 2026-09-05:

1. The cross-platform alias regression passes with a POSIX symlink or Windows junction. It proves a
   canonical existing child and alias-spelled missing child are inside; existing and missing siblings
   are outside.
2. A link from inside the parent to an outside sibling, including a missing descendant, remains
   outside.
3. The same regression proves PATH filtering removes absolute, relative and platform-specific
   alias/junction-plus-`..` entries resolving under the producer while retaining classifiable outside
   entries. Windows assertions cover root-relative drive inheritance, drive-relative rejection and
   matching/unmatched/interior quote behavior; uncertain inputs fail closed without throwing.
4. The full packed journey passes without deleting or skipping any integrity, isolation,
   producer-state, idempotence, rollback or guarded-cleanup assertion.
5. At final code SHA `3c68dfb`, the focused regression and full suite pass 1/1 and 47/47. The
   registry passes 29/29, `npm publish --dry-run --json` succeeds with 107 files and
   `git diff --check` passes.
6. GitHub Actions run 33953726257 passes final pushed tip `fb6f034`: Node 22.18 and Node 22 on
   Ubuntu, macOS and Windows plus the site job all succeed. This supersedes run 33952621863 at
   `033be92`, whose green result did not cover the review-found false greens.
