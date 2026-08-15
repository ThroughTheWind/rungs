---
id: WI-019
title: Define methods for the follow-on public-agent research
type: docs
status: in_progress
branch: feature/WI-019-follow-on-research-method
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-010, WI-017, WI-020, WI-021, WI-022, WI-023, WI-024, WI-025, WI-026, WI-027, WI-028]
epic: WI-018
children: []
---

## Proposal (rationale)

The eight follow-on subjects are not eight interchangeable frameworks. Letta Code, Aider, goose,
and Google ADK expose runtime or product mechanisms; Inspect AI and DSPy make claims about
evaluation and optimization; MCP and A2A define interoperability contracts. Reusing
[`frameworks/TEMPLATE.md`](../../research/frameworks/TEMPLATE.md) unchanged would force evaluation
and protocol evidence into headings such as "the core loop" and "composition", then make the
resulting cells appear comparable in synthesis.

This item defines the method before the first follow-on extraction establishes one accidentally.
It preserves WI-010's successful fixed-template discipline while admitting that separate subjects
need separate questions.

## Decision

`accepted` — 2026-08-15. The user directed the follow-on research to start. WI-017 is done, and
[WI-018](WI-018-follow-on-public-agent-research.md) retains this method as the prerequisite for all
eight extractions.

## Plan

### Requirements

- Define a shared comparison spine covering source/claim type, state and identity, external
  boundary, human authority, durable evidence, operating cost, strongest counter-evidence, and
  catalogue consequence.
- Define three thin track templates: durable/local products, evaluation/optimization, and
  interoperability protocols.
- State when evidence must come from implementation or executable tests, when a normative
  specification is the authority, and how documentation-only claims are labelled.
- Require a pinned SHA, licence, read date, measurement commands, explicit read boundary, and
  bounded absence checks in every template.
- Define how a cross-track synthesis may say `not commensurable` instead of forcing a common verdict.
- Decide the directory and index layout without changing the meaning of the existing
  `docs/research/frameworks/` corpus.

### Impacts

- New method, templates, and index scaffolding under `docs/research/`.
- A pointer from [`research/README.md`](../../research/README.md) once the follow-on location exists.
- WI-020 through WI-028 consume the method; no extraction content is written here.

### Approach

Start from WI-010's evidence prompts, not its eight headings. Keep fields that are genuinely common
and create track addenda for the rest. Exercise each template against one named question from its
planned children without reading the source deeply enough to produce findings; the first actual
extraction may propose corrections, but must record the reason.

### Acceptance criteria / tests

1. The shared spine and all three track templates exist and name the claim types they admit.
2. Each template requires SHA, licence, date, scope, evidence labels, and counter-evidence.
3. The protocol template distinguishes normative requirements, optional capabilities, reference
   implementation behaviour, and application policy.
4. The evaluation template distinguishes task definition, execution environment, evidence log,
   scoring, aggregation, and optimizer feedback.
5. The product template distinguishes conversation memory, recovery state, documentary intent,
   repository state, and agent-managed long-term memory.
6. `rungs check` passes and the site reports no broken internal links.

### Out of scope

- Performing any of the eight extractions.
- Editing the existing six framework documents or retrofitting them to the new templates.
- Catalogue, module, or CLI changes.

## Execution

Started 2026-08-15 on `feature/WI-019-follow-on-research-method`.

## Review

Not started.
