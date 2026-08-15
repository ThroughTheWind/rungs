---
id: WI-030
title: Refresh Rift Forge research from the candidate branch
type: docs
status: proposed
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-017, WI-029]
epic:
children: []
---

## Proposal (rationale)

The existing Rift Forge extraction was surveyed on 2026-08-14 against a detached working tree and
records 3,236 commits, 401 branches, 51 live worktrees, 13 skills, 69 scripts, and 102 live work
items. The local `candidate/0.1.0` branch has since advanced materially and is the branch the source
repo calls its active candidate. Those claims are now stale unless re-derived from that ref.

This item refreshes the extraction against the candidate branch, preserving the original research
boundary while making the evidence reproducible at a full commit SHA. It is a research correction,
not a module or product change.

## Decision

`proposed` — 2026-08-15. Opened at the user's request because the first inspection no longer
describes the active candidate branch.

## Plan

### Requirements

- Pin the local `candidate/0.1.0` ref to a full commit SHA, record its read date, branch/ref, commit
  count, and the candidate-vs-remote-ref relationship.
- Re-read the candidate's own instructions, backlog/session/worktree workflow, skills, gates,
  release posture, and generated-artifact rules before updating the extraction.
- Recompute every headline inventory claim retained in the refreshed extraction with a named command
  and date; distinguish current candidate facts from historical observations.
- Record changed, retired, and newly introduced practices with file paths and commit evidence, while
  marking interpretation as **Opinion** in the first person.
- Check direct dependent research claims for the old Rift Forge counts and update or explicitly mark
  each one stale; do not silently leave contradicted numbers in the synthesis/index.
- State the candidate checkout's licence evidence explicitly; do not infer a licence from metadata.

### Impacts

- Primary artifact: `docs/research/repos/rift-forge.md`.
- Possible direct dependent updates under `docs/research/` where the old Rift Forge counts or branch
  posture are repeated; no changes to `modules/`, CLI source, or the Rift Forge checkout.
- Site content and link-check surface change because research documents are published as wiki pages.
- Research claims may change pattern confidence in a later synthesis, but this item does not edit the
  pattern catalogue or shipped modules.

### Approach

Use a temporary detached worktree at the local `candidate/0.1.0` ref so the source checkout and its
existing worktrees are not switched or mutated. Run the candidate's own inventory and self-test
commands where dependencies permit, supplementing with read-only Git/tree measurements. Compare the
new evidence against the 2026-08-14 extraction, then update only claims that the candidate checkout
supports. If the local candidate and `origin/candidate/0.1.0` diverge, treat the requested local
candidate ref as the authority and record the divergence rather than blending the trees.

### Acceptance criteria / tests

1. `docs/research/repos/rift-forge.md` identifies `candidate/0.1.0`, a full SHA, read date, source
   checkout, and licence evidence, and every retained headline count has a reproducible command/date.
2. The refreshed document covers the current candidate's setup, working practices, failure/retirement
   evidence, pain-point table, and extraction verdict; changed or retired practices are not hidden by
   copying the old narrative forward.
3. A repository-wide search finds no unqualified stale Rift Forge headline count in direct research
   dependents; each changed claim is updated or labelled historical/stale with a reason.
4. The source checkout remains unchanged and no `modules/` or CLI implementation files change.
5. `rungs check`, site build, and site link/type checks pass with zero broken links; the refresh's
   evidence and limitations are recorded in the work item review.

### Out of scope

- Editing or merging the Rift Forge candidate branch, its working tree, or its remote.
- Re-running the six public-framework extractions or changing `pattern-catalog.md`/modules/; open a
  follow-up item if refreshed evidence changes a catalogue decision.
- Reconstructing every historical branch or every product feature; only claims used by the extraction
  and its direct dependents are in scope.

## Execution

Not started.

## Review

Not started.
