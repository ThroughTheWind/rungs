---
id: WI-034
title: Remediate release-readiness findings
type: chore
status: done
branch: feature/WI-034-remediate-readiness-findings
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

Execution started on `feature/WI-034-remediate-readiness-findings` after WI-033 was reviewed and
merged. The frozen input set is `docs/design/release-readiness.md`; no unrelated backlog sweep is
included.

- The npm package now builds `src/cli.ts` into `dist/cli.js` with esbuild during `prepack`; the
  published bin no longer asks Node to strip TypeScript under `node_modules`.
- A fresh packed artifact installed in `C:\Temp\rungs-wi034-consumer`; the executable returned
  help successfully and a git-backed consumer completed `doctor`, `init`, `add release`, `check`
  (21/21), `render`, `upgrade` preview, and `eject --dry-run`. An unknown-module dry-run exited 1
  without changing the consumer repository.
- Added a package-bin regression test; `npm test` passes 7/7 and `npm run rungs -- check` passes
  20/20 on the remediation branch.
- Upgraded the site to Astro `7.2.2` with compatible integrations, refreshed its lock, and moved
  the wiki to the unified processor. `npm audit` reports 0 vulnerabilities; `npm run build` passes
  with 97 pages and `npm run check` reports 0 errors, warnings, or hints, 1,203 links, and 0 broken.
- Closed F-009 and F-010 with evidence in `docs/backlog/FINDINGS.md`; the readiness report records
  the before/after evidence and hands registry/platform verification to WI-035.

## Review

Reviewed and merged to `main` in `2b585d0`. Implementation was committed in `e095885`; the two
WI-033 pre-release findings are closed, the local packed-consumer journey passes, and no
publish/tag/release action was taken. WI-035 owns the public-registry artifact, provenance,
platform matrix, and final release decision.
