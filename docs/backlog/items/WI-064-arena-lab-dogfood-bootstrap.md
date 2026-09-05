---
id: WI-064
title: Bootstrap Arena Lab as the first direct Rungs consumer
type: epic
status: accepted
branch:
created: 2026-09-05
updated: 2026-09-05
related: [WI-065, WI-066, WI-067, WI-068, WI-069, WI-070, WI-071, WI-072, WI-073, WI-074, WI-075, WI-076, WI-077, WI-078, WI-079, WI-080, WI-081, WI-082]
epic:
children: [WI-065, WI-066, WI-067, WI-068, WI-069, WI-070, WI-071, WI-072, WI-073, WI-074, WI-075, WI-076, WI-077, WI-078, WI-079, WI-080, WI-081, WI-082]
---

## Proposal (rationale)

Rungs has been exercised in its own repository and synthetic scratch repositories, but not as the
maintained workflow of another owner's sustained project. Arena Lab is a new, documentation-rich
C# game repository owned by the same maintainer. Its backlog will become active immediately, so it
can expose retrofit, migration, package, Git-state and recurring-use defects that self-hosting does
not.

Waiting for an outside adopter cannot generate this evidence: the maintainer has explicitly chosen
Arena Lab as the first-party dogfood consumer. The aim is not to make Rungs look green; it is to
make each failure reproducible and recoverable while Arena development continues.

## Decision

`accepted` — 2026-09-05, by the user. Use Arena Lab as a controlled direct consumer and improve
Rungs from the resulting evidence. Keep the producer and consumer independently buildable: Rungs
may use a generic fixture reduced from Arena, but its required tests must never depend on the Arena
checkout.

## Plan

### Requirements

- A fresh tracked scaffold is internally consistent before it becomes Arena's stable baseline.
- Arena main consumes an exact immutable release; an unreleased candidate is tested only as a
  packed artifact in a disposable Arena checkout.
- Existing-repository behavior has a generic automated consumer journey in Rungs.
- Ref-only/non-main Git state is covered before generated CI is recommended.
- Consumer failures name both exact commits and become Rungs-owned regressions without importing
  Arena product content.

### Impacts

- Child items WI-065 through WI-082 own the Rungs changes identified so far; later independently
  scoped children close any remaining release blockers before the immutable candidate is cut.
- Arena owns its separate tracked adoption, document migration and exact-version update.
- A later release item packages the children only after the downstream canary passes.

### Approach

Use a one-way producer/canary flow: exact Rungs commit → packed tarball and integrity → disposable
Arena checkout at an exact commit → immutable Rungs release → dedicated Arena pin update. Each
child remains independently reviewable and supplies its own regression.

### Acceptance criteria / tests

1. Every child is done or explicitly removed from the epic with a written reason.
2. A package built from the integrated Rungs commit passes the generic consumer journey and the
   disposable Arena canary.
3. Arena adopts an exact released version without a committed sibling path, mutable tag or package
   tarball.
4. Both repositories remain independently buildable and recoverable to their prior commits.

### Out of scope

- Arena gameplay or product implementation; Arena owns it after the bootstrap.
- Making every Rungs module mature before adoption. Higher-rung modules remain evidence-driven.
- A required Rungs test that clones or reads private Arena content.

## Execution

Not started. Children carry implementation.

## Review

Not started.
