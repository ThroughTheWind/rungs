# Session state

The live handoff. **Rewritten as work moves, not appended to.** Everything here is present tense;
history belongs in [`.ai/archive/`](archive/README.md).

Keep it short. This document is read at the start of every session, and a long one is skimmed.

## Current objective

No implementation is active. [WI-101](../docs/backlog/items/WI-101-operator-workflow-extensions.md)
is the next operator-workflow proposal awaiting a decision; its draft plan is not implementation
approval. The release/adoption work in
[WI-064](../docs/backlog/items/WI-064-arena-lab-dogfood-bootstrap.md) remains independent: v0.5.0 is
published, while the maintained Arena Lab pin still needs its own authorized item.

## In progress

The checkout is on `main`. `items/` holds WI-063, WI-064 and WI-101. F-056 remains the only open
finding; the interface treats session prose as authored source, and WI-101 proposes the separate
explicit-reference contract. The local interface is unreleased; `changelog.d/WI-100.md` is pending
the next separately authorized release.

## Resume from

Read [WI-101's Decision and draft Plan](../docs/backlog/items/WI-101-operator-workflow-extensions.md)
before deciding its two pilots and register admission test. Re-fetch and compare local/remote
product changes before any new execution. To inspect this checkout, use `npm run rungs -- ui .`;
the command and limits belong to [the interface contract](../docs/design/local-interface.md).
Current-work status comes from item files, not this handoff's prose.

## Up next

1. Decide WI-101's workflow pilots and register admission test. A proposal does not authorize
   implementation; keep F-056 open until an explicit-reference contract is delivered and verified.
2. With authorization: a dedicated Arena Lab item that runs `node .ai/rungs.mjs upgrade --to 0.5.0`
   on a branch of the maintained checkout, commits the result and records what `upgrade` changed —
   the first real adoption of a released version, as WI-064 criterion 3 requires.
3. Review the pending interface fragment when a version cut is requested; do not infer publishing
   permission from implementation acceptance.
4. Inspect whether the parked `integ/feature/WI-091-index-placeholder-rows` branch is still wanted
   before cleanup. Recheck the workflow dependency notices recorded in the September 6 handoff
   when CI is next touched.

## Active constraints — do not reopen

- Hooks dispatch through the pinned launcher and never block on their own failure; the one-second
  `npm exec` cost per matching tool call is ADR-0010's recorded revisit trigger, not a defect to fix
  by bypassing the launcher.
- The imperative census is explain-only and asserts nothing about enforcement (ADR-0011); do not
  promote it to a gate or add an "unenforced" verdict.
- `eject` retains exactly `check` and `hook`; the retained list is `EJECTED_RETAINED` and every
  sentence about it derives from that list (WI-092).
- The install record is extended, never re-derived (F-017, F-061): `add` appends unrecorded modules
  and `upgrade` edits lines in place; neither re-hashes a file it did not write.
- An install journals before its first write and a retry of the same modules resumes it (WI-098);
  do not add rollback of shared-file merges — that was decided out of scope, not forgotten.
- `check [path] [tier]` is the grammar on both launcher surfaces; a lone positional that is not a
  directory is the tier (WI-094).
- Every test file imports assert from `test/assert.js`, and the test script keeps its heap cap; the
  `tests-guard-large-equality` gate refuses otherwise (WI-095, after three host crashes).
- Defects a verification item finds become new items; the verifier's scope stays verification
  (WI-090 → WI-091, WI-092).
- A gate that examines nothing is retired, not kept for its intent (WI-097); a CLI `design pull` is a
  separate proposal if a consumer ever needs one.
- A synthetic or disposable consumer run is never described as adoption (WI-064 decision).
- The local interface is a foreground view over repository files with explicitly planned check
  execution; no automatic apply, browser authoring or consumer service. Its accepted contract owns
  these boundaries, and it adds no retained `ui` command to eject (WI-100).

## Working assumptions

- The interface may reduce source-navigation work. The recorded agent walkthrough is not an
  independent operator study or measured task speedup; demand and ongoing upkeep remain unverified.
- Arena Lab's maintained checkout has not been re-inspected in this execution session. Its branch,
  worktree changes and pin must be checked again before any adoption work.

## Open questions

- None blocking the completed interface. WI-101 acceptance, optional extension selection, a version
  cut and the separate Arena Lab adoption decision remain open.

## Archive

Latest closeout: [local interface and workflow review](archive/2026-09-13_session-05_local-interface-and-workflow-review.md).

<!-- rungs:begin session-archive -->
<!-- Generated by `rungs render` from .ai/archive/. The link above is relative and assumes
     the archive sits beside this file, which is the default. A relative link between two
     parameterised paths cannot be computed without logic, and ADR-0003 has none — so moving
     one without the other is a divergence `rungs check` will report as a broken link. -->
<!-- rungs:end session-archive -->
