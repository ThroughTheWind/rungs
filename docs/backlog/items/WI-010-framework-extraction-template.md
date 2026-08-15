---
id: WI-010
title: A fixed template and method for the public-framework corpus
type: docs
status: in_progress
branch: feature/WI-010-framework-extraction-template
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-011, WI-017]
epic: WI-009
children: []
---

## Proposal (rationale)

Six extractions written without a shared template are six essays. The roadmap names this as the
single thing Phase 1 got right — *"Four repos on one template, so they could be compared column by
column rather than read as four essays"* ([roadmap.md](../../roadmap.md), 1 → 2) — and it is the
reason [`synthesis.md` §1](../../research/synthesis.md) can put four repos in one table.

The existing template does not transfer. Its seven sections
([`research/README.md`](../../research/README.md)) measure a *workflow*: what works, what doesn't,
pain points → how they were solved, extraction verdict. Applied to LangGraph, "pain points → how
they were solved" would describe LangGraph's issue tracker, which is not what the corpus is being
read for. The subject is architecture, and the architecture questions are different ones.

So this item writes the second template, and — equally important — writes down where the second
corpus lives and how it is kept honest, before six documents establish that by accident.

## Decision

`accepted` — 2026-08-15. The user directed work on the research epic to start; this template is
the planned prerequisite for the other seven children of
[WI-009](WI-009-public-agent-framework-corpus.md).

## Plan

### Requirements

- A `TEMPLATE.md` under `docs/research/frameworks/` with fixed sections, so the six are comparable
  row-by-row. Working proposal, to be revised by the first extraction:
  1. **Snapshot** — repo URL, **pinned commit SHA**, date read, license, language(s), measured scale
     (files, LOC, or whatever is cheap and honest), and the command that measured it
  2. **The core loop** — what one agent turn actually is, traced to the file and function that runs it
  3. **State and persistence** — what is stored, where, what survives a crash, what a resume replays
  4. **Tools and the outside world** — how a tool is declared, invoked, sandboxed, and how failures return
  5. **Composition** — multi-agent, handoff, sub-agent, or none; and what the boundary is
  6. **The human in the loop** — interruption, approval, and steering, if any
  7. **The abstraction bargain** — what the framework makes easy, what it makes hard, and what it
     refuses to do. The section that carries the opinion, marked as opinion
  8. **What rungs takes** — take / take-as-warning / leave, and against which pattern id
- A `README.md` index for the directory, stating the method and the corpus's question.
- A **commit-pinning rule**, written where an extractor meets it: a count from a moving repo without
  a SHA is not reproducible, and the SHA — not the date — is what a re-reader checks out.
- A **license and quotation rule**: record each repo's license in its Snapshot; quote sparingly and
  with attribution; never restate a documented behaviour as though it were measured.
- One line in [`research/README.md`](../../research/README.md) distinguishing the two axes, so the
  workflow corpus's stated non-goal and this corpus's subject do not read as a contradiction.

### Impacts

- New `docs/research/frameworks/{README.md,TEMPLATE.md}`.
- [`research/README.md`](../../research/README.md) — the two-axis line and a pointer.
- Site: `docs/**` is globbed into the wiki, so two new routes and their links.
- **No ADR.** This is a research convention, not a product decision; ADR criterion 4 — it changes no
  behaviour and binds no module.

### Approach

**Mirror the existing template's shape, not its questions.** Eight sections that end in a verdict,
because the verdict is what Phase 2 consumed. Keeping the *arc* identical (snapshot → mechanism →
judgement → verdict) is what lets a reader who knows `repos/` read `frameworks/` without relearning.

**Write the template thin and let the first extraction correct it.** Phase 4 produced sixteen
corrections to the module format, all found by authoring rather than reading; the same is expected
here, which is why [WI-011](WI-011-extract-swe-agent.md) is scheduled as the template's first test
and is explicitly allowed to change it.

**Separate directory, not a subheading.** `frameworks/` beside `repos/` keeps one definition per
concept and keeps the workflow corpus's non-goal true as written.

### Acceptance criteria / tests

1. `docs/research/frameworks/TEMPLATE.md` exists with the eight sections, each with a one-line
   statement of what it is for.
2. The Snapshot section requires a commit SHA and a license, and the template says why in one line —
   a required field with no reason gets filled with a plausible guess.
3. `docs/research/frameworks/README.md` states the corpus question, the method, and the
   commit-pinning and quotation rules.
4. [`research/README.md`](../../research/README.md) distinguishes the two axes and links the new index.
5. `rungs check` passes; the site builds with 0 broken links.

### Out of scope

- **Any actual extraction.** The template is not exercised here; that is
  [WI-011](WI-011-extract-swe-agent.md), which is also where its first corrections come from.
- **Changing the existing `repos/` template or any of the four extractions.** They were measured
  2026-08-14 and are not reopened. If the new template suggests a better question, that is a finding.
- **A second pattern catalogue.** Section 8 cites ids from the existing
  [`pattern-catalog.md`](../../research/pattern-catalog.md); reconciling the catalogue is
  [WI-017](WI-017-framework-synthesis.md).
- **A gate that enforces the SHA field.** Worth considering once six documents exist and the shape
  is known; premature now, and `nothing deferred` beyond this note.

## Execution

Branch `feature/WI-010-framework-extraction-template`, cut from `main` 2026-08-15.

## Review

Not started.
