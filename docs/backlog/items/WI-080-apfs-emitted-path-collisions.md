---
id: WI-080
title: Refuse APFS emitted-path storage aliases
type: feature
status: in_progress
branch: feature/WI-080-apfs-emitted-path-collisions
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, WI-073, WI-079, F-051]
epic: WI-064
children: []
---

## Proposal (rationale)

WI-073 made module emission a complete preflighted operation, but its portability comparator uses
NFD plus ECMAScript `/iu` matching. That matcher applies Unicode simple case folding and cannot
expand multi-code-point storage aliases. It therefore treats `ß`/`ss` and `ﬁ`/`fi` as different
destinations even though default case-insensitive macOS APFS addresses each pair as one inode.

This reaches bundled behavior without an external module. On exact main `9b99350`, all three of
these production dry runs exited zero instead of refusing; the emitted-path implementation did not
change between that commit and this branch's exact green base `6c3b846`:

- `session.path=docs/straße/README.md`, `session.archive=docs/strasse`;
- `session.path=docs/ﬁ/README.md`, `session.archive=docs/fi`;
- structural `session.path=docs/ß`, `session.archive=docs/ss`.

A direct `planUpgrade`/`applyUpgrade` probe with the bundled `session` module also accepted both
exact aliases while missing and wrote both outputs. On APFS the second write replaces the first;
a file/descendant alias can instead fail after earlier modules have already written. The accepted
preflight therefore permits the partial or silently collapsed operation it exists to prevent.

## Decision

`accepted` — 2026-09-05, by the user during the Arena Lab bootstrap. Treat [F-051](../FINDINGS.md)
as release-blocking and close the missing portability class before v0.4.0 or an APFS consumer is
allowed to run `add` or `upgrade --apply`.

## Plan

### Requirements

- One deterministic storage key must represent the Windows/default-APFS collision relation used by
  both managed Git refs and emitted consumer paths.
- Complete-operation preflight must reject exact and file/descendant `ß`/`ss` and `ﬁ`/`fi` aliases
  on every host, before direct install or upgrade writes any file.
- Planning and application must each validate stored-record paths independently; a caller-supplied
  upgrade plan cannot bypass the fixed comparison.
- Existing canonical-equivalence, J-caron, sigma, case, containment, reserved-sink and atomicity
  behavior must remain intact.

### Impacts

- The Unicode storage key currently private to `src/concurrency.ts` becomes a small shared source
  used by `src/emitted-path.ts` for exact and per-segment ancestry comparison.
- `test/emitted-path.test.js` gains portability and operation-level regressions using the bundled
  `session` module and its configurable live/archive paths.
- The pending v0.4.0 changelog records the newly refused alias class.

### Approach

Use WI-079's already-reviewed, locale-independent key: NFKD, lower case, upper case, then NFKD
again. Full conversion expands the aliases simple folding misses, and compatibility decomposition
keeps the comparison conservative for a plan that may move between filesystems. Keep the key's
contract explicitly scoped to one already-separated segment. Compare exact absolute paths only
after splitting on the native separator and requiring the same number of segments; compare
ancestors the same way over the shared prefix. This preserves the existing rule that normalization
never creates path structure because U+FF3C and U+FF0F decompose to ASCII separators under NFKD.

Move the key into a dependency-free helper rather than copying it. Querying the current filesystem
was rejected because both destinations are still missing when preflight matters, and because a
plan accepted on Linux must remain safe after checkout on macOS or Windows. Extending the regex
with a hand-maintained exception table was rejected because it would encode examples, not the
storage relation.

### Acceptance criteria / tests

1. Unit preflight refuses both candidate orders and both alias orientations for sharp-S and
   ligature exact and file/descendant pairs; the existing J-caron and sigma regressions still pass.
   Flat filenames containing fullwidth reverse solidus or fullwidth solidus remain distinct from an
   ASCII nested path in both candidate orders, with real coexistence exercised where available.
2. Real bundled `rungs add session` invocations for exact and structural aliases fail before
   dependencies, session files, gates, render output or the install record are written.
3. A stored `session` record with either alias family is refused during `planUpgrade`; a forged
   missing-file plan is independently refused by `applyUpgrade`, and each consumer stays empty.
4. Focused emitted-path tests, full `npm test`, every registered Rungs gate, package dry-run and
   diff checks pass locally; the exact pushed commit is left for independent review and the full
   six-cell OS/Node plus site CI matrix.

### Out of scope

- [F-034](../FINDINGS.md) CRLF parsing and byte-preserving record updates.
- New path syntax, external module roots, or changes to existing symlink, junction, hard-link and
  time-of-check boundaries.
- Cutting or publishing v0.4.0, changing Arena Lab, landing this branch, or deleting worktrees.

## Execution

Branch `feature/WI-080-apfs-emitted-path-collisions` was created with `rungs session start` from
exact verified `green/main` commit `6c3b846bbbc21d6255db84323db54facc08ddef2`. The plan, finding
promotion and epic links were committed first as `36121c9`.

Red-first execution reproduced the gap at every intended boundary. The focused file had three
failures: raw preflight accepted the first sharp-S exact pair, stored upgrade planning accepted the
same pair, and the real bundled CLI completed the same `session` install instead of refusing it.
The other nine tests passed and two file-symlink tests skipped for Windows privilege.

`src/storage-key.ts` now owns the dependency-free NFKD/lower/upper/NFKD key previously private to
the concurrency loop. Both `concurrency.ts` and `emitted-path.ts` use that one comparison, while
emitted-path ancestry remains segment-based. The regression matrix covers sharp-S and ligature
forms in both textual orientations and both candidate orders, exact and structural. The operation
tests exercise eight real `session` CLI installs and eight stored-record cases; planning and a
forged application each refuse, with every consumer still empty.

Independent review of the first implementation candidate `8d481119` found that its exact-path
comparison passed a whole native path to the compatibility key. NFKD turns U+FF3C into reverse
solidus and U+FF0F into solidus, so the comparison could falsely report a flat filename as the same
destination as a nested path. A red-first Windows regression reproduced the U+FF3C false collision.
The shared helper is now named and documented as segment-only; exact emitted paths split on the
native separator, require equal segment counts, and compare corresponding segments. Both fullwidth
characters are accepted against the nested ASCII spelling in either order, and both pairs coexisted
as separately readable files on the local NTFS volume.

Local verification on 2026-09-05:

- focused `test/emitted-path.test.js`: 15 total, 13 pass, 2 expected Windows privilege skips;
- full `npm test`: 129 total, 126 pass, 3 expected platform/privilege skips, 0 fail;
- `node src/cli.ts check`: 30 pass, 0 fail; it separately reports the existing 45 fixtures without
  builders as not-run rather than passes ([F-018](../FINDINGS.md));
- `npm pack --dry-run --json`: 112 entries, 368,708-byte package, including `src/storage-key.ts`;
- `git diff --check`: clean.

## Review

Self-review on 2026-09-05 found the change remains within the accepted comparator and regression
boundary. Criterion 1 is met locally by the exact/structural unit matrix and the retained J-caron
and sigma cases, plus the fullwidth-separator non-collision matrix and NTFS coexistence probe.
Criterion 2 is met by actual non-dry-run CLI refusal with empty target directories. Criterion 3 is
met by independent plan and apply assertions across every alias/shape orientation. The local half
of criterion 4 is met by the focused, full, gate, package and diff evidence above.

Independent source review and the exact pushed six-cell OS/Node plus site CI matrix remain pending.
The item therefore stays `in_progress`; [F-051](../FINDINGS.md) remains open, and nothing is landed
or archived from this branch.
