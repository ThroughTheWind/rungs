---
id: WI-028
title: Synthesize the follow-on research and reconcile the catalogue
type: docs
status: done
branch: feature/WI-028-follow-on-synthesis
created: 2026-08-15
updated: 2026-08-15
related: [WI-017, WI-019, WI-020, WI-021, WI-022, WI-023, WI-024, WI-025, WI-026, WI-027]
epic: WI-018
children: []
---

## Proposal (rationale)

Eight extractions across three tracks are not a result until their findings are compared and every
catalogue candidate is adjudicated. The danger is larger than in WI-017: memory, evaluation,
runtime products, and interoperability protocols can use the same words—session, tool, handoff,
state, trace, approval—while assigning them different owners and guarantees.

This item first compares like with like inside each track, then asks which findings genuinely cross
tracks. It is the only child authorized to reconcile the follow-on evidence with
[`pattern-catalog.md`](../../research/pattern-catalog.md).

## Decision

`accepted` — 2026-08-15. Last child of
[WI-018](WI-018-follow-on-public-agent-research.md); execution follows all eight extractions.

## Plan

### Requirements

- Produce one comparison table per track using WI-019's template, with every cell filled or marked
  not applicable with a reason.
- Produce a cross-track boundary table for overloaded terms including state, session, memory,
  handoff, tool, approval, trace/log, result/artifact, identity, and ownership.
- Adjudicate every candidate from WI-020 through WI-027 as `confirmed`, `contradicted`, `new`,
  `track-specific`, or `not commensurable`.
- Trace every synthesis claim through an extraction to a pinned SHA and distinguish normative,
  implementation, measurement, documentation, and opinion evidence.
- Edit the catalogue only where a reconciliation row supports the change; add dated amendments to
  existing synthesis documents when they would otherwise contradict the new conclusion.
- Open separate work items for any module or CLI change implied by the research.

### Impacts

- Follow-on synthesis document and index/read-order updates.
- Evidence-backed edits to [`pattern-catalog.md`](../../research/pattern-catalog.md) and possibly
  dated amendments to existing synthesis documents.
- An ADR when a catalogue change alters a rung, module target, or another binding product decision.
- New work items, not implementation, for downstream module or CLI consequences.

### Approach

Build the three within-track tables before writing prose. Reconcile by pattern id or explicitly
named candidate, not by theme. For cross-track vocabulary, write ownership and guarantee as part of
the definition; a shared noun is not convergence when one source means an in-memory callback and
another means a remote protocol state machine.

### Acceptance criteria / tests

1. Three complete within-track tables and one cross-track boundary table exist.
2. Every candidate in all eight extractions has exactly one adjudication row with pinned provenance.
3. Every catalogue edit traces to an adjudication; every adjudication states evidence type and track.
4. At least one contradiction, track-specific result, or non-commensurability is recorded, or the
   absence of all three is explicitly argued from the evidence.
5. Existing research documents do not silently disagree; dated amendments identify changed conclusions.
6. Module and CLI consequences appear only as new work items.
7. `rungs check` and the site build/link check pass.

### Out of scope

- Re-reading or expanding WI-009's six source repositories.
- Adding more follow-on subjects during synthesis.
- Editing `modules/` or CLI implementation.
- Framework or product rankings and benchmark comparisons.

## Execution

Started 2026-08-15 on `feature/WI-028-follow-on-synthesis`. The synthesis read boundary is the
eight completed follow-on extractions, WI-019's shared spine and track templates, and the current
pattern catalogue. It will compare within tracks first, classify cross-track vocabulary by owner
and guarantee, and defer any module or CLI consequence to a new work item.

## Review

Review completed 2026-08-15; item complete. The synthesis compares all four durable/local products, both
evaluation/optimization subjects, and both interoperability protocols using complete within-track
tables plus a ten-term cross-track boundary table. It contains exactly 46 candidate adjudication
rows (every candidate from WI-020 through WI-027), each routed to a pinned extraction and labelled
confirmed, contradicted, or track-specific. It records a contradiction (`test-substitution`) and
multiple non-commensurable/track-specific results, explains why no catalogue edit is warranted, and
keeps module/CLI consequences behind WI-029. Index states now match the completed items. `rungs
check` passes 20/20; site build/check passes with 88 routes, 1,127 internal links, and 0 broken
links. No `modules/` or CLI implementation files changed.
