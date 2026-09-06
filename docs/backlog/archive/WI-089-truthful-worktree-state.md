---
id: WI-089
title: Keep a failed worktree status read unknown instead of reporting it clean
type: feature
status: done
branch: feature/WI-089-truthful-worktree-state
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

`accepted` — 2026-09-06 under [WI-085](../items/WI-085-existing-promises-remediation.md). A failed read is
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

Executed 2026-09-06 on `feature/WI-089-truthful-worktree-state`, cut from `main` `bc8cc32` (WI-088
landed). `WorktreeRow.dirty` became `state: 'clean' | 'dirty' | 'unknown'` plus an optional `reason`
(Git's first line); the `catch` that set `dirty = false` now sets `unknown` and keeps the reason.
`cmdWorktrees` prints an unknown row as `status UNKNOWN` with the reason beneath it, counts unknown
rows as "could not be inspected" with the sentence "Unknown is not clean", and computes the prunable
count from `state === 'clean'` alone. `land`, `preflight` and `session start` do not read the row.
No other consumer of the boolean existed (`grep` over `src/` and `test/`).

**Deviations.** None.

## Review

Against each acceptance criterion, 2026-09-06, Windows 11, Node `v22.22.3`:

1. **Unknown with a reason.** `test/core.test.js` "worktrees keeps a failed status read unknown…"
   adds a linked worktree, removes its directory (Git still lists it), and asserts `state === 'unknown'`,
   a non-empty `reason`, and that the row has no `dirty` key. Through the CLI the row reads
   `merged · status UNKNOWN feature/vanished`, the reason line is printed, "1 worktree(s) could not be
   inspected" appears, and the word `prunable` does not.
2. **Existing regression** "worktrees reports merged-and-dirty…" passes with `state` in place of
   the boolean, and still asserts the worktree survives listing.
3. **`land` untouched.** No `land`, `preflight` or `session start` code changed; the full serial
   suite includes every land regression: `node --test --test-concurrency=1 test/*.test.js` after
   rebuild, **152 tests, 149 pass, 0 fail, 3 platform skips, 139 s**.

`node src/cli.ts check`: 31 pass. **Pending.** The exact-SHA OS/Node matrix has not run: the branch
is not pushed.
