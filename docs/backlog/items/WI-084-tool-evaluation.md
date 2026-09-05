---
id: WI-084
title: Evaluate tool maturity, improvement candidates and a local interface
type: docs
status: review
branch: docs/WI-084-tool-evaluation
created: 2026-09-05
updated: 2026-09-05
related: [WI-061, WI-063, WI-064, WI-077]
epic:
children: []
---

## Proposal (rationale)

The user requests an evaluation of the tool as it stands, proposals for improvements and modules
that address recurring patterns across AI-coded projects, and an assessment of a local interface.
The result must distinguish shipped behavior, unfinished promises, evidence-backed candidates and
ideas requiring further extraction or user validation.

## Decision

`accepted` — 2026-09-05, by the user's request for this assessment. This authorizes evaluation and
proposal documentation, not implementation of the recommendations or a new product direction.

Follow-up — 2026-09-05: the user approved merging the assessment and requested a remediation
prompt. The companion prompt is a documentation handoff derived from the assessment; execution of
that prompt is a subsequent task.

## Plan

### Requirements

- Inspect the implementation and existing research, decisions and backlog rather than relying on
  public descriptions or status fields alone.
- Verify local checks and state exactly what each command proves and does not prove.
- Rank improvement and module candidates with provenance, overlap, cost and acceptance evidence.
- Compare local interface options and recommend a bounded first experiment with a decision test.
- At the user's closeout request, prepare a copy-ready prompt scoped to existing promises.

### Impacts

Assessment under `docs/design/`, its index, this work item and board, findings if necessary, and
the live session handoff and dated archive. No CLI or module behavior changes.

### Approach

Review implementation maturity, repeated-pattern candidates and interface jobs independently;
reconcile against the same checkout and run the existing verification commands. Use primary public
sources only for a limited ecosystem comparison. Record recommendations as opinions, without
changing accepted decisions or creating speculative implementation items.

### Acceptance criteria / tests

1. A dated assessment names the inspected commit, local verification results and evidence limits.
2. Prioritized proposals distinguish existing work from new candidates and include running costs.
3. The interface recommendation includes alternatives, user jobs, scope and a validation test.
4. References resolve, `git diff --check` and the repository gate set pass, and tracking reflects
   the delivered assessment without implying the proposals were implemented or approved.
5. The user-requested remediation prompt names existing-promise repairs, executable acceptance
   evidence and the boundary between preparation and subsequent implementation.

### Out of scope

Product implementation, new modules, a UI prototype, publication, changes to another repository,
new ADRs and re-opening settled research boundaries. Recommendations remain proposals for decision.

## Execution

Assessment written on `docs/WI-084-tool-evaluation`, based on main commit
`69b605968fafeac02469a9214425d608ca9e8a33`. Independent read-only reviews covered implementation,
pattern proposals and local-interface tradeoffs. Built/source disposable consumers reproduced the
eject failures and missing hook delivery. New findings F-054 through F-057 record hook delivery,
the unused time-budget declaration, session/item contradictions and unknown worktree status.

No CLI/module code changed. No recommendations were implemented, accepted or merged. No deviation
from the evaluation-only scope.

Merge preparation corrected one assessment error: F-029's open status was stale, while the actual
per-finding attribution and independent-control behavior existed and passed the selected regression.
The finding was closed against source/test evidence and WI-081. The companion remediation prompt
requires an executed baseline evidence matrix and names this regression, so the stale premise is
checked before any new repair is opened. The user-requested prompt adds a handoff artifact, not
implementation work, to this assessment's closeout.

## Review

1. The [dated assessment](../../design/tool-evaluation-2026-09-05.md) names the inspected commit,
   reproduced failures, source-inspection limits and local test outcomes.
2. Its priorities and repeated-pattern table distinguish existing items, module extensions and
   external-pack candidates, including runtime and maintenance costs.
3. The interface comparison includes three concrete user tasks, a structured-output prerequisite,
   a static-report experiment and a qualitative decision test before a live application.
4. Initial gates: 30 pass, with 45 self-test fixtures explicitly unrun. Full tests: 139 pass,
   0 fail, 3 host/platform skips. Final documentation verification is recorded in the assessment.

The item remains at `review` because the documentation branch is unmerged. The assessment is
delivered for review; its proposed implementation work has not been authorized by this item.
