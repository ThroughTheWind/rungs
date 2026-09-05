---
id: WI-067
title: Reconcile backlog state when the integration branch has no local ref
type: feature
status: accepted
branch:
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, F-033]
epic: WI-064
children: []
---

## Proposal (rationale)

Rungs 0.3.1 asks Git for branches merged into a local `main`. In a release or pull-request checkout
that has only the checked-out ref, all six Rungs gate jobs failed with `cannot read git branches;
status not reconciled`, while the same source passed on `main`. The existing F-033 fix removed a
shell portability defect but did not cover absence of the local integration ref.

## Decision

`accepted` — 2026-09-05. Make reconciliation correct and actionable in the Git shapes generated CI
actually creates before enabling that CI in Arena Lab.

## Plan

Accepted but not yet planned. Reproduce local-ref, remote-tracking-ref and genuinely missing-base
states before selecting fallback behavior.

### Requirements

- To be completed before status becomes `planned`.

### Impacts

- To be completed before status becomes `planned`.

### Approach

- To be completed before status becomes `planned`.

### Acceptance criteria / tests

- To be completed before status becomes `planned`.

### Out of scope

- To be completed before status becomes `planned`.

## Execution

Not started.

## Review

Not started.
