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

Implementation boundary — 2026-09-05, retained after independent review. “Concurrent change” in
the transaction guarantee means an OID change caught by expected-old CAS or an identity/holder
change visible to the final validation. A raw process can still replace a direct ref with a
same-OID symbolic ref after that validation but before Git takes its locks, or create a dangling
symbolic recovery candidate after allocator validation but before its create-only write. Git's
public `update-ref` transaction cannot CAS direct-versus-symbolic type; supported Git versions
disagree on whether create-only treats a dangling symref as absent and replaces its name or refuses
it as occupied. `no-deref` protects the target in either case. These measured micro-races are the
explicit raw-Git exception below, not silently claimed as closed.

## Plan

### Requirements

- Resolve integration, green and existing parked branch names as exact, direct stored refs; reject
  case aliases, symbolic refs and any identity that cannot be enumerated safely.
- Refuse before mutation when an existing integration or green ref is checked out, and revalidate
  both identities and holder sets after arbitrary gate code runs.
- Advance integration and green atomically with expected-old values. A concurrent OID change to
  either ref must prevent Rungs from partially writing the pair and park the verified merge;
  identity/holder changes visible at the final validation must do the same.
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
advance; on any verification or transaction failure, Rungs writes neither ref. The measured
same-OID ref-type race in the recorded implementation boundary remains outside that guarantee.

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

- Preventing an uncooperative raw Git process from beginning a checkout, swapping a direct ref for
  a same-OID symbolic ref, or creating a dangling symbolic recovery candidate in the unavoidable
  intervals between final validation and Git's locks. Git's public expected-old/create protocol
  compares OIDs or absence, not ref type, and Git versions disagree on dangling-symref absence;
  `no-deref` protects the symbolic target but cannot assert that the named ref stayed direct. The
  early/late checks and Rungs land lock remain the cooperative repository contract.
- Automatically switching, resetting, removing or deleting an operator's worktree or branch; those
  are deliberately operator-owned under ADR-0009.
- WI-073 path containment, WI-076 archive containment, WI-077 ejection, WI-078 exemptions,
  F-034 line-ending measurement, publication or Arena adoption.

## Execution

Started from exact green `main` commit `65932f3` on
`feature/WI-079-land-managed-ref-safety`, after WI-075 landed. The red-first managed-ref matrix
produced 15 expected failures: green holders and aliases were ignored, parked refs were overwritten
or deleted, and a blocked green update occurred after integration had already advanced. The first
implementation made that matrix green and the pre-integration full suite passed 93 tests with one
platform-specific skip.

Integrated exact green `main` commit `9d362f8` after the local repair stabilized. The backlog merge
kept WI-073 archived from `main` and WI-079 in progress here. Independent diagnostic review then
found three real gaps, all reproduced before correction: dangling symrefs omitted by
`for-each-ref` (including the reftable backend), malformed loose refs being trusted as OIDs, and a
last-resort scratch retained at the reset base rather than the verified merge. Exact regressions
now cover each correction. A GitHub-reviewed APFS advisory also disproved the inherited assumption
that NFD plus Unicode simple folding covers macOS storage aliases; the ref key now uses NFKD and
full locale-independent case conversion, with sharp-S and ligature regressions. The same limitation
in WI-073's emitted-path comparator is recorded separately as release-blocking [F-051](../FINDINGS.md)
rather than widening this item. Review also measured the public-Git same-OID ref-type race and its
create-only dangling-symref analogue, both recorded in the Decision and Out of scope; closing them
would require a new cooperative transaction protocol, so the plan is narrowed explicitly rather
than overstating `no-deref`.

Final integrated verification passed locally. The broad land/ref-safety slice passed 44/44; full
`npm test` passed 111 tests with three platform skips (114 total); `npm pack --dry-run` included
110 files in a 354.8 kB package; and `git diff --check` was clean. The first integrated gate run
correctly rejected the stale generated site snapshot after `concurrency` moved from 1.3.0 to 1.4.0.
After the prescribed `npm run claims` regeneration, all 30 registered gates passed, and the
snapshot was regenerated once more from that green run so it records 30 pass / 0 fail. No land,
branch deletion or worktree removal is part of this item.

## Review

Independent review approved the first pushed live diff with no remaining implementable WI-079 blocker.
It independently reran full `npm test` (111 pass, three platform skips), the narrowed new regression
slice (15/15), and `git diff --check`, and verified the dangling files/reftable symrefs, malformed
loose refs, merged scratch preservation, NFKD/full-fold aliases, canonical reserved-name filtering,
atomic two-ref CAS, recovery preservation, and honest limitation language. Its only non-blocking
hardening note is that a future tri-state symbolic-ref probe could distinguish an ordinary
non-symbolic exit from a fatal Git error more precisely. The first pushed candidate, `497b633`, is
superseded as final evidence: Actions run
33970295165 exposed Git-version-dependent dangling-symref behavior in the diagnostic test on every
matrix host, plus one redundant LF-only retained-file assertion on Windows. Production already
handled both create outcomes; the regression now proves the portable target-preservation invariant,
and the retained-worktree check compares its exact pre-refusal bytes and clean status. This CI
diagnostic repair awaits exact-tip re-review and exact-SHA CI evidence.
