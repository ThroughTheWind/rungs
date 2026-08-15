---
id: WI-005
title: End doctor with a recommended next command
type: feature
status: proposed
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-007]
epic:
children: []
---

## Proposal (rationale)

`npx @rungs/cli doctor` is the **advertised entry point** — it is the entire Install section of
[`README.md`](../../../README.md) and the first command a reader meets. On a repo that has none of
the modules it prints fifteen `absent` lines, a `0 present · 0 different paradigm · 15 absent`
tally, and a caveat about under-detection. Then it stops.

Measured 2026-08-15 against a bare repo (a `package.json` and one source file):

```console
  0 present · 0 different paradigm · 15 absent

  This reports presence, never quality. …
```

Nothing names `rungs init`, a profile, or `rungs add`. The first-run experience of a retrofit-first
tool is a wall of absences and no offered next move — and the maturity ladder, the one thing that
decides what a repo at this stage should install, is not consulted at the only moment it is most
useful.

The recommendation must be **rung-aware, not maximal**. `doctor` already knows what is present;
what it should say to a repo with nothing is `rungs init . tracked`, not a list of fifteen things
it could install. Selling rung 5 to a rung-1 repo is stated in the product brief as the most likely
way this tool does harm, so the suggestion is a design question, not a print statement — which is
why this is `feature` rather than `docs`.

There is a second case worth covering in the same item because it is the same missing sentence: a
repo where `doctor` finds modules present but **not installed by rungs** (adopted-by-hand), where
the useful next command is `rungs add <module>` and the reassurance is that nothing is overwritten.

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

- **Changing detection itself.** Signatures under-detect on purpose (ADR-0004); this item reads
  what detection already returns and adds a closing recommendation.
- **Making `doctor` interactive or offering to run the command.** A read-only command that starts
  writing is a different contract; if wanted, that is its own item.
- **The prose walkthrough a new user reads outside the terminal** — WI-007.

## Execution

*Not started.*

## Review

*Not started.*
