---
id: WI-012
title: Extract LangGraph — state, checkpoints, and long-running workflows
type: docs
status: proposed
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-010]
epic: WI-009
children: []
---

## Proposal (rationale)

LangGraph is in the corpus for one question the four private repos never answered: **what does an
agentic workflow do when it is interrupted?**

The existing corpus's answer to durability is documentary — a work item, a findings register, a
handoff note, a session archive. Those exist because a session ends and the next one starts cold,
and every one of the four repos independently reinvented some version of it
([`synthesis.md` §2](../../research/synthesis.md)). LangGraph solves what looks like the same
problem *mechanically*: a graph of steps, a checkpointed state object, resume from the last
checkpoint, and an explicit interrupt for human input.

If those two are really the same problem, then the documentary patterns rungs ships are a
hand-rolled checkpointer, and the framework's vocabulary — what is state, what is a step boundary,
what does resume replay — is a sharper way to describe them. If they are not the same problem, the
difference is worth writing down precisely, because it explains why a durable-execution framework
does not remove the need for a handoff document.

The specific questions:

- **What exactly is checkpointed**, and what is deliberately not? A state model is a claim about
  what matters.
- **What is a step boundary**, and who decides it — the author, or the runtime?
- **What does resume replay** — does a resumed run re-execute side effects, and how is that avoided?
  This is the failure mode a handoff note has too, and nobody in the private corpus named it.
- **How is a human interrupt expressed**, and what is the state of the world while it waits?
- **What does the graph buy over a loop?** The honest version of this question includes what it
  costs, which by §7 of the template must be answered.

> Expectations, not evidence. Confirm at a pinned commit; the project is large and moves fast, and
> anything below about "checkpointers" or "interrupts" is a term to verify, not a finding.

## Decision

`proposed` — 2026-08-15.

## Plan

### Requirements

- `docs/research/frameworks/langgraph.md` on the [WI-010](WI-010-framework-extraction-template.md)
  template, eight sections answered.
- Snapshot pins a commit SHA, license, read date, and per-count commands.
- Section 3 (state and persistence) is the load-bearing one and answers all four questions above
  with file-level evidence.
- Section 8 cites pattern ids and gives a verdict; new practices are named as candidates for
  [WI-017](WI-017-framework-synthesis.md).
- The document states explicitly whether checkpointing and the corpus's documentary handoff patterns
  are the same problem — with the reasoning, marked as opinion if it is one.

### Impacts

- One new document; one row in the frameworks index; site route and links.
- Likely input to [`harness-landscape.md`](../../research/harness-landscape.md)'s primitives
  discussion, but **not edited here** — cross-document reconciliation is WI-017.

### Approach

**Bound the reading before starting.** This is the largest surface area in the corpus after
OpenHands, and an unbounded read produces a summary of the documentation. Pick one non-trivial
graph from the repo's own examples, trace it end to end, and let the eight sections be answered from
that trace plus targeted reads. State in the Snapshot what was read and what was not — a partial
read that says so is evidence; one that does not is a claim about the whole repo.

### Acceptance criteria / tests

1. All eight sections answered; Snapshot carries SHA, license, date, commands, and the read boundary.
2. The four state questions each have a file-level answer or an explicit "could not determine, here
   is where I looked".
3. Section 7 names what the graph abstraction costs, not only what it buys.
4. The checkpoint-versus-handoff question is answered, with opinion marked as opinion.
5. Every count is reproducible at the pinned SHA by the stated command.
6. `rungs check` passes; the site builds with links resolving.

### Out of scope

- **LangChain**, the broader ecosystem, and any hosted platform product. The corpus question is the
  orchestration model; a vendor's managed service is not inspectable and is not it.
- **Recommending or rejecting LangGraph as a dependency for rungs.** rungs is a scaffolder and
  ADR-0002 already fixes its runtime footprint; if the extraction genuinely suggests otherwise that
  is an ADR, not a line in a research file.
- **Cross-repo comparison** — WI-017.
- **Editing `pattern-catalog.md` or `harness-landscape.md`** — WI-017.

## Execution

Not started.

## Review

Not started.
