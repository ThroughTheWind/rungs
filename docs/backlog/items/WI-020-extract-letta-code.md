---
id: WI-020
title: Extract Letta Code — durable memory, identity, and continual learning
type: docs
status: review
branch: feature/WI-020-extract-letta-code
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

Completed 2026-08-15 on `feature/WI-020-extract-letta-code`.

- Pinned `letta-ai/letta-code` at `ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0`, recorded Apache-2.0,
  and measured the checkout at 1,963 tracked files, 1,706 TypeScript/JavaScript files, and 692
  test-named files.
- Added the durable/local-product extraction at
  [`follow-on/products/letta-code.md`](../../research/follow-on/products/letta-code.md), tracing
  local MemFS initialization, agent-scoped Git memory commits, committed prompt projection,
  revision-triggered recompilation, subagent ownership, permissions, and secrets.
- Kept hosted services and real model execution outside the read boundary; implementation and
  executable-test evidence are cited at the pinned SHA, with opinions labelled and catalogue edits
  deferred to WI-028.
- Validation: `node src/cli.ts check` — 20 pass, 0 fail; site `npm run build` — 80 routes; site
  `npm run check` — 0 Astro diagnostics and 1,027 internal links, 0 broken.

## Review

Self-review completed 2026-08-15 against every acceptance criterion:

1. **Pass.** The Snapshot records the active canonical source, full SHA, Apache-2.0 licence, read
   date, measured scale, local/hosted boundary, and exact inspected directories.
2. **Pass.** The extraction traces a Markdown memory write through Git initialization/commit and
   `memfsRevision` prompt invalidation into the later turn; the pinned local-backend test executes
   the commit and asserts the changed persona reaches the executor.
3. **Pass.** Conversation history, recovery metadata, documentary intent, repository/workspace
   state, and agent-managed long-term memory are separate rows, each with an explicit durability
   limit.
4. **Pass.** Agent/current/parent memory roots, cross-agent denial, stateless fresh subagents,
   local/cloud secret ownership, and model/provider/environment limits are evidenced or bounded as
   outside the checkout.
5. **Pass.** Judgement is marked **Opinion**; section verdicts cite existing and candidate ids; the
   canonical catalogue was not edited.
6. **Pass.** Repository gates, site build, Astro diagnostics, and link validation all pass with the
   counts recorded above.
