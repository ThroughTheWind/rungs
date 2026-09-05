---
id: WI-067
title: Reconcile backlog state when the integration branch has no local ref
type: feature
status: planned
branch:
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, F-033]
epic: WI-064
children: []
---

## Proposal (rationale)

Rungs 0.3.1 asks Git for branches merged into a local `main`. In a release or pull-request checkout
that has only the checked-out ref, all six Rungs gate jobs failed with `cannot read git branches;
status not reconciled`, while the same source passed on `main`. The existing F-033 fix removed a
shell portability defect but did not cover absence of the local integration ref.

## Decision

`accepted` — 2026-09-05. Make reconciliation correct and actionable in the Git shapes generated CI
actually creates before enabling that CI in Arena Lab.

## Plan

Resolve the configured integration branch to one exact ref before asking Git which work branches
are merged or whether a branch tip appears as a merge parent. Resolution is local-only and ordered:
an exact local branch, then the exact `origin` tracking branch, then exactly one matching tracking
branch from another remote. No match or more than one non-`origin` match remains unknown rather
than letting Git's abbreviated-name rules choose a ref.

### Requirements

- `backlog-merged-status` works when the configured integration branch exists only as a local ref,
  only as `refs/remotes/origin/<branch>`, or only as one other remote-tracking ref.
- Local refs take precedence over remote-tracking refs, and `origin` takes precedence over other
  remotes, so the same checkout always selects the same base.
- Multiple matching non-`origin` remotes and a genuinely absent integration ref produce an
  actionable unknown result; the gate must not report green or choose arbitrarily.
- Resolution performs no fetch, ref write, checkout or other repository mutation.

### Impacts

- `src/engines2.ts`: integration-ref resolution used by merged-branch enumeration and merge-parent
  inspection.
- `test/core.test.js`: Git fixtures for local, `origin`, unique other-remote and ambiguous/missing
  ref shapes.
- No module schema or generated consumer file changes: `integration_branch` remains a branch name
  and the behavior change is inside the existing engine.

### Approach

- Probe exact full ref names with argv-based Git calls. Prefer
  `refs/heads/<integration_branch>`, then `refs/remotes/origin/<integration_branch>`.
- If neither exists, enumerate remote refs and accept only one whose ref name ends in the configured
  branch path. Use the resolved full ref consistently for both `git branch --merged` and
  `landedWork`.
- Keep work-item branch enumeration local because item frontmatter records local feature branch
  names; only the integration/base side needs the remote fallback.
- Return a diagnostic that distinguishes an absent base from ambiguous remote matches. Do not use
  `rev-parse <short-name>` as resolution because its DWIM behavior can select differently as refs
  are added.

### Acceptance criteria / tests

- Existing local-`main` reconciliation behavior remains covered and passing.
- With no local `main`, a merged work branch is reconciled against `refs/remotes/origin/main` and
  the stale pre-review status is reported.
- With neither local nor `origin/main`, one `refs/remotes/upstream/main` ref is used and reports the
  same stale status.
- When local and remote bases disagree, local wins; when `origin` and another remote disagree,
  `origin` wins.
- Two non-`origin` remote matches or no matching ref returns one actionable unknown finding with
  zero examined items.
- `npm test` and `npm run rungs -- check` pass.

### Out of scope

- Fetching refs, changing checkout depth, configuring CI providers, reconciling deleted feature
  branch refs, and changing the known fast-forward-merge limitation.

## Execution

Plan completed 2026-09-05; implementation has not started.

## Review

Not started.
