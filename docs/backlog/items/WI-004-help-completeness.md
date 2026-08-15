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

*Empty until decided.*

## Plan

> Filled once `accepted`.

### Requirements

*Filled once `accepted`.*

### Impacts

*Filled once `accepted`.*

### Approach

*Filled once `accepted`.*

### Acceptance criteria / tests

*Filled once `accepted`.*

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
