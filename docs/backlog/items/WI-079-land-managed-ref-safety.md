---
id: WI-079
title: Protect every land-managed ref from checked-out worktrees
type: feature
status: in_progress
branch: feature/WI-079-land-managed-ref-safety
created: 2026-09-05
updated: 2026-09-05
related: [WI-062, WI-075, F-048, F-050, ADR-0009]
epic: WI-064
children: []
---

## Proposal (rationale)

WI-075 closes the reproduced integration-branch corruption, but `land` also moves the configured
green marker and creates, overwrites or deletes a parked `integ/...` branch through raw
`update-ref`. Both auxiliary refs are ordinary `refs/heads` names and can be checked out. Exact
disposable probes reproduced the same split state: `HEAD` moved to the verified merge while the
holder's index and files stayed at the old commit, so Git reported a staged reversion. The parked
case is more than hypothetical because a refusal explicitly tells the operator to recover and fix
the merge from that ref.

The successful path then deletes the deterministic parked ref without checking whether a worktree
holds it. That contradicts ADR-0009's “never destroy, only refuse” rule and can leave a linked
worktree attached to a missing branch. Fixing only the integration ref would therefore make the
most visible F-048 path safe while leaving the same mutation primitive unsafe one line later.

## Decision

`accepted` — 2026-09-05, during the user-authorised Arena Lab bootstrap. Treat every branch ref
that `land` can mutate as operator-visible state. A checked-out integration or green ref is a
refusal; a parked merge is written only to an unheld, direct ref without overwriting another
recoverable merge; and Rungs never deletes a parked branch. Advance the integration and green refs
in one compare-and-swap transaction so neither can move without the other.

## Plan

### Requirements

- Resolve integration, green and existing parked branch names as exact, direct stored refs; reject
  case aliases, symbolic refs and any identity that cannot be enumerated safely.
- Refuse before mutation when an existing integration or green ref is checked out, and revalidate
  both identities and holder sets after arbitrary gate code runs.
- Advance integration and green atomically with expected-old values. A concurrent change to either
  ref must leave both unchanged and park the verified merge.
- Never overwrite or delete a checked-out parked ref, and never discard an existing parked merge.
  Choose and report an unheld collision-free recovery ref when the preferred name is occupied.
- Use no-dereference ref writes so a symbolic-ref swap cannot redirect a checked operation into a
  different branch between validation and mutation.
- Preserve WI-075's clean/dirty/late-holder behavior and ADR-0009's detached scratch worktree.

### Impacts

- `src/concurrency.ts` ref discovery, recovery-ref allocation and atomic update transaction;
  `test/core.test.js` adversarial worktree/ref interleavings.
- The concurrency guide and command output: a parked merge may receive a collision suffix, and
  cleanup is explicitly operator-owned rather than an automatic ref deletion.
- ADR-0009 is clarified only if necessary; its existing never-destroy rule already selects the
  behavior. No push, rebase, worktree removal or automatic operator checkout is introduced.

### Approach

Generalize WI-075's canonical direct-ref/holder state helper to distinguish a required existing ref
from a creatable marker. Capture both integration and green old values before verification, then
repeat identity and holder checks at the final mutation boundary. Use one `git update-ref --stdin`
transaction with compare-and-swap expectations and no dereferencing for the integration and green
advance; on any verification or transaction failure, leave both refs untouched.

Replace deterministic parked-ref overwrites with a recovery allocator. Reuse the preferred parked
ref only when it already names the same merge and is safe; otherwise create an unheld direct ref
whose name includes the verified merge identity, using create-only semantics. Never delete a parked
ref after success. `worktrees` already reports merged branches so the operator can decide when a
recovery ref is no longer needed.

### Acceptance criteria / tests

1. With `green/main` checked out in another worktree, `land` refuses without running gates or
   changing integration, green, parked refs, holder `HEAD`, index, status or bytes.
2. If the green ref becomes checked out, symbolic or concurrently advanced while gates run, the
   final transaction refuses, both integration and green remain at their captured values, and the
   verified merge is recoverable from a newly reported unheld ref.
3. An existing checked-out parked ref is never advanced or deleted. Introduced-failure and CAS
   paths preserve its `HEAD`, index, status and bytes and allocate a distinct recovery ref.
4. An existing unheld parked ref naming different work is not overwritten; repeated parking of the
   same verified merge is idempotent and does not create unbounded duplicate refs.
5. Successful landing moves integration and green together or neither, retains prior recovery refs,
   and keeps the current attribution, conflict, locking and detached-worktree behavior.
6. Focused tests, full `npm test`, package dry-run, `git diff --check` and all registered Rungs gates
   pass. The exact pushed SHA passes all six OS/Node matrix cells and the site job.

### Out of scope

- Preventing an uncooperative raw Git process from beginning a checkout in the unavoidable interval
  inside Git's own ref transaction; WI-075's before-and-after-boundary checks remain the cooperative
  repository contract.
- Automatically switching, resetting, removing or deleting an operator's worktree or branch; those
  are deliberately operator-owned under ADR-0009.
- WI-073 path containment, WI-076 archive containment, WI-077 ejection, WI-078 exemptions,
  F-034 line-ending measurement, publication or Arena adoption.

## Execution

Started from exact green `main` commit `65932f3` on
`feature/WI-079-land-managed-ref-safety`, after WI-075 landed. Implementation and adversarial
verification are in progress.

## Review

Not started.
