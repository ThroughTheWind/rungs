---
id: WI-071
title: Canonicalize packed-consumer containment checks
type: chore
status: planned
branch:
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
use `realpathSync` directly before the predicate. Tolerant PATH probing resolves an input to an
absolute path, walks upward until an existing ancestor is found, canonicalises that ancestor, then
appends the missing suffix; an unusable entry remains non-throwing and conservatively lexical.

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
3. PATH filtering tolerates nonexistent entries and removes an aliased entry that resolves inside
   the producer checkout.
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

Not started.

## Review

Not started.
