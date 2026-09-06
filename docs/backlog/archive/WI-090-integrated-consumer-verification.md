---
id: WI-090
title: Verify the integrated candidate as a packed consumer and hand the canary step to WI-064
type: chore
status: done
branch: feature/WI-090-integrated-consumer-verification
created: 2026-09-06
updated: 2026-09-06
related: [WI-085, WI-064, WI-066, WI-068, WI-077, WI-086, WI-087, WI-061]
epic: WI-085
children: []
---

## Proposal (rationale)

Each child of [WI-085](WI-085-existing-promises-remediation.md) verifies its own change. None of
them proves that the changes compose: that a consumer built from the integrated commit still
retrofits an existing repository, that the hook adapter survives ejection, that the new detectors
and metadata ride the ejected runner, and that the release flow [WI-064](../items/WI-064-arena-lab-dogfood-bootstrap.md)
accepted — exact producer commit → tarball and integrity → disposable canary at an exact consumer
commit → immutable release → exact pin — has a concrete candidate to start from.

## Decision

`accepted` — 2026-09-06 under WI-085. Run the complete lifecycle against the integrated candidate
and prepare the flow's first step. This item does not push, tag, publish or change a maintained
branch; if the canary needs authorization not established in the session, it stops at the packed
candidate and names the remaining action.

## Plan

### Requirements

- The generic packed existing-repository journey and a full lifecycle (doctor → init → check →
  upgrade → eject → package-free direct and aggregate checks → hook after eject) pass from the
  integrated commit's tarball with npm, the installed prefix and the producer path unavailable.
- Every engine and metadata dependency added by WI-086, WI-087 and WI-061 is present in the ejected
  runner; a gate that needs materialized data fails explicitly rather than passing on an empty set.
- Post-eject hook behaviour is resolved against WI-077's retained surface, in the ejected output.
- The handoff names the exact producer commit, the tarball name and integrity, and the exact Arena
  commit a disposable canary would run against, with the commands to run it. If a disposable canary
  is run, it runs in a throwaway clone and its result is recorded with both commits; a synthetic
  fixture is never described as adoption.

### Impacts

- `test/package.test.js` (the journey grows eject and hook steps), the evidence document, WI-064's
  execution record, `.ai/session.md`.

### Approach

Extend the existing journey rather than writing a second one, so the isolation harness (packed
dependency closure, stripped PATH, prefix realpath checks) is shared. Then remove the tool prefix
and run the ejected surface. Record the exact SHA the CI matrix must run against, and whether it ran.

### Acceptance criteria / tests

1. `npm test` passes with the extended journey; the journey's assertions cover eject, the removed
   prefix, direct and aggregate ejected checks, and the ejected hook verdicts.
2. `node src/cli.ts check`, `node src/cli.ts modules`, `npm pack --dry-run --json`,
   `npm run build --prefix site` and `npm run check --prefix site` pass on the integrated commit.
3. The handoff lists producer commit, tarball, integrity, consumer commit, and the exact remaining
   canary/adoption commands; the CI matrix result for the exact SHA is recorded as observed or as
   pending because the commit was not pushed.

### Out of scope

- Publishing, tagging, pushing, or editing Arena Lab's maintained branch.
- Any producer test that reads private Arena content.

## Execution

Branch `feature/WI-090-integrated-consumer-verification`, cut from `675780c7` and rebased onto
`34f36243` after the two items it spawned landed. Deviations from the plan, with reasons:

- **The journey was not extended here.** WI-077 and WI-086 had already grown `test/package.test.js`
  through eject, prefix removal, direct and aggregate ejected checks and the ejected hook verdicts, so
  the requirement was met before this item opened; re-verified by running it, not by editing it.
