---
id: WI-011
title: Extract SWE-agent — the minimal coding-agent loop
type: docs
status: done
branch: feature/WI-011-extract-swe-agent
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-010]
epic: WI-009
children: []
---

## Proposal (rationale)

SWE-agent is the smallest repo in the corpus and the one whose subject is closest to rungs' own:
an agent that is handed a GitHub issue in a real repository and has to change code until the issue
is resolved. That is the loop every repo rungs scaffolds is trying to make survivable.

Its value here is *subtractive*. Every other repo in the corpus bundles orchestration, persistence,
sandboxing and a product surface together, so it is hard to tell which parts are essential. Reading
the minimal one first shows what the irreducible loop is — observe → reason → execute → observe —
and turns every additional mechanism in the other five into a question with a cost attached: what
failure was this added for?

The specific questions:

- **What is one turn?** Named file, named function. The four private repos have no answer to this at
  all — they instrument the *human-facing* workflow around an agent and treat the loop as opaque.
- **What does the agent see?** SWE-agent's public positioning is that the interface the model is
  given — how a file is shown, how an edit is confirmed, how errors are returned — matters more than
  the model. If that holds up in the source, it is a direct argument about what a scaffolded repo's
  documentation and gate output should look like, since those are also agent-facing interfaces.
- **What is the stop condition, and what happens when it never fires?** Every gate rungs ships has
  the same shape.
- **Where does it record what it did?** The single most-converged pattern in the existing corpus is
  that work needs a durable place to land.

> Everything above is an expectation drawn from the project's own positioning, not evidence.
> `princeton-nlp/SWE-agent` is understood to have moved to a `SWE-agent` organization; confirm the
> canonical URL, the license, and the current state before measuring anything.

## Decision

`accepted` — 2026-08-15. The user directed the remaining WI-009 children to proceed sequentially;
WI-010 is complete and this is the next planned child.

## Plan

### Requirements

- `docs/research/frameworks/swe-agent.md`, on the template from
  [WI-010](../items/WI-010-framework-extraction-template.md), all eight sections answered.
- Snapshot pins a commit SHA, records the license, and names the command behind every count.
- Sections 2 and 4 (core loop, tools) trace to specific files and functions, not to the README.
- Section 8 cites pattern ids from [`pattern-catalog.md`](../../research/pattern-catalog.md); a
  practice with no matching id is named as a *candidate* pattern for
  [WI-017](WI-017-framework-synthesis.md) to adjudicate, not added to the catalogue here.
- **Template corrections found while writing are made in this item**, in
  [WI-010](../items/WI-010-framework-extraction-template.md)'s files, and listed in `## Execution`.

### Impacts

- One new document; one row in the frameworks index.
- Possibly edits to `frameworks/TEMPLATE.md` — expected, and the reason this repo is scheduled first.
- Site route and link surface.

### Approach

**Read the source, not the paper or the README.** The repo's own account of its loop is a claim
about the loop ([CLAUDE.md — extraction discipline #1](../../../CLAUDE.md)); where the docs and the
code disagree, the code is what ran.

Start at the entry point and follow one turn end to end before writing anything, so section 2 is a
trace rather than a summary.

### Acceptance criteria / tests

1. The document exists with all eight sections answered — none blank, none deferred to another repo.
2. Snapshot carries a commit SHA, a license, a read date, and per-count commands.
3. Section 2 names the file and function where a turn is executed, and a reader at that SHA finds it.
4. Every opinion is in the first person and marked; every other claim has a path or a quote.
5. Section 8 gives a take / take-as-warning / leave verdict with a reason.
6. `rungs check` passes; the site builds with links resolving.

### Out of scope

- **Running SWE-agent, or reproducing any benchmark number.** The corpus reads architecture; a
  benchmark score is a claim about model performance and is not something this repo can verify or
  needs. Any number quoted from the repo is attributed as *their* measurement, not ours.
- **Comparison with the other five.** Cross-repo claims belong to
  [WI-017](WI-017-framework-synthesis.md); an extraction that compares is an essay.
- **Editing the pattern catalogue.** Candidates are named, not added — WI-017.
- **Any change to `modules/`** — WI-009's boundary.

## Execution

Branch `feature/WI-011-extract-swe-agent`, cut from `main` 2026-08-15.

- Confirmed the canonical repository as `SWE-agent/SWE-agent` and pinned
  `3ea751c087f32b16e039a2233dd6eefecef325d5` before inspecting or measuring it.
- Traced the default turn through `DefaultAgent.run` → `step` → `forward_with_handling` →
  `forward` → `ToolHandler.parse_actions` → `handle_action`, then followed history and trajectory
  writes back out of the turn.
- Wrote `docs/research/frameworks/swe-agent.md` with all eight sections, pinned permalinks, dated
  PowerShell measurements, two bounded absence checks, and five catalogue verdicts/candidates.
- Updated the frameworks index to point at the pinned extraction.
- **No template corrections were required.** The distinction between replay and resume fit section
  3's existing prompt, and the `ShellAgent` takeover path fit section 6 without changing its scope.

## Review

Checked 2026-08-15.

1. **Pass.** `docs/research/frameworks/swe-agent.md` answers all eight template sections; none is
   blank or deferred.
2. **Pass.** Snapshot records the full SHA, MIT licence, read date, and the exact PowerShell command
   and scope behind each of the three counts.
3. **Pass.** Section 2 names and links `DefaultAgent.run`, `step`, `forward_with_handling`, `forward`,
   and `handle_action` at the pinned SHA.
4. **Pass.** Judgement is written in the first person and prefixed **Opinion.**; implementation
   claims use pinned permalinks and absence claims give the dated `rg` command and directory scope.
5. **Pass.** Section 8 contains five take / take-as-warning verdicts with reasons, including two
   candidate patterns reserved for WI-017.
6. **Pass.** `node src/cli.ts check` → 20 pass, 0 fail, 101 links examined. `npm run build && npm
   run check` under `site/` → 56 routes, 501 internal links, 0 broken, and 0 Astro diagnostics.
