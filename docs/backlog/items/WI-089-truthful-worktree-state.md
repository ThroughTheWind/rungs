---
id: WI-089
title: Keep a failed worktree status read unknown instead of reporting it clean
type: feature
status: planned
branch:
created: 2026-09-06
updated: 2026-09-06
related: [WI-085, WI-062, F-057, ADR-0009]
epic: WI-085
children: []
---

## Proposal (rationale)

`rungs worktrees` answers one question: which worktrees hold uncommitted work on a branch that has
already landed — "where work actually gets lost", in its own words. [F-057](../FINDINGS.md): when
`git status --porcelain` fails in a worktree, the `catch` sets `dirty = false`, so the row prints
`merged · prunable`, the label for the one state the command exists to warn about the opposite of.
The runner's own rule for an unreadable state is that it blocks; this command reports it as safe.

## Decision

`accepted` — 2026-09-06 under [WI-085](WI-085-existing-promises-remediation.md). A failed read is
an unknown with a reason, never a clean row.

## Plan

### Requirements

- A worktree row states `clean`, `dirty` or `unknown`; an unknown row carries the reason Git gave.
- The command's output never prints `prunable` for an unknown row and says how many rows are unknown
  and why.
- Listing stays read-only; `land`'s holder checks and recovery behaviour are untouched.

### Impacts

- `src/concurrency.ts` (`WorktreeRow`, `worktrees()`), `src/cli.ts` (`cmdWorktrees`), the existing
  regression in `test/core.test.js`.

### Approach

Replace the boolean with a tri-state and keep the caught error's first line as the reason. The
regression removes a linked worktree's directory from disk — Git still lists it, and `status` in a
missing directory fails — so the failing read is real, not a fabricated result object.

### Acceptance criteria / tests

1. A linked worktree whose directory was removed reports `unknown` with a reason containing the Git
   error, and the CLI line does not contain `prunable`.
2. The existing merged-and-dirty regression still passes with the new field names.
3. `land` tests are unchanged and pass.

### Out of scope

- Repairing or pruning worktrees; the command reports and never removes.
- Any change to attribution or the compare-and-swap protocol.

## Execution

Not started.

## Review

Not started.
