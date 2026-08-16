---
id: WI-050
title: Refuse a board row whose group disagrees with the item's status
type: feature
status: done
branch: feature/WI-050-board-reconciled-gate
created: 2026-08-16
updated: 2026-08-16
related: [WI-048, WI-047, WI-008]
epic: WI-048
children: []
---

## Proposal (rationale)

Acts on **claim 8** of the [second external review](../../design/external-review-2026-08-16b.md) —
though not as a claim the reviewer made. They asserted the research corpus now covers 14 public
frameworks. Checking that turned out to be the finding.

**It does**, and **the board says otherwise.** Measured 2026-08-16:

| Board group | Rows | Their files say |
| --- | ---: | --- |
| `Proposed` | 9 | `status: done`, all nine |
| `Planned` | 5 | `status: done`, all five |

Nine of those rows now link into `archive/`, because
[`rungs backlog archive`](WI-047-backlog-archive-command.md) moves finished items — so the board
files a row as **proposed** while pointing at a document in the directory whose README says the work
can no longer change. An outside reader who trusted the board would have concluded the framework
research had not been done. This reviewer read the corpus instead and got the right answer.

**Every existing mechanism is one level too low.** `backlog-merged-status` reconciles a *branch*
against the status field, and it is the gate this repo cites most often as proof that typed
bookkeeping decays. Nothing reconciles the *board* against the same field — the exact failure, one
layer up, in the file every session opens first.

## Decision

`accepted` — 2026-08-16, as a child of [WI-048](WI-048-act-on-second-external-review.md).

## Plan

### Requirements

- A gate refuses a `BACKLOG.md` row grouped under a heading that contradicts the linked item's
  `status`.
- The mapping is declared in the gate table, not in code — this repo's statuses are a module
  parameter's worth of convention, and a consumer repo may rename a heading.
- A row linking to an item that does not exist is refused (`backlog-ids` covers dangling ids; this
  covers a row pointing at the wrong file).
- Narrative prose that names an item is **not** a board row and is not checked. The board's
  paragraphs deliberately discuss finished work.
- The 14 current disagreements are fixed in the same change, or the gate ships red.

### Impacts

- [`modules/backlog/gates/ids.toml`](../../../modules/backlog/gates/ids.toml) — a new table section.
- Possibly a new engine, or an extension of `cross-reference`. Prefer the extension: a new engine
  for one gate is how a registry grows checks nobody maintains.
- [`BACKLOG.md`](../BACKLOG.md) — 14 rows move to the right groups.
- Every consumer repo gains the gate on upgrade. **That is the point and it is also a risk**: a repo
  with a differently-shaped board gets a red gate on install. The heading mapping must be
  configurable, and the gate must state what it assumes.

### Approach

Parse the board's `##` headings and the rows beneath each, resolve each row's link, read the target's
`status`, compare against the heading's declared status set. Report the row, the heading, and the
actual status.

**Do not infer the heading set from the file.** A heading nobody declared is either a typo or a
board this gate does not understand, and both should be reported rather than silently accepted.

### Acceptance criteria / tests

1. A row under `Proposed` linking a `done` item fails, naming the row, the heading and the status.
2. A row under the correct heading passes.
3. Prose mentioning a finished item outside any table passes.
4. A heading not in the declared mapping is reported, not ignored.
5. Self-test fixtures state both directions.
6. `BACKLOG.md`'s 14 disagreements are corrected; `rungs check` passes.

### Out of scope

- **Auto-moving rows.** The gate refuses; a person moves. Rewriting the board is
  [`rungs backlog archive`](WI-047-backlog-archive-command.md)'s job for files, and a gate that
  edits the thing it checks cannot be trusted to have checked it.
- **The `In progress` / `Review` groups' branch fields.** `backlog-merged-status` owns those.

## Execution

Branch `feature/WI-050-board-reconciled-gate`, cut from `main` at `16da7bf`.

New `board-reconcile` engine in [`src/engines3.ts`](../../../src/engines3.ts), gate
`backlog-board-reconciled` on the `backlog` module (version 1.0.0 → 1.1.0), heading map declared in
[`ids.toml`](../../../modules/backlog/gates/ids.toml). Gate count 21 → 22.

### Deviations from the plan

1. **A new engine, not an extension of `cross-reference`.** The plan preferred the extension on the
   grounds that a new engine per gate is how a registry grows checks nobody maintains. Reading it
   settled the question the other way: `crossReference` asks whether a *skill description* names a
   neighbouring skill. Reconciling a board grouping against a linked file's frontmatter shares no
   input, no table shape and no output with that. Overloading it would have produced one engine with
   two unrelated table schemas, which is a worse maintenance object than two honest ones.

2. **Requirement 4 — "a heading not in the declared mapping is reported, not ignored" — was dropped,
   and the case it was written for is covered better.** Implemented as written, the gate produced
   **seven findings against a correct document**: the board's narrative sections ("The first-user
   path — WI-001…007, closed 2026-08-15") tabulate finished items under prose headings, and the
   heading says so.

   The requirement was aimed at a *typo* silently hiding rows from the check. Reporting every
   undeclared heading is a bad proxy for that — it flags legitimate prose and still would not tell
   you which group went missing. So an undeclared heading is now narrative, and the typo case is
   caught exactly: **every declared group must appear as a heading**. Misspell `Proposed` and the
   gate says `declared group 'Proposed' has no heading in the board` — the precise failure, named.

3. **`upgrade --apply` does not rewrite the gate registry.** Bumping the module version updated files
   but left `.ai/gates.toml` at `backlog@1.0.0`; `rungs add backlog` re-registered it. Not
   investigated further and not fixed here — it is a real gap in `upgrade` and it is
   [F-016](../FINDINGS.md), not this item's.

## Review

Verified 2026-08-16 on `feature/WI-050-board-reconciled-gate`.

**1 · A row under `Proposed` linking a `done` item fails, naming row, heading and status.**

```
archive/WI-001-done.md is under 'Proposed' but its status is 'done' (expected proposed)
```

That is the exact shape that was live on this board when the review arrived. **Met.**

**2 · A correctly grouped row passes.** Asserted in the same test. **Met.**

**3 · Prose mentioning a finished item outside a status group passes.** Asserted against a narrative
table under `## The first-user path, closed` — the real false positive from deviation 2. **Met.**

**4 · A heading not in the mapping is handled.** Not as the plan specified — see deviation 2. A
misspelled `Propsed` is caught by the missing-group check instead, which is stronger: it names
`Proposed` as the group that vanished rather than reporting an unfamiliar string. **Met by a
different mechanism, recorded rather than quietly substituted.**

**5 · Self-test fixtures state both directions.** Added to `ids.toml`;
`gates-self-tests-both-directions` passes. Still declarations rather than assertions —
[F-006](../FINDINGS.md)/[WI-045](WI-045-run-gate-self-tests.md) — so the four-case unit test is what
actually runs.

**6 · The board's 14 disagreements are corrected; `rungs check` passes.** Corrected in the
preceding commit: WI-031/032/033/034 and WI-021–029 removed as `done`, WI-035 moved to `Review`.
`rungs check` → **22 pass · 0 fail · 0 unimplemented · 0 error**, with
`backlog-board-reconciled` examining 12 rows. `npm test` → 17 pass, up from 16. **Met.**

### What this gate does not cover

Rows are checked; **prose is not**. The board's paragraphs discuss finished work by design, and a
sentence claiming an item is planned when it is done will not be caught. That is deliberate — the
alternative is a gate that refuses narrative — and it is the residual risk of this design, stated
rather than discovered later.
