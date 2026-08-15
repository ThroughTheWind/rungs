---
id: WI-034
title: Remediate release-readiness findings
type: chore
status: planned
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-033]
epic:
children: []
---

## Proposal (rationale)

WI-033 will turn external-adoption testing into a dated list of blockers and risks. Those findings
need an execution item that closes them deliberately before a public release, rather than letting a
release checklist become an unowned report. The current repository already carries a high site
dependency audit finding, and the assessment may expose packaging, clean-install, documentation, or
failure-recovery defects that are more important than new features.

## Decision

`accepted` — 2026-08-15, by explicit request. This is the remediation lane for the completed WI-033
assessment; it must not become a general backlog sweep.

## Plan

### Requirements

- Import the blocking and `remediate-before-release` rows from `docs/design/release-readiness.md` as
  a bounded checklist with one owner/path and one verification for each.
- Fix the highest-risk issues first, including dependency/security or packaging blockers, clean-
  consumer failures, unsafe defaults, and contradictory public instructions.
- Update tests, gates, findings outcomes, and docs alongside each fix; do not suppress a gate or
  dismiss a vulnerability without recording the boundary and reason.
- Re-run the complete external-user smoke journey and record residual accepted risks for WI-035.

### Impacts

- May touch `src/`, `test/`, `modules/`, package manifests/lockfiles, `site/`, docs, and findings,
  depending on WI-033 evidence.
- Could require an ADR for a compatibility, licensing, or release-policy decision.
- Changes must preserve the no-runtime promise and module portability.

### Approach

1. Freeze the WI-033 assessment as the input set; do not add unrelated improvements without a new WI.
2. Resolve each blocker with the smallest evidence-backed change, adding a regression test or gate
   for any defect that could recur.
3. Re-run clean-consumer and clean-checkout tests, then update the readiness report with before/after
   evidence and any accepted residual risk.
4. Leave the tree ready for the release procedure, but do not publish or tag from this item.

### Acceptance criteria / tests

1. Every WI-033 blocking/pre-release row is fixed, explicitly accepted with a reason, or split into a
   new WI; none is silently dropped.
2. High/critical security and packaging findings have a current audit result and documented scope;
   dependency upgrades preserve a reproducible lockfile and build.
3. A clean consumer journey passes from local/published package acquisition through `doctor`, `init`,
   `add`, `check`, render, upgrade/eject, and a safe recovery path.
4. `npm test`, `npm run rungs -- check`, site build/link/type checks, and any new targeted tests pass.
5. WI-033's readiness report is updated with evidence and a release recommendation for WI-035.

### Out of scope

- New Rift Forge-derived capabilities (WI-031), broad docs synchronization (WI-032), or unrelated
  refactors.
- Publishing, tagging, or announcing the package; those are WI-035.

## Execution

Not started. Planning artifact only; execute on `feature/WI-034-remediate-readiness-findings` after WI-033 has a reviewed assessment.

## Review

Not started.

