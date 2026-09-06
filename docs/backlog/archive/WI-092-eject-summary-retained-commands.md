---
id: WI-092
title: Make the eject summary name every retained command
type: chore
status: done
branch: feature/WI-092-eject-summary-retained-commands
created: 2026-09-06
updated: 2026-09-06
related: [WI-090, WI-086, WI-077]
epic: WI-085
children: []
---

## Proposal (rationale)

The disposable Arena Lab canary run by [WI-090](WI-090-integrated-consumer-verification.md) on
2026-09-06 printed, at the end of `rungs eject`, "Only `check` survives ejection; add, upgrade,
render and the rest are gone until you re-adopt." Two commands later the same canary ran
`node .ai/rungs.mjs hook instructions-shell-backticks` against the ejected launcher and got the
expected block. [WI-086](WI-086-consumer-hook-delivery.md) retained `hook` in the
launcher, the runner and the ejected README, and left this one sentence typed by hand in `src/cli.ts`.
A summary that understates what survived is the kind of stated fact this tool claims to keep true.

## Decision

`accepted` — 2026-09-06 under WI-085, as work discovered by WI-090's canary. Derive the sentence from
the retained list so it cannot drift again.

## Plan

### Requirements

- The eject summary names every command in `EJECTED_RETAINED`, derived rather than typed.
- The packed journey asserts the sentence names both `check` and `hook`.

### Impacts

- `src/cli.ts` (`cmdEject`), `test/package.test.js`.

### Approach

Import `EJECTED_RETAINED` where the summary is printed and join it. Alternative: retype the sentence
— rejected, since that is how it drifted.

### Acceptance criteria / tests

1. The packed journey's eject step asserts `Only \`check\` and \`hook\` survive ejection`.
2. `rungs check` and the serial suite pass.

### Out of scope

- The `check [path] [tier]` versus `check [tier]` asymmetry between the CLI and the ejected launcher
  (F-063); nothing else deferred.

## Execution

Branch `feature/WI-092-eject-summary-retained-commands` from `0a50515f`, 2026-09-06. One commit, as
planned; no deviation.

## Review

1. `node --test --test-concurrency=1 --test-name-pattern '^a packed candidate retrofits' test/package.test.js`
   passes (1/1, 41 s, 2026-09-06) with the new assertion on the eject summary.
2. Serial suite `NODE_OPTIONS=--max-old-space-size=2048 node --test --test-concurrency=1 test/*.test.js`:
   152 tests, 149 pass, 0 fail, 3 skipped, 158 s (2026-09-06). `node src/cli.ts check`: 31 pass.
