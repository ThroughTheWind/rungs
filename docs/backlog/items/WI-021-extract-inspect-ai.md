---
id: WI-021
title: Extract Inspect AI — reproducible agent evaluation and sandboxed evidence
type: docs
status: in_progress
branch: feature/WI-021-extract-inspect-ai
created: 2026-08-15
updated: 2026-08-15
related: [WI-017, WI-019, WI-027, WI-028]
epic: WI-018
children: []
---

## Proposal (rationale)

The current corpus contains deterministic model substitutes, structured-output validators, traces,
and tests, but it does not read an evaluation system as the subject. That leaves an important gap:
how a task definition, agent trajectory, sandbox, scorer, evidence log, aggregation, retry, and
reproduction contract fit together.

[Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai) is selected because its public source
is explicitly organized around language-model evaluations and includes tool-using, multi-turn and
sandboxed execution. The extraction asks what an evaluation result actually proves, what evidence
survives the run, and where model-graded or human judgement enters a result that may otherwise look
mechanical.

## Decision

`accepted` then `planned` — 2026-08-15. The user directed the follow-on research to continue after
WI-019 completed the evaluation-track method and WI-020 demonstrated the extraction workflow. This
item is the evaluation-system child of [WI-018](WI-018-follow-on-public-agent-research.md); its
requirements, impacts, approach, and acceptance criteria above are now the execution contract.

## Plan

### Requirements

- Pin repository SHA, licence, date, measured scale, and the exact evaluation packages and tests read.
- Trace one agentic evaluation from dataset/sample construction through solver execution, model and
  tool calls, sandbox interaction, scoring, aggregation, and durable result log.
- State which inputs and environment details are sufficient to reproduce a run and which external
  model or infrastructure behaviours remain outside the record.
- Distinguish deterministic scoring, model-graded scoring, human review, and aggregation; state the
  claim boundary of each.
- Trace failure, retry, cancellation, partial result, and resume semantics where present.
- Map findings to gate, audit, evidence, bounded-loop, and sandbox candidates without editing the catalogue.

### Impacts

- One evaluation/optimization extraction and an index row under WI-019's layout.
- Candidate evidence for the distinction between execution traces, audit inputs, gates, scores,
  and conclusions; WI-028 decides catalogue consequences.

### Approach

Choose one small evaluation that uses an agent loop and a sandbox, then follow its actual objects
and stored artifacts end to end. Use built-in components rather than a third-party evaluation so
the read boundary remains in one pinned repository. Treat the presence of many evaluations as an
inventory claim to measure, not a proxy for framework quality.

### Acceptance criteria / tests

1. Snapshot and read boundary make every implementation and count claim reproducible.
2. One evaluation is traced from sample input to stored result and aggregate score.
3. The extraction states what the log can replay, audit, or merely describe, with failure paths included.
4. Every scorer type inspected has an explicit claim boundary; a numeric result is not presented as truth.
5. The sandbox trust boundary and external dependencies are traced or bounded as not found.
6. Opinion is labelled; catalogue candidates are deferred to WI-028; gates and site links pass.

### Out of scope

- Running expensive model evaluations or comparing model performance.
- Surveying the external evaluation collection as a second corpus.
- Security certification of sandbox backends.
- Catalogue, module, or CLI changes.

## Execution

Completed 2026-08-15 on `feature/WI-021-extract-inspect-ai`.

- Pinned `UKGovernmentBEIS/inspect_ai` at `d482209d573cdde116cc0f28abfb01712e91e80c`, recorded
  MIT, and measured the checkout at 2,088 tracked files, 1,565 Python files, 773 test-named/test
  directory files, 186 documentation files, and 110 task definitions.
- Added [`inspect-ai.md`](../../research/follow-on/evaluations/inspect-ai.md) and updated the
  follow-on index. The extraction traces the `examples/tool_use.py` `bash` task through task/sample
  construction, solver/model/tool events, local sandbox lifecycle, deterministic scoring, recorder
  flush, aggregate results, retries, cancellation, and checkpoint/crash recovery.
- Explicitly separates deterministic, model-graded, and human-approval boundaries; records the
  local sandbox's current-user execution counterexample; labels opinions and defers catalogue edits
  to WI-028. No module or CLI file changed.
- Validation: `node src/cli.ts check` — 20 pass, 0 fail; site `npm run build` — 81 pages; site
  `npm run check` — 0 Astro diagnostics and 1,037 internal links, 0 broken. The source checkout was
  not live-executed because this environment has no Python runtime or model credentials; the
  extraction cites the pinned repository's mock-model/sandbox tests instead.

## Review

Self-review completed 2026-08-15 against every acceptance criterion:

1. **Pass.** Snapshot, MIT licence, full SHA, measured scale, read date, and bounded paths are
   recorded in the extraction; all implementation links resolve to the pinned commit.
2. **Pass.** The `bash` example is traced from sample input through solver/model/tool calls,
   sandbox events, scorer, recorder, and `EvalResults`/reductions.
3. **Pass.** The extraction distinguishes observation/replay, checkpoint resume, crash recovery,
   and missing in-flight/unflushed data, and includes retry/cancel/partial-result paths.
4. **Pass.** Deterministic predicates, model-graded scores, epoch reducers, and human approval are
   given separate claim boundaries; no numeric result is presented as truth.
5. **Pass.** Sandbox provider setup/cleanup, concurrency, local current-user execution, and
   external model/image/network authorities are explicitly bounded.
6. **Pass.** Opinions are labelled, catalogue candidates are deferred to WI-028, no modules changed,
   `rungs check` passed 20/20, and the site build/link check passed with 0 broken links.
