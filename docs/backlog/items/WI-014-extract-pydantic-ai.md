---
id: WI-014
title: Extract Pydantic AI — typing, injection, and testable agents
type: docs
status: in_progress
branch: feature/WI-014-extract-pydantic-ai
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-010, WI-012]
epic: WI-009
children: []
---

## Proposal (rationale)

Pydantic AI is in the corpus for the question the existing research is weakest on: **how do you test
a thing whose output is not deterministic?**

The four private repos all converged on mechanical enforcement — 42 `check:` gates in `rift-forge`
alone — but every one of those gates checks an *artifact* after the fact: does the link resolve, is
the id unique, is the status consistent with git. None of them test the agent's behaviour, because
none of the four had a way to. That is a real hole in what rungs ships: a scaffolded repo gets a
gate registry that can prove its documents are well-formed and cannot prove its agent does anything.

A framework that advertises testing-oriented design, structured outputs and dependency injection is
the natural place to find out what the state of the art actually is.

The specific questions:

- **What does a test of an agent look like** in this framework — model substitution, recorded
  interactions, a deterministic fake, or something else? Named test files, not the docs' description
  of them.
- **What does structured output buy?** A schema-constrained response converts a class of prose
  failures into parse failures. That is the same move as a gate, one layer down, and it is worth
  saying so precisely.
- **What is injected, and why?** Dependency injection in an agent framework is a claim about which
  parts of a run are the varying parts. That claim is more interesting than the mechanism.
- **Durable execution here versus checkpoints in LangGraph** — [WI-012](WI-012-extract-langgraph.md).
  Two independent takes on the same problem is the strongest kind of evidence this corpus can
  produce, and neither item may write the comparison; both feed it to
  [WI-017](WI-017-framework-synthesis.md).
- **What does model abstraction cost?** Every abstraction over providers loses something. What.

> Expectations from the project's positioning, not evidence. Confirm the URL, the license, and
> whether the durable-execution surface is first-party or an integration before comparing it to
> anything.

## Decision

`accepted` — 2026-08-15. The user directed the remaining WI-009 children to proceed sequentially;
WI-013 is complete and this is the next planned child.

## Plan

### Requirements

- `docs/research/frameworks/pydantic-ai.md` on the
  [WI-010](WI-010-framework-extraction-template.md) template, eight sections answered.
- Snapshot pins a commit SHA, license, read date, and per-count commands.
- The testing question is answered from the repo's **own test suite**, with at least one named test
  file, and states what such a test can and cannot prove.
- Section 7 names the cost of the typing and injection layers, not only the benefit.
- Section 8 cites pattern ids; candidates go to [WI-017](WI-017-framework-synthesis.md).

### Impacts

- One new document; one row in the frameworks index; site route and links.
- Bears on the failure modes in [`synthesis.md`](../../research/synthesis.md) and on what a future
  `testing`-flavoured module could contain — **neither edited here**.

### Approach

**Enter through the tests.** For every other repo in the corpus the entry point is the run loop; for
this one the claim under examination *is* the test story, so the test suite is the primary source
and the library code is read to explain it. This also avoids the trap of restating a documented
feature list as findings.

**Keep the LangGraph comparison out of the document.** Record the durable-execution observations in
the template's own sections so WI-017 can put the two side by side; a comparison written inside one
extraction is an essay and will disagree with the other extraction.

### Acceptance criteria / tests

1. All eight sections answered; Snapshot carries SHA, license, date, commands.
2. At least one named test file, with an account of what the test actually asserts.
3. The structured-output-as-a-gate argument is either made with evidence or explicitly declined.
4. Costs stated in section 7; opinion marked as opinion.
5. No comparison to any other corpus repo appears in the document.
6. `rungs check` passes; the site builds with links resolving.

### Out of scope

- **Pydantic itself**, except where the agent framework's behaviour cannot be explained without it.
- **Whether rungs should ship Python tooling.** ADR-0002 fixes the runtime footprint; reopening it
  is an ADR, not a research file.
- **Benchmarking, or evaluating model quality through the framework.**
- **Cross-repo comparison and catalogue edits** — WI-017.

## Execution

Branch `feature/WI-014-extract-pydantic-ai`, cut from `main` 2026-08-15.

## Review

Not started.
