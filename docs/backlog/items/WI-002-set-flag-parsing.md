---
id: WI-002
title: Accept --set k=v, and refuse an unparsed positional instead of silently retargeting
type: chore
status: proposed
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-001, WI-004, WI-006]
epic:
children: []
---

## Proposal (rationale)

`--set` is the only way to place a module anywhere but its default path, and the only way to fix
the blank `project_name` (WI-001). It parses **one** form. The other form fails silently, corrupts
an unrelated argument, and exits 0.

`cmdAdd` reads overrides with `rest.filter((r) => r.startsWith('--set='))`
([`src/cli.ts:154`](../../../src/cli.ts)), so `--set` and its value separated by a space is never
an override. `--into` then compounds it: it is not a flag-with-value but a marker meaning *the last
positional is the target* ([`src/cli.ts:405`](../../../src/cli.ts)), so the orphaned `k=v` becomes
the last positional and is taken as the destination, while the real destination is read as a module
name.

Measured 2026-08-15:

```console
$ node src/cli.ts add backlog --into ./repo --set backlog.root=mywork --dry-run
  unknown module(s): ./repo
$ echo $?
0
```

The user is told their **path** is an unknown module, having named no such module. Nothing mentions
`--set`. The working form gives no hint it is the only one:

```console
$ node src/cli.ts add backlog --into ./repo --set=backlog.root=mywork --dry-run
  set backlog.root = mywork
```

Three separate defects meet here, which is why the failure is so opaque: a flag that accepts one of
two conventional spellings, a positional-marker flag that silently absorbs whatever lands last, and
a non-zero-worthy error path returning 0. The last one means a CI step wrapping `rungs add` passes
while having installed nothing.

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

- **Documenting what the parameters are** — that is WI-006. This item is about the flag parsing
  accepting what a user reasonably types and failing loudly when it cannot.
- **Listing `--set` in `--help`** — that is WI-004, which covers the whole help/README divergence
  rather than this one flag.
- **Whether `--into` should become a conventional flag-with-value.** Worth considering during the
  plan, but changing it is a CLI surface change; if it is taken up it needs its own item and
  probably an ADR, since the README documents the current form.

## Execution

*Not started.*

## Review

*Not started.*
