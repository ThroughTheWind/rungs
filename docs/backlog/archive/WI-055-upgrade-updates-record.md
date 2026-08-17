---
id: WI-055
title: Make `upgrade` update the install record without touching diverged files
type: feature
status: done
branch: feature/WI-055-upgrade-updates-record
created: 2026-08-16
updated: 2026-08-16
related: [WI-054, F-017, ADR-0004]
epic:
children: []
---

## Proposal (rationale)

Promoted from [F-017](../FINDINGS.md), found while reproducing
[F-016](../FINDINGS.md) during [WI-054](WI-054-upgrade-registers-gates.md).

`rungs upgrade --apply` did not update `.ai/rungs.toml`. After upgrading `session` from 1.1.0 to
1.2.0 the record still read `1.1.0`, so:

- `doctor` describes the repo to its owner as running the previous version;
- `planUpgrade` offers the same upgrade forever, because it compares the module against a number
  that never moves.

**The obvious fix is worse than the bug**, which is why this is an item rather than a one-liner.
`writeInstallRecord` re-derives the whole record and hashes **every emitted file that exists** — so
it would stamp *our* hash onto a file the user had diverged. `planUpgrade` classifies by comparing
disk against the recorded hash, so that file would flip from `diverged` to `current`, and the next
upgrade would overwrite an edit [ADR-0004](../../decisions/ADR-0004-adoption-detection.md) promises
is never touched. A stale version number is cosmetic; silently discarding a user's edit is not.

## Decision

`accepted` — 2026-08-16, directed by the user.

## Plan

### Requirements

- After upgrading, the record names the version each module moved to.
- Hashes update **only for files this run actually rewrote**.
- A diverged file's recorded hash is unchanged, and it is still reported as diverged afterwards.
- The record's header comment, kept-file lists, params and untouched modules survive verbatim.

### Impacts

- [`src/lifecycle.ts`](../../../src/lifecycle.ts): a new `updateRecordAfterUpgrade`, and
  `applyUpgrade` tracking what it wrote. Its return type gains `recorded`.
- `cmdUpgrade`'s summary line.

### Approach

**Surgical text edit, not a re-serialisation.** Walk the record's lines, track which
`[modules.X]` / `[modules.X.hashes]` section is open, replace the `version` line and any hash entry
whose path this run rewrote, and pass everything else through untouched. Parsing and re-emitting the
TOML would lose the header comment that explains what the file is — and would reintroduce exactly
the whole-record rewrite this item exists to avoid.

### Acceptance criteria / tests

1. The record's version matches the module after upgrading.
2. A rewritten file's hash is updated.
3. A diverged file's hash is unchanged **and it is still reported as diverged**.
4. Header comment and untouched modules survive.
5. `rungs check` and `npm test` pass.

### Out of scope

- **New modules appearing in the record.** `upgrade` only touches modules already installed; a
  module the repo does not have is `add`'s job. Nothing deferred.
- **Params.** They are the repo's choices and an upgrade does not re-resolve them.

## Execution

Branch `feature/WI-055-upgrade-updates-record`, cut from `main` at `bd0e4a2`.

Reproduced end to end on a scratch consumer with the divergence in place — install `tracked`, edit
`.ai/session.md` so it diverges, then release a `session` version that changes a *different* file:

```
updated 1 file(s) · 6 gate registration(s) · 2 record line(s)
versionBefore 1.1.0 · versionAfter 1.2.0
divergedHashUnchanged true · divergedStillReported true · headerCommentKept true
```

The third value is the one the item is about: after the upgrade, `rungs upgrade` still lists
`.ai/session.md` as diverged, so the user's edit keeps the protection ADR-0004 promises.

## Review

Verified 2026-08-16.

**1 · The record names the new version.** `1.1.0 → 1.2.0` on the scratch consumer, and the summary
line reports `2 record line(s)` — one version, one hash. **Met.**

**2 · A rewritten file's hash is updated.** Asserted in the unit test against a fixture record; the
end-to-end run rewrote one file and recorded one hash. **Met.**

**3 · A diverged file keeps its hash and stays diverged.** Both halves checked, because the first
without the second would not prove anything — a hash could survive while the file was reclassified
for another reason. `divergedHashUnchanged: true`, and re-running `upgrade` still reports the file.
**Met, and this is the criterion the item exists for.**

**4 · Header, params, untouched modules survive.** `headerCommentKept: true` end to end; the unit
test additionally pins an untouched `[modules.other]` at its original version and the header's first
line. **Met.**

**5 · Gates and tests.** `rungs check` → **23 pass · 0 fail · 0 unimplemented · 0 error**.
`npm test` → **21 pass**, up from 20. **Met.**

### What this leaves

`planUpgrade` still reports a module as upgradeable between the version bump and the next
`--apply`, which is correct. And an upgrade that writes **no** file still updates the version line —
correct too, since the module genuinely moved, and it is what stops the same upgrade being offered
forever.