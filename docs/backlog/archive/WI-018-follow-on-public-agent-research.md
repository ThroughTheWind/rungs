---
id: WI-018
title: Extend public-agent research across memory, evaluation, products, and protocols
type: epic
status: done
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-017]
epic:
children: [WI-019, WI-020, WI-021, WI-022, WI-023, WI-024, WI-025, WI-026, WI-027, WI-028]
---

## Proposal (rationale)

[WI-009](WI-009-public-agent-framework-corpus.md) deliberately fixes six subjects around runtime
architecture: the core loop, checkpointed graphs, small primitives, typed/testable agents,
enterprise workflows, and a sandboxed product. Its synthesis can therefore answer the question it
was designed to answer, but it should not silently be treated as evidence about four materially
different boundaries that its subjects do not center:

- long-lived, agent-managed memory and identity;
- repeatable evaluation and metric-driven improvement;
- local, git-native product operation and protocol-extensible harnesses; and
- interoperability between an agent and tools or between independently operated agents.

This epic proposes a follow-on corpus that tests those boundaries without widening WI-009 during
execution. It contains four runtime/product subjects, two evaluation/optimization subjects, and two
protocol subjects. The split is intentional: forcing all eight through the framework template would
make unlike evidence look comparable merely because the headings matched.

| Track | Subjects | Question |
| --- | --- | --- |
| Durable and local products | Letta Code, Aider, goose, Google ADK | How do memory, repository change, local execution, extensibility, and evolving public contracts survive real product boundaries? |
| Evaluation and optimization | Inspect AI, DSPy | How is agent behaviour made reproducible, scored, compared, and deliberately improved? |
| Interoperability protocols | MCP, A2A | What identities, capabilities, lifecycle, state, errors, and trust assumptions cross process and ownership boundaries? |

The repository names and questions are **selection hypotheses, not research findings**. Each child
must pin source, establish licence, inspect implementation or normative artifacts, and record when
the proposed question does not match the source.

## Decision

`accepted` — 2026-08-15. The user directed the follow-on research to start after the recommendations
were captured. [WI-017](WI-017-framework-synthesis.md) and its parent corpus are done, so the method
prerequisite is now unblocked; the epic remains sequenced method → extractions → synthesis.

## Plan

### Requirements

- One method item, eight subject extractions, and one synthesis; membership is fixed by `children`.
- Every public source is recorded at a full commit SHA with its licence and read boundary.
- The method keeps the three tracks distinguishable while retaining a small shared comparison
  spine: source boundary, state, external interaction, human authority, evidence artifacts, cost,
  and catalogue consequence.
- Per-subject children propose catalogue candidates but do not edit the catalogue; WI-028
  reconciles once across all eight.
- Execution begins only after WI-017 records what the original framework corpus already answered,
  so this epic addresses measured gaps rather than the expectations in this proposal.

### Impacts

- New research method and extraction documents under a location selected by WI-019.
- A follow-on synthesis and possible evidence-backed edits to
  [`pattern-catalog.md`](../../research/pattern-catalog.md).
- Possible dated amendments to existing synthesis documents when independent evidence contradicts
  them.
- No module or CLI changes under this epic; any such implication becomes a separate work item.

### Approach

**Close, then extend.** Complete WI-017 first. WI-019 then converts the gaps found there into track
templates and read boundaries. The eight extractions may proceed independently after the method is
accepted. WI-028 compares within each track before making any cross-track claim.

**Prefer a bounded counterexample to another feature inventory.** Each child names one mechanism
to trace end to end and one strongest counter-evidence question. A subject that duplicates an
existing answer is allowed to conclude that it adds no new pattern.

### Acceptance criteria / tests

1. WI-019 defines the shared spine and the three track-specific methods before an extraction starts.
2. WI-020 through WI-027 each produce a pinned, licensed, evidence-labelled extraction.
3. WI-028 adjudicates every candidate finding and distinguishes confirmation, contradiction, new
   pattern, and non-commensurability.
4. Any catalogue edit traces through WI-028 to a pinned source; module changes are separate items.
5. All children reach `done`; `rungs check` and the site link check pass at the epic boundary.

### Out of scope

- Expanding or reopening WI-009. It remains the fixed six-framework corpus.
- Product rankings, benchmark leaderboards, adoption counts, or model-quality comparisons.
- Hosted behaviour whose implementation is unavailable in the pinned public source.
- Copying source code or licensed prose into modules.
- Changes to `modules/`, the CLI, or published profiles; those require later work items.

## Execution

Not started.

## Review

**Closed 2026-08-17, on evidence, after sitting at `planned` while every child finished.** That gap
is the finding this section is worth writing for: the epic is the document that says what remains,
and it went on saying "planned" through all ten completions. Nothing checks an epic against its own
children's statuses — `backlog-merged-status` checks branches, not membership.

| Criterion | Verified |
| --- | --- |
| 1–4 | Discharged by the children, each `done` and archived: WI-019 (method), WI-020–WI-027 (eight extractions), WI-028 (synthesis and adjudication) |
| 5 | All ten children `status: done` in `archive/`, checked file by file 2026-08-17. `rungs check` 29 pass / 0 fail; site link check 132 routes, 2,130 links, 0 broken |

The archive command could not have told anyone: it held this epic as *"unfinished children:
WI-038…"* — a different epic — because its child lookup searched only `items/`, so an archived child
read as unfinished. Fixed in the same change that closed this.
