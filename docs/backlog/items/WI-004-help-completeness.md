---
id: WI-004
title: Reconcile rungs --help with the README's command table
type: docs
status: proposed
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-002, WI-006]
epic:
children: []
---

## Proposal (rationale)

The two places a user looks up the command surface disagree, and neither says it is partial.

Measured 2026-08-15 against `node src/cli.ts --help` and [`README.md`](../../../README.md):

| Missing from `--help` | Where it is documented | What it does |
| --- | --- | --- |
| `rungs setup git` | README command table | Installs the merge drivers `.gitattributes` names |
| `--set=k=v` | nowhere | The only way to override any module parameter |
| `--confirm-threshold` | README prose, under `concurrency` | Required to install a module above your rung |
| `--fast` / `--full` | nowhere | Selects the gate tier; the help documents only the positional form |

`setup` is a real command ([`src/cli.ts:391`](../../../src/cli.ts)) and appears zero times in the
help text. `--fast`/`--full` are real flags ([`src/cli.ts:380`](../../../src/cli.ts)).

`--help` also **exits 1**. That is the default branch of the command switch doing double duty as
the help screen, so a successful `rungs --help` reports failure to any wrapper that checks.

The reason this is worth an item rather than a quick patch: `--help` is the one piece of
documentation that ships inside the binary and cannot go out of date silently *if it is derived*.
Today it is a hand-maintained template literal listing commands a separate hand-maintained README
table also lists, which is two inventories of one fact — the exact shape CLAUDE.md's one-definition
rule exists to prevent, and the reason they have already drifted.

Found while assessing first-user documentation completeness on 2026-08-15.

## Decision

`accepted` — 2026-08-15, as part of the first-user path.

## Plan

### Requirements

- `--help` lists every command the switch dispatches, including `setup git`.
- It lists every flag the parser honours: `--dry-run`, `--apply`, `--copilot`, `--confirm-threshold`,
  `--set`, `--fast`, `--full`, `--into`.
- `rungs --help` exits **0**. An unknown command still exits 1.
- The README's table names the same commands, with no entry `--help` lacks and none it invents.
- Commands are defined **once** in code, so the help text cannot drift from the dispatcher.

### Impacts

- [`src/cli.ts`](../../../src/cli.ts) — a `COMMANDS` table, the help renderer, and the `default:`
  branch that currently doubles as the help screen.
- [`README.md`](../../../README.md) — the command table and the flag line.
- **No ADR.** Criterion 2: no reasonable alternative was rejected — this is reconciling two lists
  with the code that already decides the answer.

### Approach

Define commands once, as a `COMMANDS` array of `{ usage, blurb }`, and render `--help` from it. The
dispatcher keeps its `switch`, because a table of handlers would be a refactor this item did not ask
for; what matters is that the *text* has one source and sits beside the switch it describes.

Split help from failure. `rungs`, `rungs --help` and `rungs help` print help and exit 0; an unknown
command prints help to stderr and exits 1. Today both paths are the `default:` branch, which is why
a successful `--help` reports failure.

**The README table stays hand-kept**, and is reconciled here rather than generated. Generating it
would mean either a rungs-specific gate — which does not belong in the `gates` module, since that
ships to consumer repos that have no such README — or a managed block in our own README, which is a
larger change than "the two lists disagree" justifies. Recorded as a known cost: this is the second
inventory, and it can drift again. WI-006's generated parameter reference is the precedent to follow
if it does.

### Acceptance criteria / tests

1. `rungs --help` exits 0, measured unpiped. `rungs frobnicate` exits 1.
2. Help output contains `setup git` and all eight flags named in Requirements.
3. Every `case` in the dispatch switch appears in help output — checked by listing both.
4. The README's command rows and help's command lines name the same set.
5. `rungs check` → 20 pass, 0 fail.

### Out of scope

- **Per-command help (`rungs add --help`).** A worthwhile surface, but it is new behaviour rather
  than a reconciliation of two existing lists; open it separately if wanted.
- **Fixing the `--set` parsing itself** — WI-002. This item documents the flag as it behaves once
  that lands, and must not ship a help line describing a form that does not parse.
- **The parameter reference** — WI-006. `--help` should point at it, not contain it.

## Execution

*Not started.*

## Review

*Not started.*
