---
id: WI-062
title: Decide what the concurrency module is — four commands, or the manual protocol it actually documents
type: chore
status: proposed
branch:
created: 2026-08-17
updated: 2026-08-17
related: [F-026, ADR-0005]
epic:
children: []
---

## Proposal (rationale)

Promoted from [F-026](../FINDINGS.md), found by the 2026-08-17 command audit.

**The `concurrency` module documents a workflow made of four commands that do not exist.**

| Named in shipped content | Exists |
| --- | --- |
| `rungs session start <branch>` | no |
| `rungs land <branch>` | no |
| `rungs preflight` | no |
| `rungs worktrees` | no |
| `rungs check` | yes |

The CLI dispatches exactly ten commands (`src/cli.ts` switch): `modules`, `doctor`, `backlog`,
`check`, `init`, `upgrade`, `eject`, `setup`, `render`, `add`. Nothing in
`modules/concurrency/` marks the other four as planned — a grep for *not yet*, *planned*,
*future* and *unimplemented* returns nothing — and the module summary asserts "a land protocol
that cannot redden the branch" as a capability.

Three shipped files carry them:

- `files/docs/concurrent-sessions.md:19,21,85` — a table headed **"The loop"**
- `fragments/AGENTS.md:5,7`
- `gates/concurrency.toml:9`

**The fragment is the serious one.** It merges into the consumer's agent entry document, so an
agent is instructed to *"Cut with `rungs session start`… land with `rungs land` — **never `git
merge` by hand**"*. The module does not merely describe absent commands; it withdraws the working
manual path and replaces it with three that fail. An agent following it is stuck at the first
step with no stated fallback.

Rung 5 and the `--confirm-threshold` refusal bound how many repos can hit this. They do not make
the document true, and this repository's whole argument is that a practice recorded without
evidence propagates into every repo that trusted it.

## Decision

`proposed` — 2026-08-17. **This item exists to get a decision, not to carry one.** The fix is a
judgement about what the module is for, and it is deliberately not being made inside the audit
that found it.

## Plan

> Filled once `accepted`.

### Requirements

- **R1.** No shipped module content names a command the CLI does not dispatch. Whichever option is
  taken, this is the acceptance test.
- **R2.** The choice is recorded with its reasoning — an ADR if option A, because four new commands
  is a change to what rungs *is* (it currently writes files and runs gates; none of these do that).
- **R3.** A gate makes the class impossible to reintroduce: every `rungs <word>` in `modules/**`
  resolves to a dispatched command. That is mechanical and cheap, and it is the only part of this
  that is not a judgement call.

### Impacts

- `modules/concurrency/` in all three files, its `module.toml` summary, and a version bump.
- Option A additionally: `src/cli.ts`, new source files, and the git-worktree surface — which is
  the largest single addition the CLI would have taken on.

### Approach

**Two honest options. A third — labelling them "planned" — is rejected in advance:** the module is
rung 5, its entire claim is that the loop is mechanised, and a planned-command label leaves a
consumer's agent with instructions it cannot follow.

**A. Build the four commands.** Honours the documented design, which is coherent and was extracted
from a real repo's practice. Costs the most, and expands what rungs is: every existing command
writes files or runs gates, while `land` and `session start` would drive git — merging, moving
refs, creating worktrees. That is a materially different risk surface, and ADR-0005's "the runner
records what it observes" is at least adjacent to it.

**B. Rewrite the module as the manual protocol it actually documents.** `git worktree`,
`git merge`, and `rungs check` on the merged tree already do all of this by hand; the module's real
value is the *rules* — cut from the last verified merge, do not run the full tier before landing,
regenerate rather than merge generated artifacts, attribute a failure before blocking on it — and
every one of those survives without a command. Cheapest, ships immediately, and loses the
automation the rung-5 threshold was justified by.

**Recommendation: B**, unless there is a concrete near-term intent to build A. B makes the module
true today; A can still follow, and would then be adding commands to a document that is already
honest rather than catching one up to it.

### Acceptance criteria / tests

- The R3 gate exists, fails on a seeded `rungs notacommand` in module content, and passes on the
  corrected tree — proven by seeding, not by assertion.
- `modules/concurrency/` names only dispatched commands.
- If option A: each new command has self-tests in both directions, and an ADR.
- If option B: the module's rung and threshold text are re-justified against what it now ships, or
  the rung changes. A rung-5 cost with no automation left is a claim that needs re-earning.

### Out of scope

- **The other two audit findings.** [F-027](../FINDINGS.md) (`setup` writing to the wrong repo) and
  F-028 (`--set` confirming unknown overrides) were fixed directly on 2026-08-17 — both were
  unambiguous defects with no design question attached, which is exactly why they are not here.
- **A general "documented capability exists" gate beyond commands.** R3 covers `rungs <word>` in
  module content. Prose claims about behaviour are a much larger problem and are not opened here.

## Execution

Not started.

## Review

Not started.
