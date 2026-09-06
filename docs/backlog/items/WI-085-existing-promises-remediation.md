---
id: WI-085
title: Complete the consumer promises rungs already ships or has accepted
type: epic
status: accepted
branch:
created: 2026-09-06
updated: 2026-09-06
related: [WI-084, WI-077, WI-061, WI-064, F-054, F-055, F-057]
epic:
children: [WI-086, WI-087, WI-088, WI-089, WI-090]
---

## Proposal (rationale)

[WI-084](../archive/WI-084-tool-evaluation.md) assessed rungs on 2026-09-05 and found that several
promises the README, module manifests and accepted plans make are not kept by the shipped artifact:
`eject` leaves a runner that cannot load, the `instructions` module declares a shell-safety hook no
consumer receives, most self-test fixtures never execute, the accepted imperative and stale-command
detectors have a corpus and no engine, `fast_budget_ms` is documented and unread, and a failed
worktree status read reports as clean. Each is a claim a consumer can read today and act on.

The [remediation prompt](../../design/existing-promises-remediation-prompt.md) prepared at WI-084's
close scopes this programme to **existing** promises. It deliberately excludes the assessment's new
proposals — JSON output, a local inspector, external module roots, validation routing, session
item references, provenance and agent-effects packs — because completing what is already claimed
is the precondition for claiming more.

## Decision

`accepted` — 2026-09-06, by executing the prepared prompt at the user's request. One bounded
programme; separately scoped children; two existing items reused rather than duplicated:
[WI-077](WI-077-standalone-ejected-checks.md) (ejection, child of WI-064) and
[WI-061](WI-061-imperative-staleness-detection.md) (instruction diagnostics) keep their own
records and are executed in this programme's order.

Baseline reconciled on 2026-09-06 before any child opened, from Git and the tests rather than from
the assessment's prose: main `bb0bf2bbac5eac0c3fb4893a4d2f242f95817291`, two commits ahead of
`origin/main` and unpushed; one unrelated uncommitted edit (an F-058 row in the findings register,
added outside this task) preserved and not committed here; Node `v22.22.3`, npm `10.9.8`,
Windows 11. `node src/cli.ts check`: 30 pass, 0 fail, 45 fixtures unrun. F-029's attribution check
`node --test --test-name-pattern 'land distinguishes an inherited failure' test/core.test.js`
passed its one selected test, so the stale finding the assessment first repeated stays closed and
nothing here rebuilds attribution. The per-promise evidence lives in
[`existing-promises-evidence-2026-09-06.md`](../../design/existing-promises-evidence-2026-09-06.md).

## Plan

### Requirements

- Every child names the authoritative claim it completes and closes with executable evidence: a
  command, its actual result, and the date. A finding's open status, a symbol name or a test name
  alone is not evidence.
- No gate is weakened and no expected result is retrofitted to obtain a pass. A rule that turns out
  to be unimplemented is implemented or recorded, never relabelled as obsolete.
- No child adds a format, UI, registry, routing or pack from the assessment's proposals.
- Marketing text is not rewritten to make a broken promise disappear; any narrowing is an explicit
  decision with a recorded consumer consequence.

### Impacts

- `src/lifecycle.ts`, `scripts/build.mjs`, `src/check.ts`, `src/engines*.ts`, `src/selftest.ts`,
  `src/add.ts`, `src/render.ts`, `src/cli.ts`, `src/concurrency.ts`; module tables under
  `modules/*/gates/`; the `instructions` module payload; the registry, README, roadmap and site claim
  snapshot wherever the gate or command count moves.
- Two decisions need records: how hooks reach a consumer harness without breaking ADR-0002, and
  what an instruction detector may assert about enforcement it cannot see (WI-061 R7).

### Approach

Order fixed by the prompt: WI-077 → WI-086 → WI-087 → WI-061 → WI-088 → WI-089 → WI-090. Each
child on its own `feature/WI-###-slug` branch cut from `main`, reviewed against its acceptance
criteria, landed with a merge commit and its status moved in the same change. Unrelated
discoveries become findings, not scope.

### Acceptance criteria / tests

1. Every child is `done`, or removed from this epic with a written reason.
2. The evidence document lists each promise with its implementation path, the command run, the
   actual result and any remaining limitation, and every row's status agrees with Git.
3. Full `npm test`, `node src/cli.ts check`, `node src/cli.ts modules`, `npm pack --dry-run --json`
   and the site build/check pass on the integrated candidate; the exact-SHA CI matrix is recorded
   as observed or as explicitly pending.
4. The programme did not push, tag, publish or modify a maintained downstream repository.

### Out of scope

- Everything in the prompt's exclusion list: JSON/report formats, a local UI, external module roots
  or a registry, validation routing, a session-reference schema, artifact-provenance or
  agent-effects packs. Each remains a separate proposal in
  [`tool-evaluation-2026-09-05.md`](../../design/tool-evaluation-2026-09-05.md).
- Publishing a release or adopting one in Arena Lab; WI-090 prepares the candidate and names the
  remaining step.

## Execution

Opened 2026-09-06. Children carry implementation.

## Review

Not started.
