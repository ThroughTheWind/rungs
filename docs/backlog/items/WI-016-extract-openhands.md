---
id: WI-016
title: Extract OpenHands — a shipped autonomous agent, sandboxing and scale
type: docs
status: in_progress
branch: feature/WI-016-extract-openhands
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-010, WI-011]
epic: WI-009
children: []
---

## Proposal (rationale)

OpenHands is the largest repo in the corpus and is scheduled last for that reason: it is where the
template meets the hardest case, after five cheaper repos have hardened it.

It is in the corpus because it is a **product**, not a library. The other five hand you primitives
and leave the hard parts — where does the code actually run, what happens when the agent breaks
something, what does a user see mid-run, how do many runs coexist — to the person integrating them.
OpenHands has to answer all of them, in public, for real users. Those answers are the parts a
library's design deliberately omits, and they are precisely the parts rungs' scaffolded repos hit.

The corpus's closest existing analogue is `rift-forge`'s **401 branches and 51 live worktrees** — one
operator's hand-rolled answer to running many agent sessions without them colliding
([`synthesis.md`](../../research/synthesis.md)). A product that solves the same problem with
containers rather than worktrees is the natural check on whether the worktree pattern rungs ships is
a genuine solution or an artefact of not having infrastructure.

The specific questions:

- **What is the isolation boundary**, and what crosses it? A sandbox is a statement about what the
  agent is not trusted with; the exception list is the interesting part.
- **What happens when the agent breaks the environment**, and how is that recovered?
- **How does a repository get in and changes get out** — clone, mount, branch, patch, PR? This is
  the same surface `rungs init` writes into, from the other side.
- **What does the user see and control while a run is in progress?** The private corpus has no
  answer beyond "read the terminal", and long-running work is where that fails.
- **How do concurrent runs stay separate**, and what does that cost per run? The direct comparison
  with worktrees.
- **What is in the product that is not in any of the five libraries?** The residue is the answer to
  "what does a library leave you to build", and it is the single most useful thing this extraction
  can produce.

> Expectations from the project's positioning, not evidence. Confirm the URL, the license and the
> current architecture at a pinned commit; this project has renamed and restructured before, so old
> write-ups about it are not a source.

## Decision

`accepted` — 2026-08-15. The user directed the remaining WI-009 children to proceed sequentially;
WI-015 is complete and this is the next planned child.

## Plan

### Requirements

- `docs/research/frameworks/openhands.md` on the
  [WI-010](WI-010-framework-extraction-template.md) template, eight sections answered.
- Snapshot pins a commit SHA, license, read date, per-count commands, **and an explicit read
  boundary** — what was read and what was not. A partial read of a large repo that says so is
  evidence; one that does not is a claim about the whole repo.
- Sections 4 and 5 carry the sandboxing and concurrency answers with file-level evidence.
- A short "what the product has that the libraries do not" list, derived from the other five
  extractions being complete — this is why the item is last.
- Section 8 cites pattern ids; candidates go to [WI-017](WI-017-framework-synthesis.md).

### Impacts

- One new document; one row in the frameworks index; site route and links.
- Bears directly on the concurrency and worktree patterns in
  [`pattern-catalog.md`](../../research/pattern-catalog.md) — **read, not edited**; WI-017 argues any
  rung change.

### Approach

**Bound hard, and say where the boundary is.** Trace one run from request to committed change, and
read the isolation and concurrency machinery around it. Everything else is out of the read.

**Do not run it.** The extraction is a source read. Standing up the product would answer different
questions at a much higher cost, and a screenshot is not evidence about architecture.

**Write the residue list last**, after the other five documents exist, and cite them by id.

### Acceptance criteria / tests

1. All eight sections answered; Snapshot carries SHA, license, date, commands and the read boundary.
2. The isolation boundary is described with what crosses it, traced to named files.
3. The concurrency answer is stated in terms comparable to the worktree pattern, without asserting
   which is better — that verdict is section 8's, with its reasoning.
4. The residue list cites the five sibling documents by path.
5. Opinion marked as opinion; every other claim carries a path or a quote.
6. `rungs check` passes; the site builds with links resolving.

### Out of scope

- **Running or deploying OpenHands**, and anything that would require it — performance, resource
  cost, model behaviour.
- **The hosted product and anything not in the repository.** Recorded as not inspectable.
- **The frontend beyond the run-control surface**, which is the only part the corpus question needs.
- **Changing the worktree pattern's rung or contents** — WI-017, and a module change is its own item
  beyond that.

## Execution

Started 2026-08-15 on `feature/WI-016-extract-openhands`.

## Review

Not started.
