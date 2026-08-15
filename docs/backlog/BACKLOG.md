# Backlog

The board. One row per live work item, grouped by status. Items live in
[`items/`](items/); finished work moves to [`archive/`](archive/).

<!-- NEXT-ID: WI-030 -->
<!-- Claim from this marker and bump it on your own branch. `rungs check` refuses a duplicate. -->

## In progress

| Id | Title | Type | Branch |
| --- | --- | --- | --- |
| [WI-017](items/WI-017-framework-synthesis.md) | Synthesize the framework corpus and reconcile it with the pattern catalogue | docs | `feature/WI-017-framework-synthesis` |

## Review

| Id | Title | Type | Branch |
| --- | --- | --- | --- |
| — | | | |

## Planned

| Id | Title | Type |
| --- | --- | --- |
| [WI-009](items/WI-009-public-agent-framework-corpus.md) | Extract a second research corpus — six public agent frameworks | epic |

## Accepted

| Id | Title | Type |
| --- | --- | --- |
| — | | |

## Proposed

| Id | Title | Type |
| --- | --- | --- |
| [WI-029](items/WI-029-apply-framework-patterns-to-modules.md) | Apply framework-derived patterns to shipped modules | docs |

All eight are one epic — [WI-009](items/WI-009-public-agent-framework-corpus.md) — opened 2026-08-15.
The four extracted repos share an author, so every convergence in
[`pattern-catalog.md`](../research/pattern-catalog.md) is currently one operator agreeing with
themselves; six independently-built public frameworks are the cheapest test of which patterns are
portable. Order is template → SWE-agent (which corrects the template) → the middle four in any
order → OpenHands → synthesis.

**The epic is the decision that matters.** These six are read for *architecture*, which
[`research/README.md`](../research/README.md) names as the existing corpus's explicit non-goal — so
this is a second research axis with its own directory and template, not more of the first.

**Done since:** [WI-008](items/WI-008-link-gate-checks-every-file.md) — promoted from F-005.
Link checking covered 72 of 89 files; a single `{{token}}` anywhere in a document exempted every
link in it. Now per-link, with code spans excluded because a quoted link is not a link.

---

## The first-user path — WI-001…007, closed 2026-08-15

Opened from one assessment of what a person meets between `npx @rungs/cli doctor` and their first
work item, worked in id order, all merged. Each was reproduced by running the tool before it was
opened and re-verified before it was closed.

| Id | What it fixed |
| --- | --- |
| [WI-001](items/WI-001-infer-project-name.md) | Every scaffold's entry document opened `# AGENTS.md — ` with a dangling dash. The default now states its own derivation |
| [WI-002](items/WI-002-set-flag-parsing.md) | `--set k=v` silently became a positional and `--into` ate it, reporting the user's path as an unknown module |
| [WI-003](items/WI-003-render-reports-what-it-cannot-reemit.md) | `.ai/rungs.toml` told every scaffolded repo to do something no command performs |
| [WI-004](items/WI-004-help-completeness.md) | `--help` omitted a real command and three real flags, and exited 1 |
| [WI-005](items/WI-005-doctor-next-step.md) | The advertised entry point ended on fifteen `absent` lines with nothing to do next |
| [WI-006](items/WI-006-parameter-reference.md) | 43 parameters documented nowhere; now rendered from the manifests by `rungs modules --params` |
| [WI-007](items/WI-007-first-hour-guide.md) | No page addressed the reader holding a fresh scaffold |

Three of the items corrected a measurement in their own proposal during execution — an exit code
read from a pipeline, a count read from a truncated `head`, a link count taken on memory. Those
corrections are in the items, marked, rather than amended away.

Five findings were opened rather than folded in: F-001 (the merged-status gate fires on a
commitless branch, hit on four of seven items) and F-005 (`gates-links-resolve` passes on a broken
relative link) are the two worth acting on next. See [FINDINGS.md](FINDINGS.md).

## Deferred

| Id | Title | Revisit when |
| --- | --- | --- |
| — | | |

---

Rejected and completed items keep their files — see [`archive/`](archive/). A rejection is part of
the record, with its reason; deleting one loses the answer to "why not?" and invites the same
proposal again.
