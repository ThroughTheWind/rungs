---
id: WI-017
title: Synthesize the framework corpus and reconcile it with the pattern catalogue
type: docs
status: proposed
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-010, WI-011, WI-012, WI-013, WI-014, WI-015, WI-016]
epic: WI-009
children: []
---

## Proposal (rationale)

Six extractions are six documents. The thing that made Phase 1 useful was Phase 2 — the pass that
put four repos in one table and turned them into convergences, divergences, eight failure modes and
a maturity ladder. Without the equivalent pass, this corpus is a reading list, and a reading list
does not change what rungs ships.

This item exists to do one specific job that none of the six extractions may do: **decide what the
independent evidence does to the existing catalogue.** Each extraction is forbidden from editing
[`pattern-catalog.md`](../../research/pattern-catalog.md) precisely so that this decision is made
once, with all six in view, rather than six times by whoever happened to be writing that day.

Three outcomes are expected, and all three are worth writing down:

- **Confirmed.** A pattern the four private repos converged on that independent teams also arrived
  at. It gets a much stronger claim, and the sources named.
- **Demoted.** A pattern that turns out to be one operator's habit, or one that the frameworks solve
  a different and better way. Demotion is the finding here; a catalogue that only ever grows is not
  being checked.
- **New.** A practice six teams share that the four repos never invented. The most valuable category
  and the reason for the whole epic.

There is a fourth outcome the synthesis must be honest about: **the two corpora may not be
commensurable.** The four repos are read for workflow and the six for architecture, and a pattern
"confirmed" across that boundary may be two different things wearing one name. Where that is the
case, saying so is the finding — silently merging them would put an architecture claim into a
catalogue that module authoring reads as workflow evidence.

## Decision

`proposed` — 2026-08-15. Last child of [WI-009](WI-009-public-agent-framework-corpus.md); requires
all six extractions done.

## Plan

### Requirements

- `docs/research/frameworks/synthesis.md`, structured for comparison first: a six-column table on
  the template's own sections, then convergences, then divergences, then what nobody solved.
- **A reconciliation table** with one row per affected pattern id: `confirmed` / `demoted` / `new` /
  `not commensurable`, the evidence, and the resulting change.
- The corresponding edits to [`pattern-catalog.md`](../../research/pattern-catalog.md) — sources
  added, rungs changed, new patterns admitted — each traceable to a row in that table.
- Where a finding contradicts something in [`synthesis.md`](../../research/synthesis.md) or
  [`harness-landscape.md`](../../research/harness-landscape.md), **amend in place with a dated note**,
  the way `harness-landscape.md` amends synthesis §3.1. Do not leave two documents disagreeing.
- Every claim traced to one of the six documents and through it to a pinned SHA; opinion in the
  first person and marked.
- Any module change the evidence warrants is **opened as a new item**, not made here.

### Impacts

- New `frameworks/synthesis.md`; edits to `pattern-catalog.md`; possible dated amendments to
  `synthesis.md` and `harness-landscape.md`; `frameworks/README.md` and `research/README.md` reading
  order updated.
- **An ADR is likely.** Changing a pattern's rung or its target module is a design decision that
  binds module authoring — ADR criteria 1 and 2. Whether one or several is not decidable before the
  evidence exists; the requirement is that the choice is stated.
- Site: several routes, and a link surface large enough that the checker is the real test.

### Approach

**Comparison table first, prose second.** The table is what forces the six documents into the same
shape and exposes where an extraction quietly skipped a section; writing the prose first would let
that pass.

**Reconcile by id, not by theme.** Every row names a pattern id from the existing catalogue, or
proposes a new one. A synthesis that discusses themes without touching ids leaves the catalogue —
the actual input to module authoring — unchanged, which is the failure mode this item exists to
avoid.

**Demotions get the same evidence standard as confirmations.** It is easier to add a source than to
remove a pattern, and an unchecked catalogue drifts toward everything-is-a-pattern.

### Acceptance criteria / tests

1. `frameworks/synthesis.md` exists with the six-column table, every cell filled or explicitly marked
   not-applicable with a reason.
2. The reconciliation table covers every candidate pattern named in the six extractions; no candidate
   is left unadjudicated.
3. Every catalogue edit traces to a reconciliation row; every reconciliation row traces to a document
   and a SHA.
4. At least one *demotion or non-commensurability* row, or an explicit evidenced statement that the
   independent corpus contradicted nothing — stated as a finding either way, because "everything was
   confirmed" is a result that should be argued rather than assumed.
5. No document in `docs/research/` contradicts another; contradictions are amended in place and dated.
6. Module changes appear as new work items, not as edits under this item.
7. `rungs check` passes; the site builds with 0 broken links.

### Out of scope

- **Any change to `modules/` or to the CLI.** This item ends at the catalogue; what the catalogue
  implies for a module is the next item, and conflating them is exactly the scope creep
  [`docs/backlog/README.md` §6](../README.md) forbids.
- **Re-reading any of the six repos.** If a document is inadequate, that is a defect in that
  extraction's item, or a new item — not a re-run folded in here.
- **Re-surveying the four original repos** — WI-009's boundary.
- **A merged, single catalogue spanning both corpora.** The reconciliation may conclude that one is
  needed; producing it would be a separate item with its own ADR.

## Execution

Not started.

## Review

Not started.
