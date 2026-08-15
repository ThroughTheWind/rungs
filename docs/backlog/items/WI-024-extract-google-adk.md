---
id: WI-024
title: Extract Google ADK — multi-language evolution, task delegation, and evaluation
type: docs
status: done
branch: feature/WI-024-extract-google-adk
created: 2026-08-15
updated: 2026-08-15
related: [WI-013, WI-015, WI-017, WI-019, WI-026, WI-028]
epic: WI-018
children: []
---

## Proposal (rationale)

OpenAI Agents SDK and Microsoft Agent Framework already show that language parity exposes which
parts of an abstraction are essential and which are idiomatic or release-timed. Google ADK adds a
different pressure: a broad framework family with agent and workflow runtimes, structured task
delegation, tool confirmation, evaluation and explicit session/event evolution.

[Google ADK for Python](https://github.com/google/adk-python) is the primary proposed source. Its
public landing page currently warns of breaking changes to agent APIs, events, and session schemas
and links implementations in several languages. Those are documented expectations only; the
extraction must pin the actual version, compatibility contract, and one bounded parity comparison.

## Decision

`accepted` — 2026-08-15. Captured as the evolving multi-language framework child of
[WI-018](WI-018-follow-on-public-agent-research.md), after WI-019.

## Plan

### Requirements

- Pin the Python repository SHA, licence, release/version context, read date, and measured scale;
  pin any second-language repository separately.
- Trace one agent or workflow turn through runner, events, session state, task delegation, tool
  invocation, and termination.
- Trace the documented session/event migration in implementation or compatibility tests, stating
  what old state can be read and what cannot.
- Trace one tool-confirmation path and identify action identity, argument binding, durability, and host authority.
- Trace one evaluation path only far enough to compare runtime-owned evidence with WI-021's
  evaluation-system boundary.
- Compare one secondary language on a predeclared mechanism; do not attempt a whole-family inventory.

### Impacts

- One durable/local-product extraction with a separately pinned parity source when used.
- Candidate evidence for schema evolution, backwards-compatible persistence, task handoff,
  approval binding, and protocol integration; WI-028 adjudicates.

### Approach

Read Python as primary. Choose the secondary language after source reconnaissance based on which
implementation has executable coverage of the selected mechanism. Center the breaking session and
event boundary because silent incompatibility in persisted state is more consequential than API spelling.

### Acceptance criteria / tests

1. Every source has its own SHA, licence, date, scope, and measurement commands.
2. One runtime path and one persisted-schema migration path are traced through implementation and tests.
3. Tool confirmation states what is bound, durable, authenticated, and host-owned.
4. The parity comparison classifies each difference as idiom, design divergence, migration timing,
   or not established.
5. Evaluation and A2A claims are bounded; opinion is labelled; catalogue work remains WI-028.
6. `rungs check` and site links pass.

### Out of scope

- Surveying every ADK language or cloud deployment target.
- Hosted Vertex AI behaviour not implemented in the pinned public repositories.
- Benchmarking models or framework performance.
- Full A2A protocol analysis, which is WI-026.
- Catalogue, module, or CLI changes.

## Execution

Started 2026-08-15 on `feature/WI-024-extract-google-adk`. The Python repository is the primary
source; the Java repository is the bounded parity source for runner, event/session, and tool
confirmation mechanisms.

## Review

Review complete 2026-08-15; status set to done after all acceptance criteria passed.

- [x] Each source has its own pinned SHA, Apache-2.0 licence, read date, release context, scope,
  and reproducible checkout measurement.
- [x] The Python runtime path follows runner setup, session/user event, event queue, delegation
  scope, tool call, non-partial persistence, and termination through implementation and tests.
- [x] The v0 pickle to v1 JSON migration path covers schema detection, metadata, migration runner,
  compatibility window, stale-writer checks, and migration/session tests.
- [x] Tool confirmation identifies function-call binding, original arguments, persistence boundary,
  resume behavior, and the host-owned/authentication gap.
- [x] Evaluation is bounded to ADK's local inference/metric-result path and explicitly separated
  from WI-021's Inspect AI evidence boundary; A2A is limited to the adapter note and WI-026.
- [x] Java parity differences are classified as idiom, design divergence, migration timing, or
  not established; no whole-family parity claim is made.
- [x] No catalogue, module, or CLI files changed.
- [x] Verification: `node src/cli.ts check` (20 pass); `git diff --check`; `site/npm run build`
  (84 pages); `site/npm run check` (0 Astro diagnostics, 1,067 internal links, 0 broken).
