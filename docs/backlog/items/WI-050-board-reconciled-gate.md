---
id: WI-050
title: Refuse a board row whose group disagrees with the item's status
type: feature
status: planned
branch:
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

Not started.

## Review

Not started.
