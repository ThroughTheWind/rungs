---
id: WI-019
title: Define methods for the follow-on public-agent research
type: docs
status: done
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
[WI-018](../items/WI-018-follow-on-public-agent-research.md) retains this method as the prerequisite for all
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

Completed 2026-08-15 on `feature/WI-019-follow-on-research-method`.

- Created [`research/follow-on/`](../../research/follow-on/README.md) as a third corpus location,
  leaving the fixed six-framework corpus unchanged.
- Defined one [shared comparison spine](../../research/follow-on/SHARED-SPINE.md) and separate
  [product](../../research/follow-on/PRODUCT-TEMPLATE.md),
  [evaluation](../../research/follow-on/EVALUATION-TEMPLATE.md), and
  [protocol](../../research/follow-on/PROTOCOL-TEMPLATE.md) addenda.
- Made claim authority explicit through Normative, Implemented, Executed, Measured, Documented,
  and Opinion labels, including a cross-track rule that admits analogy and non-commensurability.
- Exercised each template against one accepted selection question without reading the source or
  creating premature findings; the fit checks are recorded in the follow-on index.
- Validation: `node src/cli.ts check` — 20 pass, 0 fail; site `npm run build` — 79 routes; site
  `npm run check` — 0 Astro diagnostics and 779 internal links, 0 broken.

## Review

Self-review completed 2026-08-15 against every acceptance criterion:

1. **Pass.** The shared spine exists, and all three track templates name the evidence labels they
   admit and the subjects that consume them.
2. **Pass.** Every track composes with the shared Snapshot and counter-evidence sections, which
   require a full SHA, licence, read date, included/excluded scope, measurement commands, explicit
   evidence labels, and the strongest falsifying result.
3. **Pass.** The protocol authority table separates normative requirements, negotiated optional
   capabilities, reference implementation behaviour, and application policy; requirement levels
   and independent pins are mandatory.
4. **Pass.** The evaluation contract has distinct required rows for task/sample, execution
   environment/tools, evidence log, scorer, aggregation/uncertainty, and optimizer feedback, with a
   reasoned not-applicable route for evaluation-only subjects.
5. **Pass.** The product continuity matrix keeps conversation history, recovery state, documentary
   intent, repository state, and agent-managed long-term memory separate and requires traced
   write/read and retention boundaries.
6. **Pass.** Repository gates, site build, Astro diagnostics, and internal-link validation all pass
   with the counts recorded above.
