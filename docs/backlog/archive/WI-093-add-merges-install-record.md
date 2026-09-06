---
id: WI-093
title: Make `add` after `init` extend the install record instead of replacing it
type: chore
status: done
branch: feature/WI-093-add-merges-install-record
created: 2026-09-06
updated: 2026-09-06
related: [WI-086, WI-085, ADR-0004]
epic:
children: []
---

## Proposal (rationale)

F-061, reproduced 2026-09-06: `rungs add <module>` on a repository that already has an install record
calls `writeInstallRecord` for this run's dependency closure only, so `.ai/rungs.toml` is rewritten
with just those modules. Every other installed module's block disappears, along with the hash of
every file that already existed — including `.ai/rungs.mjs`. `doctor` then reports the vanished
modules as `theirs`, `upgrade` skips them, and `eject` refuses the launcher as edited. `add` after
`init` is the README's advertised way to grow a scaffold, and the packed journey never exercised it.

## Decision

`accepted` — 2026-09-06, at the user's request to tackle F-059 to F-063. F-017's rule applies: the
record is edited surgically, never re-derived, because re-deriving would stamp our hash onto files
the user diverged.

## Plan

### Requirements

- When a record exists, `add` keeps its `[repo]` table and every existing module block byte for
  byte and appends blocks only for modules the record does not yet name.
- A module already recorded and pulled in again by dependency is left untouched.
- Without a record, behaviour is unchanged.

### Impacts

- `src/add.ts` (`writeInstallRecord`), `test/core.test.js`, `test/package.test.js` (the journey grows
  an `add` step after `init`).

### Approach

Read the existing record's module names through `readRecord`; emit blocks for the new modules only and
append them to the existing text. Alternative — merge parsed data and re-serialise the whole record —
rejected: it would re-hash files and reorder text nobody changed, the failure mode F-017 already paid for.

### Acceptance criteria / tests

1. A core test runs `init <dir> tracked` then `add ci --into <dir>` through the CLI and asserts the
   record still names every tracked module, keeps the launcher hash, and gains `ci`; `doctor` reports
   the original modules as ours and `upgrade` previews them.
2. The packed journey runs `add` after `init` and asserts the same on the isolated candidate.
3. Serial suite and `rungs check` pass.

### Out of scope

- Rolling back a partially written `add` (F-058, the user's own finding); nothing else deferred.

## Execution

Branch `feature/WI-093-add-merges-install-record` from `22887f0e`, 2026-09-06. As planned. One
choice worth recording: the packed journey's `add` step runs on a copy of the consumer taken after
`init`, because the journey's later assertions (gate counts, render report, ejected inventory) are
written against the tracked module set and adding `ci` to the real consumer would have changed every
one of them. The copy is discarded after the record and `doctor` assertions.

## Review

1. `node --test --test-name-pattern '^add after init extends' test/core.test.js`: 1/1 (2026-09-06).
   Record after `add ci`: every prior line byte for byte, `ci` appended, launcher hash present;
   `doctor` reports every module `ours`; `upgrade` previews the original modules; a repeated `add`
   leaves the record identical.
2. Packed journey alone: 1/1 in 40 s with the copy-based `add` step (2026-09-06).
3. Serial suite `NODE_OPTIONS=--max-old-space-size=2048 node --test --test-concurrency=1 test/*.test.js`:
   153 tests, 150 pass, 0 fail, 3 skipped, 147 s. `node src/cli.ts check`: 31 pass.
