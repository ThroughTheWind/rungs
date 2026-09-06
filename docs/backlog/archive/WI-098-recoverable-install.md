---
id: WI-098
title: Make an interrupted install recoverable — journal first, atomic writes, a retry that keeps ownership
type: chore
status: done
branch: feature/WI-098-recoverable-install
created: 2026-09-06
updated: 2026-09-06
related: [WI-093, WI-085, ADR-0004]
epic:
children: []
---

## Proposal (rationale)

F-058 (the user's finding, 2026-09-06): `add` and `init` write module files one by one with direct
`writeFileSync`, skip any file that already exists, and save the install record only after every
module, gate and hook phase. An interruption — a killed process, a full disk, a path that turns out
unwritable — leaves the files written so far with no record. A retry then sees them as
"already present — left alone", classifies them as **kept**, and never hashes them: the module's own
files become user-owned forever, `upgrade` skips them, `doctor` calls them yours. A process killed
mid-write can also leave a truncated file that the retry keeps. Nothing exposes the interrupted state,
and nothing tests any of it.

## Decision

`accepted` — 2026-09-06, at the user's request. Recoverable, not transactional: full rollback of
shared files somebody else may have edited between the interruption and the retry is a promise this
tool cannot keep. The promise it can keep is that an interrupted install is **visible**, **completable
without losing ownership**, and never leaves a half-written file behind.

## Plan

### Requirements

- Before the first write, the install writes a journal under `.ai/` naming the run's modules,
  harnesses, start stamp, and every planned file emission with whether it pre-existed. `--dry-run`
  writes no journal.
- Every module file is written atomically: to a sibling temporary name, then renamed into place.
- The journal is removed after the install record is written and the renderings are applied; its
  absence means "no install in flight".
- A retry of the same modules with a journal present treats files the journal marks as created by the
  interrupted run as **ours** — rewritten and hashed — and files it marks as pre-existing as kept.
  A different module set with a journal present is refused with a message naming the interrupted
  run and the command that completes it.
- `doctor` reports an interrupted install read-only: start stamp, modules, files written and not yet
  recorded, and the completing command.

### Impacts

- `src/add.ts` (`addModule` write path, journal helpers), `src/cli.ts` (`cmdAdd` phases, `cmdDoctor`),
  `test/core.test.js`, the packed journey's `git status` assertions (must stay clean: the journal is
  gone by then).

### Approach

Journal + atomic rename + retry-aware classification. Alternatives: (a) write everything to a staging
directory and move at the end — rejected, a directory move is not atomic on Windows and the shared
fragment files (`AGENTS.md`, `.ai/gates.toml`) are merged, not moved; (b) full rollback on failure —
rejected, see Decision; (c) hash every existing file as ours on retry — rejected, that is exactly how
a user's pre-existing file would be silently reclassified (the WI-093 / F-017 failure).

### Acceptance criteria / tests

1. A core test makes a later emission target unwritable (a directory where a file belongs) so `init`
   fails after earlier files were written, then asserts: journal present, no install record, the
   earlier files present, no temporary files left; `doctor` names the interrupted install and the
   completing command; after removing the obstacle, the same `init` completes, the record hashes the
   earlier files as ours (not kept), the journal is gone, and `doctor` reports every module ours.
2. The same test asserts a different module set is refused while the journal exists, and that
   `--dry-run` writes no journal.
3. Serial suite, packed journey and `rungs check` pass.

### Out of scope

- Rolling back shared-file merges or gate registrations; nothing else deferred.

## Execution

Branch `feature/WI-098-recoverable-install` from `33390651`, 2026-09-06. Two choices the plan left
open, recorded here:

- **Fault injection over obstacle files.** The plan proposed making a later target unwritable. The
  path preflight refuses such a tree before the first write — which is correct, and means it cannot
  produce a partial install. The regression instead sets `RUNGS_FAULT_INJECT_WRITE=<target>`, a
  documented test-only environment variable that makes the write of that one file throw; nothing reads
  it otherwise.
- **The journal is JSON, not TOML.** It is machine-written and machine-read, transient, and never
  hand-edited; the install record stays TOML because people read it.

The journal lives at `.ai/rungs-install.journal.json`; `--dry-run` never writes it; `doctor` reads it
read-only; `add` refuses a different module set while it exists and resumes the same set.

## Review

1. `node --test --test-name-pattern '^an interrupted install is journaled' test/core.test.js`: 1/1
   (2026-09-06). A tracked `init` interrupted on `docs/backlog/README.md` exits 1 naming the module
   and the fault; the journal exists with `.ai/rungs.mjs` and the failed file both marked `create`; no
   record; the earlier files present; no `.rungs-tmp` anywhere. `doctor` prints "Interrupted install —
   started 2026-09-06: instructions, gates, backlog…" with the completing command. `add ci` is refused
   naming the four modules it does not include and writes nothing. A `--dry-run` init on a fresh
   directory writes no journal. The retried `init` prints "resuming the install interrupted on
   2026-09-06", exits 0, clears the journal, and the record hashes `.ai/rungs.mjs` and
   `docs/backlog/README.md` as ours with neither in a kept list; `doctor` then reports every module ours.
2. `npm test`: 158 tests, 155 pass, 0 fail, 3 skipped, 281 s (the packed journey's `git status`
   assertions hold: the journal is gone before they run). `node src/cli.ts check`: 32 pass.
3. Not proven: a real process kill mid-write. The atomic write is a rename, whose guarantee is the
   filesystem's, and the fault injection exercises the interruption path around it rather than the
   kill itself.
