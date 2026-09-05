---
id: WI-071
title: Canonicalize packed-consumer containment checks
type: chore
status: in_progress
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
consumer harness, not WI-070's release-gate implementation. Integrate this branch into WI-070 before
that candidate merges so the same exact candidate can earn a complete green matrix.

## Plan

### Requirements

- Canonicalise both sides of every containment decision through the filesystem where possible, so
  an aliased ancestor and its real descendant compare as one tree.
- Preserve non-throwing behavior for nonexistent PATH entries while canonicalising their deepest
  existing ancestor, rather than silently leaving an aliased missing descendant in a different
  namespace.
- Keep the producer-exclusion and guarded-cleanup assertions at least as strict as they are now.
- Reproduce an aliased directory ancestor in an automated regression and prove both an existing and
  a not-yet-created descendant remain within it.

### Impacts

- `test/package.test.js` only for the containment helper and its regression.
- F-044, this item and WI-070's review evidence for the resulting matrix.
- No package runtime, bundled module, consumer file or public API changes.

### Approach

Resolve an input to an absolute path, walk upward until an existing ancestor is found, canonicalise
that ancestor with `realpathSync`, then append the missing suffix. If canonicalisation is unavailable,
fall back to the original absolute path. Feed those results to the existing relative-path boundary
test, preserving its drive/root and `..` protections.

Create a temporary real directory plus a directory alias on platforms that support symbolic links.
Compare the aliased parent against a real existing child and a missing descendant below it. Retain
the real packed journey as the macOS end-to-end regression, because it is the exact failure that
motivated the helper.

### Acceptance criteria / tests

1. `isWithin(alias, realChild)` is true when the two paths traverse the same tree through different
   lexical ancestors, and a sibling outside that tree remains false.
2. A nonexistent descendant below the alias is canonicalised through its deepest existing ancestor
   and remains correctly classified without throwing.
3. The packed journey still proves the candidate and dependency are inside the isolated tool prefix,
   outside the producer, byte-idempotent and safely removable.
4. Focused package tests, full `npm test`, `git diff --check` and the Rungs gate registry pass.
5. The two-version matrix passes on Ubuntu, macOS and Windows, and the site job passes at the same
   candidate SHA.

### Out of scope

- Product-code path semantics; this item changes only a package-test helper.
- F-034's consumer line-ending normalisation, F-042's eject dependency closure, F-043's inherited
  exemption scope or F-025's release-consumption boundary.
- Any relaxation of candidate/dependency isolation or recursive-delete safety checks.
- Cutting, tagging or publishing v0.4.0; later bootstrap items own the release boundary.

## Execution

Not started.

## Review

Not started.
