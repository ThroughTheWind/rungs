---
id: WI-081
title: Refuse land when detached-scratch verification lacks a trustworthy control
type: feature
status: in_progress
branch: feature/WI-081-land-scratch-verification-control
created: 2026-09-05
updated: 2026-09-05
related: [WI-062, WI-064, WI-075, WI-079, F-029, F-052, ADR-0009]
epic: WI-064
children: []
---

## Proposal (rationale)

`land` verifies a merge in a detached Git worktree, then resets that same worktree to the
integration commit to attribute any failure. Ignored runtime state is not present in a new
worktree. On exact `main` `6c3b846b`, the normal checkout passed all 30 gates while both scratch
states failed `docs-version-claims`: its subprocess loaded the scratch `src/cli.ts`, which could
not import `smol-toml` without ignored `node_modules`. Because the two artificial findings were
textually equal, `land` called the failure inherited, advanced `main` and `green/main`, and exited
zero after only 29 gates had passed.

This is not F-034: the scratch was LF and its tracked files were byte-identical to the invoking
checkout. The defect is the attribution claim. Two failures reproduced in one incomplete
environment do not establish that the integration tree is red; they establish only that the
scratch environment cannot run the gate.

## Decision

`accepted` — 2026-09-05, during the user-authorised Arena Lab bootstrap. Inherited failure is
allowed only when a trustworthy exact-integration control reproduces the same finding. The
invoking worktree is such a control only while it is clean, detached and at the captured
integration OID. A missing control or a control/scratch mismatch is unknown verification and must
refuse under ADR-0009, preserving the verified merge for recovery rather than moving managed refs.

## Plan

### Requirements

- Establish a control baseline only when the invoking worktree has detached `HEAD` at the captured
  integration OID and `git status --porcelain` is empty. Ignored dependencies may be present;
  tracked, staged and non-ignored untracked changes make the control unavailable.
- After a merged-scratch failure, compare each candidate inherited finding against both the reset
  base scratch and the exact control. Only the same finding reproduced by all three is inherited.
- If the exact control passes a gate that fails in scratch, or no trustworthy control is
  available, refuse without moving integration or green and park the verified merge through the
  existing collision-safe recovery path.
- Preserve introduced-finding refusal and genuine inherited-red landing when the exact control
  and scratch base reproduce the same failure.
- Make command-gate failures actionable by retaining exit status and normalized stderr/stdout,
  while keeping comparison identity stable across CRLF/LF output and the two worktree roots.

### Impacts

- `src/concurrency.ts`: control eligibility, three-way finding attribution and refusal output.
- `src/check.ts` and the CLI land adapter: normalized command diagnostics and stable finding
  identity.
- `test/core.test.js`: exact-control, missing-control, inherited-red and recovery/ref invariants.
- No module file or consumer registry changes are required; this corrects the implementation of
  the existing concurrency guarantee.

### Approach

Run the merged scratch first as today. Only when it fails, reset it to the captured integration
OID and run the failing gate ids there. Independently run those ids in the invoking worktree only
after proving that checkout is a clean detached view of the same OID. Attribute by a normalized
identity separate from the diagnostic shown to the operator: a finding is inherited only if its
identity appears in both baselines. A scratch-only failure is reported as an environment mismatch;
an ineligible invoking checkout is reported as an unavailable control. Both use the existing
recovery allocator and leave the managed-ref transaction untouched.

Capturing or installing every ecosystem's ignored dependencies was rejected. It would make Rungs
an environment provisioner and still could not prove parity for arbitrary command gates. Moving
the scratch under the invoking checkout was also rejected: accidental ancestor lookup would hide
the boundary instead of verifying it.

### Acceptance criteria / tests

1. A command gate backed by an ignored dependency/sentinel passes in the clean exact invoking
   control but fails in both scratch states; `land` reports the mismatch, returns failure, parks
   the merge and leaves integration plus green unchanged.
2. When the invoking worktree is attached, dirty or at a different OID, scratch failures cannot be
   called inherited; `land` explains the unavailable control, preserves recovery and changes no
   managed ref.
3. A genuine finding reproduced with the same stable identity in merged scratch, base scratch and
   exact control remains inherited and can land; a new finding in an already-red gate still blocks.
4. Command-gate diagnostics include exit status and actionable normalized stderr/stdout without
   raw CRLF artifacts or scratch-root-dependent comparison identity.
5. Focused regressions, full `npm test`, all registered gates, package dry-run and
   `git diff --check` pass. The exact pushed SHA passes all six OS/Node cells plus the site job.

### Out of scope

- Installing, copying, linking or otherwise provisioning dependencies in a land scratch; command
  gates own their runtime, while Rungs proves when that runtime was unavailable.
- F-034's independent consumer CRLF parsing defect, F-051's emitted-path folding defect, WI-077
  ejection, publication or Arena Lab adoption.
- Changing ADR-0009's managed-ref transaction, recovery allocation, holder checks or documented
  raw-Git race boundary.

## Execution

Started from exact verified green `main` commit `6c3b846b` with `rungs session start`, leaving the
default worktree detached. The reproducer above used a disposable clone and detached worktree;
both were removed after confirming the real managed refs remained unchanged.

The docs claim gate formerly obtained its command count by launching the full CLI, making that
gate itself dependent on ignored `node_modules`. The bounded correction moves the exact command
and flag tables that render help into dependency-free `src/help.ts`; the claim checker imports that
same authority, while `module-commands-exist` derives real dispatch from the CLI and reconciles it
against that table. A focused structural regression holds the authority dependency-free and proves
that help, claim counting and dispatch reconciliation consume it. Provisioning dependencies into
scratch remains rejected: Rungs cannot infer
or safely reproduce arbitrary ecosystems, and doing so would conceal rather than measure an
unrunnable verification environment.

Verification on Windows completed with six focused control/diagnostic regressions passing; the
full suite reported 129 passed, zero failed and three host-limited skips (132 total). All 30
registered gates passed, including direct dependency-free runs of `docs-version-claims` and
`module-commands-exist`. `npm pack --dry-run` succeeded with 112 files (377.0 kB packed, 1.3 MB
unpacked), and `git diff --check` passed. CI evidence remains pending on the exact pushed tip.

The first pushed candidate exposed a macOS alias boundary in that normalization: a lexical
`/var/...` worktree is reported by `process.cwd()` as its canonical `/private/var/...` path. The
diagnostic normalizer now safely covers both lexical and `realpath` roots, and the focused
regression asserts that no canonical-root spelling survives.

## Review

Pending independent review.
