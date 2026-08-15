---
id: WI-026
title: Extract A2A — remote agent discovery, tasks, and artifacts
type: docs
status: in_progress
branch: feature/WI-026-extract-a2a
created: 2026-08-15
updated: 2026-08-15
related: [WI-013, WI-015, WI-017, WI-019, WI-024, WI-025, WI-028]
epic: WI-018
children: []
---

## Proposal (rationale)

Every composition mechanism in the fixed framework corpus runs inside one application or framework
boundary. Handoffs and sub-agents can therefore share runner state, tracing, callbacks, and trust
assumptions. That evidence does not answer collaboration with an independently operated, opaque
agent whose internal memory and tools are unavailable.

The [Agent2Agent protocol repository](https://github.com/a2aproject/A2A) is selected to study that
boundary: capability discovery, remote task identity, streaming and asynchronous progress,
artifacts, cancellation, authentication declarations, and the point at which delegation changes
ownership without transferring internal state.

## Decision

`accepted` — 2026-08-15. Captured as the remote-agent protocol child of
[WI-018](WI-018-follow-on-public-agent-research.md), after WI-019.

## Plan

### Requirements

- Pin specification SHA, licence, released protocol version, normative schema/protobuf, date, and read boundary.
- Trace one interaction from Agent Card discovery through interface and authentication selection,
  message submission, task state transitions, streaming or push updates, artifacts, and terminal outcome.
- Define ownership at each transition: caller task, remote agent execution, context, artifact, retry,
  cancellation, and continuation.
- State which remote data is untrusted and how identity, authorization, tenancy, replay, idempotency,
  and duplicate delivery are specified or left to implementations.
- Distinguish normative requirements, optional capabilities, transport bindings, SDK behaviour, TCK
  coverage, and sample behaviour; pin additional repositories separately if used.
- Map findings to handoff, neighbour, session, explicit output, approval, and audit candidates without editing the catalogue.

### Impacts

- One interoperability-protocol extraction and index row.
- Evidence that can test whether in-process handoff patterns survive an opaque remote boundary;
  comparison with MCP and frameworks remains WI-028.

### Approach

Begin with the normative task and Agent Card models. Follow one transport binding end to end, then
use the TCK or one official SDK only to establish executable conformance boundaries. Treat claims
about enterprise readiness as positioning until authentication, observability, and lifecycle
requirements are located in normative text or executable checks.

### Acceptance criteria / tests

1. Snapshot identifies normative source/version and separately pins every SDK, TCK, or sample source used.
2. One task lifecycle is traced from discovery to terminal state and artifact delivery.
3. Ownership, retry, cancellation, duplicate, and failure semantics are explicit or have bounded absence evidence.
4. Authentication declaration is distinguished from authenticated identity and authorization enforcement.
5. Opaque-agent trust and prompt/data injection boundaries are recorded without turning guidance into guarantees.
6. Opinion is labelled; catalogue work remains WI-028; gates and site links pass.

### Out of scope

- Ranking A2A implementations or surveying adopters.
- Auditing production identity providers, networks, or remote agents.
- Re-extracting Google ADK's internal runtime; WI-024 owns that subject.
- Comparing A2A with MCP inside this extraction.
- Catalogue, module, or CLI changes.

## Execution

Started 2026-08-15 on `feature/WI-026-extract-a2a`. The normative read set is the released
`1.0.0` specification and `specification/a2a.proto`; no SDK or TCK behavior is used unless
separately pinned and labelled.

## Review

Not started.
