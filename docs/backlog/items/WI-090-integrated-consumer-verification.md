---
id: WI-090
title: Verify the integrated candidate as a packed consumer and hand the canary step to WI-064
type: chore
status: planned
branch:
created: 2026-09-06
updated: 2026-09-06
related: [WI-085, WI-064, WI-066, WI-068, WI-077, WI-086, WI-087, WI-061]
epic: WI-085
children: []
---

## Proposal (rationale)

Each child of [WI-085](WI-085-existing-promises-remediation.md) verifies its own change. None of
them proves that the changes compose: that a consumer built from the integrated commit still
retrofits an existing repository, that the hook adapter survives ejection, that the new detectors
and metadata ride the ejected runner, and that the release flow [WI-064](WI-064-arena-lab-dogfood-bootstrap.md)
accepted — exact producer commit → tarball and integrity → disposable canary at an exact consumer
commit → immutable release → exact pin — has a concrete candidate to start from.

## Decision

`accepted` — 2026-09-06 under WI-085. Run the complete lifecycle against the integrated candidate
and prepare the flow's first step. This item does not push, tag, publish or change a maintained
branch; if the canary needs authorization not established in the session, it stops at the packed
candidate and names the remaining action.

## Plan

### Requirements

- The generic packed existing-repository journey and a full lifecycle (doctor → init → check →
  upgrade → eject → package-free direct and aggregate checks → hook after eject) pass from the
  integrated commit's tarball with npm, the installed prefix and the producer path unavailable.
- Every engine and metadata dependency added by WI-086, WI-087 and WI-061 is present in the ejected
  runner; a gate that needs materialized data fails explicitly rather than passing on an empty set.
- Post-eject hook behaviour is resolved against WI-077's retained surface, in the ejected output.
- The handoff names the exact producer commit, the tarball name and integrity, and the exact Arena
  commit a disposable canary would run against, with the commands to run it. If a disposable canary
  is run, it runs in a throwaway clone and its result is recorded with both commits; a synthetic
  fixture is never described as adoption.

### Impacts

- `test/package.test.js` (the journey grows eject and hook steps), the evidence document, WI-064's
  execution record, `.ai/session.md`.

### Approach

Extend the existing journey rather than writing a second one, so the isolation harness (packed
dependency closure, stripped PATH, prefix realpath checks) is shared. Then remove the tool prefix
and run the ejected surface. Record the exact SHA the CI matrix must run against, and whether it ran.

### Acceptance criteria / tests

1. `npm test` passes with the extended journey; the journey's assertions cover eject, the removed
   prefix, direct and aggregate ejected checks, and the ejected hook verdicts.
2. `node src/cli.ts check`, `node src/cli.ts modules`, `npm pack --dry-run --json`,
   `npm run build --prefix site` and `npm run check --prefix site` pass on the integrated commit.
3. The handoff lists producer commit, tarball, integrity, consumer commit, and the exact remaining
   canary/adoption commands; the CI matrix result for the exact SHA is recorded as observed or as
   pending because the commit was not pushed.

### Out of scope

- Publishing, tagging, pushing, or editing Arena Lab's maintained branch.
- Any producer test that reads private Arena content.

## Execution

Not started.

## Review

Not started.