- **A disposable canary was run, and it found two defects.** The plan allowed it; the boundary was
  respected (a `git clone --no-hardlinks` of the local Arena Lab checkout, detached at
  `f4ede7931a7012c45308bb6f32f9fcd027e8dea7`, its `main` on 2026-09-06; the maintained checkout was
  only read). At producer `675780c7` the untouched scaffold failed `adr-index-current` because the
  template's placeholder row was counted as a record, and `eject` printed that only `check`
  survived while the ejected hook then worked. Both became new items rather than widening this one:
  [WI-091](WI-091-index-placeholder-rows.md) and
  [WI-092](WI-092-eject-summary-retained-commands.md), landed at `0a50515f` and `34f36243`.
  The canary was re-run at `22edbe3` on this branch: every step exit 0 or the expected hook code.
- **One canary step was my own error.** The CLI parses `check [path] [tier]`, so `rungs check full`
  looked for a repository named `full`; the ejected runner parses `check [tier]`. Recorded as F-063,
  not fixed here; the re-run used `check . full`.
- **Claims retyped.** `docs-version-claims` measured `src/` at 9,691 lines against README and roadmap
  sentences saying ~8,747 (9.8% drift, inside the gate's 10%); both retyped to the measured number.

Canary script and logs live in the session scratchpad (`arena-canary.sh`, `canary-run.out`,
`canary-run2.out`); the log lines that matter are quoted in WI-064's Execution.

## Review

Against the acceptance criteria, 2026-09-06, on this branch rebased onto `34f36243`:

1. **Journey.** `test/package.test.js` "a packed candidate retrofits an existing repository without
   taking over its authorities" passes and already asserts eject, the removed prefix, direct and
   aggregate ejected checks, the ejected hook verdicts and, since WI-092, the eject summary. It ran
   inside every serial suite below and alone under WI-092 (1/1, 41 s).
2. **Producer runs on the integrated tree.** `node src/cli.ts check`: 31 pass, 0 fail, 0 unrun
   fixtures. `node src/cli.ts modules`: 15 modules. `npm pack --dry-run --json`: `rungs-cli-0.4.0.tgz`,
   121 entries, `sha512-bhz8RMHMUe4zQfHb3SqqKm2/TeCWJSpDywEZzHQC7EbpDaRPIvHiEykdpkvidtFGascXZ6mo5FvtEPPePxQdeA==`
   on the working tree after the README retype (recompute from the exact commit at release; README is
   packed). Site: `npm run build --prefix site` 171 pages, `npm run check --prefix site` 2,651 internal
   links, 0 broken. Serial suite `NODE_OPTIONS=--max-old-space-size=2048 node --test
   --test-concurrency=1 test/*.test.js`: first run 152 tests, 148 pass, **1 fail**, 3 skipped, 144 s —
   the packed journey's assertion that the producer checkout is unchanged across the run, because the
   session archive note was written while it ran; not a product defect. Re-run on the finished tree
   with nothing editing it: 152 tests, 149 pass, 0 fail, 3 skipped, 143 s (2026-09-06 04:02–04:04 UTC).
3. **Handoff.** WI-064 § Execution names the producer state, the tarball and its integrity, the exact
   Arena Lab commit `f4ede7931a7012c45308bb6f32f9fcd027e8dea7`, both canary results with their
   commands, and the three remaining steps (push and CI matrix, release, pin) as not authorized here.
   The CI matrix for the exact SHA is recorded as **pending** because the commit was not pushed.

Disposable canary (throwaway clone, never the maintained checkout), 2026-09-06: first run at producer
`675780c7` failed 1 of 24 gates and read back a stale eject summary — WI-091 and WI-092; second run at
`22edbe3` passed every step: `doctor` 0, `check` 23 pass, `upgrade` plan 0, `upgrade --apply` 0,
`check` 24 pass, `check . full` 24 pass, `doctor --explain` 0 (22 imperative rows, fast-tier budget
median 1,653 ms against 30,000), hook 2 then 0, `eject --dry-run` 0, `eject` 0, then with the tool
prefix renamed away `node .ai/rungs.mjs check` 24 pass, `check full` 24 pass, ejected hook 2 then 0,
and the settings entry present. A synthetic disposable run, not adoption.
