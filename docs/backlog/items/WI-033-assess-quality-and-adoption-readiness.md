---
id: WI-033
title: Assess repo quality, improvements, and external-adoption readiness
type: spike
status: in_progress
branch: feature/WI-033-assess-quality-and-adoption-readiness
created: 2026-08-15
updated: 2026-08-15
related: [WI-030, WI-031, WI-032]
epic:
children: []
---

## Proposal (rationale)

Rungs is published as `@rungs/cli` but still describes itself as pre-release and has not yet been
installed into an external repository for real. The research and docs refresh can improve the story
without proving that a stranger can safely install, understand, run, upgrade, and recover from the
tool. A bounded quality/readiness assessment is needed before remediation or a public-release push.

This item produces an evidence-backed decision record, not a vague “looks good” review. It separates
repository quality, user experience, packaging/security, and operational release readiness, and it
names blockers rather than silently converting them into release scope.

## Decision

`accepted` — 2026-08-15, by explicit request. Assess first; remediation and publication remain
separate work items so the assessment cannot grade its own fixes.

## Plan

### Requirements

- Create `docs/design/release-readiness.md` with a dated, reproducible checklist covering source
  quality, tests/gates, docs/site, package metadata, clean-install behaviour, Node compatibility,
  security/audit posture, licensing, upgrade/eject safety, and external-user recovery paths.
- Exercise the public workflow in a clean temporary consumer repository: package discovery or packed
  artifact, `doctor`, `init`, `add`, `check`, `render`, `upgrade`/`eject` where applicable, and a
  no-write/dry-run path. Record exact commands, versions, outputs, and environment boundaries.
- Reconcile known findings (including the current site dependency audit finding) and inspect the
  repository for untracked/generated files, stale docs, unsafe defaults, missing release metadata,
  and failure messages that strand an external user.
- Produce a readiness verdict with `blocking`, `remediate-before-release`, `accepted-risk`, or
  `not-applicable` dispositions, owner/follow-up WI, and explicit release recommendation.

### Impacts

- Assessment artifact under `docs/design/`, package metadata/lockfile observations, site and CLI
  validation logs, and backlog/finding dispositions.
- May open or refine findings but must not silently fix them; fixes belong in WI-034 or a separately
  scoped item.
- External network/package operations must be read-only or use a packed local artifact unless the
  user explicitly authorizes publication.

### Approach

1. Define the quality dimensions and evidence standard before running the checks.
2. Run the clean-consumer journey and repository gates on a dated commit; capture failures without
   treating command exit status as proof of quality beyond what it tests.
3. Compare observed behaviour with README/design/roadmap promises and the npm package manifest.
4. Classify every gap, write the release recommendation, and create/identify remediation owners
   without performing remediation in this item.

### Acceptance criteria / tests

1. `docs/design/release-readiness.md` exists, is dated, and every verdict has a path, command/output,
   version/ref, or an explicitly marked judgement.
2. A clean consumer journey is replayable from the recorded commands and covers install/init/check,
   a representative module add, rendering, and a safe failure/recovery path.
3. All blocking or pre-release findings have a disposition and a linked remediation WI; no “ready”
   verdict relies only on `rungs check` or file presence.
4. The report states what remains unknown (provider/network policy, registry publication, platform
   matrix, or other unavailable evidence) rather than inferring readiness.
5. Existing repository/site gates pass, and the assessment itself does not alter `modules/`, package
   version, or publish state.

### Out of scope

- Fixing findings, changing module behaviour, or syncing public docs (WI-032/WI-034).
- Publishing to npm, creating a public release, or announcing readiness (WI-035).
- A benchmark of model quality or a claim that workflow files guarantee user success.

## Execution

Execution started on `feature/WI-033-assess-quality-and-adoption-readiness` after WI-031 and WI-032
merged. The dated evidence report will be [`docs/design/release-readiness.md`](../../design/release-readiness.md).

## Review

Not started.
