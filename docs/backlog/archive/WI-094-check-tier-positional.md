---
id: WI-094
title: Make `check <tier>` mean the tier on both launcher surfaces
type: chore
status: done
branch: feature/WI-094-check-tier-positional
created: 2026-09-06
updated: 2026-09-06
related: [WI-077, WI-090, ADR-0008]
epic:
children: []
---

## Proposal (rationale)

F-063, from the WI-090 canary: the CLI parses `check [path] [tier]`, so `node .ai/rungs.mjs check
full` through the pinned npm launcher looks for a repository at `./full` and exits 1 with "no gates
registered — is this a rungs repo?". The ejected runner parses `check [tier]`, so the same command
after ejection runs the full tier. The ejected README documents `check [tier]`, and a consumer who
quotes it before ejecting gets a wrong answer that looks like a broken install.

## Decision

`accepted` — 2026-09-06, at the user's request to tackle F-059 to F-063. One grammar on both
surfaces: `check [path] [tier]`, where a lone positional that is not an existing directory and carries
no path separator is the tier. Flags keep working.

## Plan

### Requirements

- CLI: `check full` from inside a repository runs the full tier; `check <dir> full` and `--full` are
  unchanged; `check nonsense` reports an unknown tier, never "no gates registered".
- Ejected runner: `check full`, `check . full` and `check <its own root> full` all run the full
  tier; a path that is not the repository it lives in is refused with a message, exit 1.
- The ejected README and runner usage say `check [path] [tier]`.

### Impacts

- `src/cli.ts` (`case 'check'`), `src/ejected-runner.ts`, `src/lifecycle.ts` (ejected README),
  `test/core.test.js`, `test/package.test.js` (the ambiguous form joins the journey).

### Approach

Shared rule: a first positional is a path if it names an existing directory or contains a path
separator; otherwise it is the tier. Alternative — tier only by flag on both surfaces — rejected:
it would break every consumer's `check full` in CI workflows the `ci` module already emitted.

### Acceptance criteria / tests

1. Core test: in a fresh tracked scaffold, `check full` exits 0 and prints the full tier; `check
   nonsense` exits 1 with `unknown tier`; after `eject`, `node .ai/rungs.mjs check . full` and
   `check full` both run the full tier and `check <elsewhere> full` is refused.
2. Packed journey: `check full` from the consumer directory through the installed candidate passes
   beside the existing `check <dir> full`.
3. Serial suite and `rungs check` pass.

### Out of scope

- Any other CLI grammar; nothing else deferred.

## Execution

Branch `feature/WI-094-check-tier-positional` from `497c079f`, 2026-09-06. As planned, with one
detail the plan left open: the ejected runner refuses a path that is not its own repository rather
than re-rooting, since it has no other repository's frozen tables to run. The packed journey's new
runs sit after its ledger arithmetic, because a successful `check` appends rows and the first
placement broke the "both runs recorded" count — moved, not weakened.

## Review

1. `node --test --test-name-pattern '^check takes the same' test/core.test.js`: 1/1 (2026-09-06) —
   CLI `check <dir> full`, `check full`, `check . full` run the full tier, `check nonsense` exits 1
   with `unknown tier "nonsense"` and no "no gates registered"; after `eject`, the launcher runs the
   full tier for `check full`, `check . full`, `check <root> full` and `--full`, refuses another
   directory with exit 1, and reports an unknown tier.
2. Packed journey alone: 1/1 in 42 s with the lone-tier and unknown-tier forms through the installed
   candidate (2026-09-06).
3. Serial suite `NODE_OPTIONS=--max-old-space-size=2048 node --test --test-concurrency=1 test/*.test.js`:
   154 tests, 151 pass, 0 fail, 3 skipped, 166 s. `node src/cli.ts check`: 31 pass.
