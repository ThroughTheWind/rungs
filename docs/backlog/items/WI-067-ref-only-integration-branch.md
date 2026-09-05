---
id: WI-067
title: Reconcile backlog state when the integration branch has no local ref
type: feature
status: review
branch: feature/WI-067-ref-only-integration-branch
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
- A missing work-item branch remains non-actionable; fallback applies only to the configured
  integration branch and must not manufacture or infer feature refs.
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
- If neither exists, enumerate configured remotes, construct each remote's exact tracking ref, and
  accept only one match. This keeps `upstream/release/main` distinct from `upstream/main`. Use the
  resolved full ref consistently for both `git branch --merged` and `landedWork`.
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
- A work item whose recorded feature branch ref is absent remains examined without a stale-status
  finding.
- Two non-`origin` remote matches or no matching ref returns one actionable unknown finding with
  zero examined items.
- A nested remote branch ending in the same path component is not mistaken for the configured
  integration branch.
- `npm test` and `npm run rungs -- check` pass.

### Out of scope

- Fetching refs, changing checkout depth, configuring CI providers, reconciling deleted feature
  branch refs, and changing the known fast-forward-merge limitation.

## Execution

Plan completed 2026-09-05. Implementation started on
`feature/WI-067-ref-only-integration-branch` from `b78b331` after rebasing onto the completed WI-066
consumer-pin work.

Added an exact-ref resolver in `src/engines2.ts`. It checks the configured local branch, then the
same branch under `origin`, then constructs exact tracking refs for configured remotes and accepts
a sole match. Both
merged-branch enumeration and merge-parent inspection now use the resolved full ref. Missing and
ambiguous bases return distinct findings without examining work items. No fetch or ref mutation was
added.

Added two Git-backed tests alongside the existing local-branch fixture. They construct remote refs
directly so the scenarios test repository shape without a network or remote server. Implementation
matched the plan; no scope was added.

## Review

- Existing local behavior: the original landed/nothing-landed fixture passes, and the new
  precedence fixture proves a merged local `main` wins over a stale `origin/main`.
- Origin-only and unique-remote behavior: the remote fallback fixture deletes local `main`, first
  reconciles through `refs/remotes/origin/main`, then through a sole
  `refs/remotes/upstream/main`; both report the stale `in_progress` item.
- Deterministic precedence: with local `main` absent, stale `origin/main` wins over a merged
  `upstream/main` and produces no stale-status finding.
- Unknown states: two non-`origin` matches report the sorted candidate refs with `examined: 0`; no
  matching ref reports the absent local/remote condition with `examined: 0`.
- Namespace safety: a sole `refs/remotes/upstream/release/main` does not satisfy an integration
  branch named `main`.
- Missing item refs: after deleting the local feature ref, the remote-fallback fixture still
  examines the item and reports no stale-status finding.
- Read-only boundary: production code invokes only `show-ref`, `remote`, `branch`, `rev-parse`
  and `log`; the ref writes in the tests only construct disposable fixtures.
- `node --test --test-name-pattern="merged-status" test/core.test.js` — 3 passed, 0 failed.
- `npm test` — build succeeded; 43 passed, 0 failed.
- `npm run rungs -- check` — 29 passed, 0 failed, 0 unimplemented, 0 errors. The runner also
  transparently reported the existing 45 self-test fixtures without builders; they are not counted
  as passes.
