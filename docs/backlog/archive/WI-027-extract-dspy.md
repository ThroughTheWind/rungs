---
id: WI-027
title: Extract DSPy — metric-driven agent program optimization
type: docs
status: done
branch: feature/WI-027-extract-dspy
created: 2026-08-15
updated: 2026-08-15
related: [WI-014, WI-017, WI-019, WI-021, WI-028]
epic: WI-018
children: []
---

## Proposal (rationale)

The current research studies instructions as maintained artifacts and agent loops as runtimes, but
it does not study a system that deliberately transforms a language-model program under an explicit
metric. Without that evidence, recommendations about prompts, examples, skills, or validation remain
mostly about authoring and enforcement rather than measured improvement.

[DSPy](https://github.com/stanfordnlp/dspy) is selected to separate two loops that are often
conflated: the runtime program that answers one input and the optimizer that evaluates candidates
and emits a changed program. The extraction asks what the metric can prove, what data and model
calls the optimizer consumes, what artifact is produced, and how overfitting, leakage, cost, and
reproducibility are exposed to the author.

## Decision

`accepted` — 2026-08-15. Captured as the optimization child of
[WI-018](../items/WI-018-follow-on-public-agent-research.md), after WI-019.

## Plan

### Requirements

- Pin repository SHA, licence, date, measured scale, optimizer/module packages, and executable tests read.
- Trace one agent-capable DSPy program through signature/module execution, metric evaluation,
  candidate generation, optimizer selection, and the compiled or transformed result.
- Distinguish training examples, demonstrations, validation data, held-out evaluation, textual
  feedback, model responses, and final program state.
- State determinism, cache, seed, model/provider, concurrency, and cost boundaries that affect reproduction.
- Trace optimizer failure, invalid output, empty candidate, and interruption behaviour where present.
- Map findings to evidence, structural/semantic gates, prompt artifacts, test substitution, and
  bounded-loop candidates without editing the catalogue.

### Impacts

- One evaluation/optimization extraction and index row.
- Evidence about generated prompt/program artifacts and metric claim boundaries; comparison with
  Inspect AI remains WI-028.

### Approach

Choose one optimizer with a small executable test and one program containing an agent or iterative
module. Trace the data and artifact flow rather than reporting benchmark results. Treat an improved
metric as evidence only for that metric, dataset, model, and run boundary.

### Acceptance criteria / tests

1. Runtime and optimization loops are separately traced through named files, functions, and tests.
2. The resulting compiled/transformed artifact and its serializable or reproducible boundary are explicit.
3. Metric, dataset split, model calls, cache/seed, and cost each have a stated claim boundary.
4. Leakage and overfitting safeguards are evidenced or bounded as not found.
5. No benchmark score is used as a framework ranking; opinion is labelled; catalogue edits wait for WI-028.
6. `rungs check` and site links pass.

### Out of scope

- Reproducing research-paper benchmarks or comparing optimizers by score.
- Fine-tuning model weights unless needed to state an interface boundary.
- General RAG or classifier architecture unrelated to the selected agent-capable path.
- Catalogue, module, or CLI changes.

## Execution

Started 2026-08-15 on `feature/WI-027-extract-dspy`. The read boundary is the pinned
`stanfordnlp/dspy` source at `80b118e52cb1f143a0d80d84685572000c59639e`; the selected executable
path is `ReAct` plus `BootstrapFewShot`, with `Evaluate` and the saving API used to establish
evaluation and artifact boundaries.

## Review

Review completed 2026-08-15; item complete. The extraction pins `stanfordnlp/dspy` commit
`80b118e52cb1f143a0d80d84685572000c59639e`, package `3.3.0`, MIT licence, and a measured
563-file read boundary. It traces `ReAct` execution, `BootstrapFewShot` metric/trace/demo
selection, `Evaluate` scoring/failure aggregation, and JSON/PKL/program saving. Trainset versus
evaluation-set leakage, provider/cache/seed/cost limits, failure handling, and artifact provenance
are explicit. `py -3.13 -m compileall -q` passed for the selected implementation and test files;
the checkout had no pytest module, so tests were read rather than reported as executed. Repository
`rungs check` passes 20/20; site build/check passes with 87 routes, 1,091 internal links, and 0
broken links. No catalogue, module, or CLI files changed; cross-track comparison remains WI-028.
