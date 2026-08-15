---
id: WI-020
title: Extract Letta Code — durable memory, identity, and continual learning
type: docs
status: planned
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-017, WI-019, WI-028]
epic: WI-018
children: []
---

## Proposal (rationale)

The fixed framework corpus distinguishes conversation history, recovery checkpoints, and
documentary intent, but none of its planned subjects centers an agent that edits and versions its
own long-term context. [Letta Code](https://github.com/letta-ai/letta-code) is selected to test that
boundary: what an agent remembers, who may mutate it, when a mutation affects later behaviour, how
identity survives model or environment changes, and how shared memory avoids ownership collisions.

The older `letta-ai/letta` repository now describes itself as a legacy server and points active
development elsewhere. That lineage is a useful retirement finding, but the extraction's primary
source must be the active Letta Code repository established at execution time.

The selection is a hypothesis, not evidence that the advertised memory contract is implemented as
expected. The extraction must trace the implementation and record any mismatch.

## Decision

`accepted` — 2026-08-15. The follow-on method in WI-019 is complete and the user directed the
research to continue. This is the first durable/local-product extraction under WI-018.

## Plan

### Requirements

- Pin the active canonical repository, full SHA, licence, read date, measured scale, and explicit
  boundary between local implementation and unavailable hosted services.
- Trace one message through context construction, in-context memory, external memory, persistence,
  and the point at which a committed memory change affects a later turn.
- Identify memory ownership and namespaces for agent, project, global, and shared state, including
  what prevents or permits cross-agent mutation.
- Distinguish conversation search, summaries, memory blocks, skills, scheduled reflection, and
  repository state rather than calling all continuity "memory".
- Trace secret handling and remote-environment routing far enough to state what crosses the memory,
  execution, and trust boundaries.
- Map the findings to existing pattern ids or named candidates without editing the catalogue.

### Impacts

- One durable/local-product extraction at the path established by WI-019 and one index row.
- Candidate evidence for `session-handoff`, `prompt-writes-artifact`, scoped instructions,
  ownership, and concurrency patterns; adjudication remains WI-028.

### Approach

Read the local-first path as primary. Follow one memory mutation from tool call to durable form and
back into a later compiled context. Use shared memory or sub-agent behaviour only to test ownership
and propagation; do not inventory every feature. Record the legacy-server transition as a retired
practice with its documented reason when the source establishes one.

### Acceptance criteria / tests

1. Snapshot pins the canonical active source and records licence, date, scale, and local/hosted boundary.
2. One memory mutation and later read are traced through named files, functions, and tests.
3. The document distinguishes at least conversation, recovery, documentary, and agent-managed
   long-term state, including what each cannot reconstruct.
4. Agent/shared-memory ownership, secret treatment, and model/environment changes are evidenced or
   bounded as not found.
5. Opinion is labelled; section verdicts cite pattern ids or candidates; no catalogue is edited.
6. `rungs check` and the site link check pass.

### Out of scope

- Evaluating whether remembered content is true, useful, or psychologically identity-like.
- Running or describing hosted Letta services whose implementation is not in the checkout.
- Ranking memory quality or model performance.
- Catalogue, module, or CLI changes.

## Execution

Not started.

## Review

Not started.
