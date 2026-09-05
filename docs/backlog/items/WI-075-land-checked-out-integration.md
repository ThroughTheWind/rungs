---
id: WI-075
title: Refuse landing while the integration branch is checked out
type: feature
status: planned
branch:
created: 2026-09-05
updated: 2026-09-05
related: [WI-062, WI-074, F-048, ADR-0009]
epic: WI-064
children: []
---

## Proposal (rationale)

The first real use of `rungs land` verified and advanced `main`, then left the checked-out main
worktree's index and files at the old commit. Git presented every merged path as a staged reversion,
and the next Rungs command executed the old source despite `HEAD` naming the new merge.

The concurrency contract already says an integration branch must not be checked out anywhere and
ships a gate for that invariant. `land` nevertheless omitted the same precondition at the mutation
boundary, so invoking the command outside a fully installed concurrency module turned a stated rule
into an avoidable worktree corruption mode. This blocks the next bootstrap landing.

## Decision

`accepted` — 2026-09-05, during the user-authorised Arena Lab bootstrap. Enforce ADR-0009's existing
“never hold the integration branch” rule in `land` itself. A checked-out integration branch is a
refusal, whether its worktree is clean or dirty; the command names the holding worktree and tells the
operator to detach or switch it before retrying.

Updating a clean checked-out worktree as part of landing was considered and rejected here. It would
make the command support the state that `concurrency-no-integration-checkout`, the module guide and
ADR-0009 all forbid, and a cleanliness check followed by a worktree update introduces a new race
with user edits. Changing that contract would require an ADR amendment, not a bug fix.

## Plan

### Requirements

- Discover every worktree holding the configured integration branch before acquiring the land lock,
  creating a scratch worktree, invoking gates or moving any ref.
- Refuse both clean and dirty holders, naming their exact paths and the detach/switch remediation.
- Leave the integration, green and parked refs, the holder's `HEAD`, index and files, and the land
  lock unchanged on refusal.
- Preserve verified-merge, per-finding attribution, parking and compare-and-swap behavior when the
  integration branch is not checked out.
- Keep the CLI, concurrency guide, gate message and ADR-0009 on one rule: no worktree holds the
  integration branch during this loop.

### Impacts

- `src/concurrency.ts` worktree discovery and the `land` precondition; concurrency regressions in
  `test/core.test.js`.
- Existing land tests currently keep `main` checked out and accidentally validate only its ref.
  Their valid scenarios must release the integration branch and additionally assert repository
  state, while a new test owns the refused checked-out cases.
- The Arena bootstrap procedure must detach or switch the Rungs main worktree before the next
  `rungs land`; no public command or configuration shape changes.

### Approach

Read `git worktree list --porcelain -z` without shell parsing and match the exact
`refs/heads/<integration>` field. Perform this preflight before the lock because a known-invalid
invocation must create no coordination artifact. Return every matching path rather than assuming a
branch has only one holder.

Keep the existing direct compare-and-swap ref update for the valid, unheld state. Update the land
test fixture so scenarios that exercise merge behavior detach from `main`; do not weaken the
separate gate that refuses an integration checkout.

### Acceptance criteria / tests

1. A clean checked-out integration worktree reproducing F-048 is refused before the runner executes,
   and its ref, `HEAD`, index and bytes remain exactly unchanged with no staged reversion.
2. A dirty checked-out integration worktree is also refused without changing or hiding its staged,
   unstaged or untracked work; the response names the holding path and remediation.
3. The same refusal works when the integration branch is held by a linked worktree and `land` is
   invoked from a different worktree.
4. With the integration branch unheld, green, introduced-failure, inherited-failure, conflict,
   concurrent-lock and compare-and-swap scenarios retain their existing outcomes; successful land
   advances both integration and green refs to the verified merge.
5. Focused tests, full `npm test`, package dry-run, `git diff --check` and all registered Rungs gates
   pass. The exact pushed SHA passes all six OS/Node matrix cells and the site job.

### Out of scope

- Amending ADR-0009 to support a checked-out integration branch, automatically switching or
  detaching an operator's worktree, pushing refs, or deleting branches/worktrees.
- WI-073 path-role containment, WI-072 release-boundary tracking, F-042/F-045 eject independence,
  F-043 branch-local exemptions, F-034 line-ending measurement and the v0.4.0 publication itself.

## Execution

Not started.

## Review

Not started.
