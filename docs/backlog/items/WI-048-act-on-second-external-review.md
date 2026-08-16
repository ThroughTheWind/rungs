---
id: WI-048
title: Act on the second external review
type: epic
status: accepted
branch:
created: 2026-08-16
updated: 2026-08-16
related: [WI-037, WI-035, WI-041, ADR-0004, ADR-0005]
epic:
children: [WI-049, WI-050, WI-051, WI-052, WI-053]
---

## Proposal (rationale)

The same outside reviewer re-assessed rungs after [WI-037](WI-037-act-on-external-review.md)
shipped. Recorded and adjudicated in
[`external-review-2026-08-16b.md`](../../design/external-review-2026-08-16b.md).

**Most of it agrees with decisions already made**, including one the reviewer had argued against
first time — they withdrew their own recommendation for tracker adapters after reading why it was
refused. Agreement produces no work. Five things do:

1. **The most differentiated capability is invisible from the entry point.** `doctor` prints no
   occurrence of the string `explain`, so the analysis is discoverable only from `--help`. The
   reviewer's shape — a short count and the command, not the findings — respects
   [WI-005](../archive/WI-005-doctor-next-step.md)'s one-next-command rule.
   → [WI-049](WI-049-doctor-advertises-analysis.md)
2. **The board contradicts fourteen item files.** Nine rows under `Proposed` and five under
   `Planned` name items whose files read `status: done`; nine now link into `archive/`, so the board
   says *proposed* about a document filed under "cannot change any more". This is the finding the
   reviewer *should* have made and did not — they checked the corpus, got the right answer, and our
   board would have told them otherwise.
   → [WI-050](WI-050-board-reconciled-gate.md)
3. **The site's status line is stale** — *"20 gates register"* against 21 since WI-044. Typed into
   `site.config.ts`, whose own comment calls this the thing this repo has the most scar tissue
   about, next to a `TODO (generate-derivable)`.
   → [WI-051](WI-051-derive-site-claims.md)
4. **Applicability is not first-class.** The reviewer's strongest technical recommendation across
   both reviews: *can this detector legitimately interpret this repository* must be asked before
   *did the condition fire*. It exists — as two hard-coded sets of engine names in one file, which
   is the shape that goes stale.
   → [WI-052](WI-052-detector-applicability.md)
5. **Generalisation is now the main risk**, and it is unmeasured beyond the four source repos.
   → [WI-053](WI-053-false-positive-census.md)

**Why now.** The reviewer's own priority order is *make doctor excellent on arbitrary repos, measure
false positives brutally, make public claims reproducible, get outsiders running it* — and the
`rift-forge` incident is our argument for it, not theirs. Nothing here broadens the product.

## Decision

`accepted` — 2026-08-16. The user supplied the review and directed the same process as the first.
Claims verdicted `noted` produce no work and their reasons are in the adjudication rather than
restated per item.

## Plan

### Requirements

- **No new module and no new pattern.** Same first requirement as WI-037, and the reviewer's
  explicit advice.
- Each child names the review claim it acts on, so the adjudication stays checkable.
- No child weakens [ADR-0005](../../decisions/ADR-0005-self-instrumentation.md) Tier C. The fleet
  product the review speculates about is the same cross-repo boundary
  [WI-041](WI-041-decide-cross-repo-evidence.md) still holds, deliberately unopened.
- Every count written to a public surface is derived or dated-and-gated; none is typed and left.

### Impacts

- **CLI:** `doctor` gains a summary line (WI-049). No new command.
- **Gates:** one new declared gate reconciling the board (WI-050). 21 → 22.
- **Site:** `site.config.ts` numbers become derived or checked (WI-051).
- **Architecture:** detector applicability moves from hard-coded sets to a declared property
  (WI-052). This is the only structural change and it may want an ADR.
- **Evidence:** a false-positive census across every repo available locally (WI-053).
- **Release state** is *not* impacted: the 0.1.2/0.1.3 ambiguity the review flags is already
  [WI-035](WI-035-public-release.md)'s, which is `planned`. Opening a second item for it would be
  the duplicate-tracking failure this repo exists to argue against.

### Approach

**Sequence: 050 → 049 → 051, then 052 → 053.** WI-050 first because it is the smallest and because
a board that lies makes every later claim about "what is done" unverifiable. WI-052 before WI-053 so
the census measures the abstraction rather than the current hard-coded sets — otherwise the census
has to be re-run.

**Where the review is followed against instinct:** claim 13 asks for analysis to be advertised from
plain `doctor`, and WI-038 deliberately put it behind a flag after measuring 114 findings on
`hexguard`. Both are right — the fix is to advertise the *existence* and the *count*, never the
findings. If WI-049's output grows past a few lines it has failed.

**Open:** whether WI-052 warrants an ADR. It changes how every detector declares itself, which is
ADR-0003 territory. WI-052 decides against its own diff.

### Acceptance criteria / tests

1. All five children reach `done`, or one is closed with a written reason naming the claim it drops.
2. `rungs doctor` names the analysis and its size in **no more than three lines**, and still ends
   with exactly one recommended command (WI-005 not regressed).
3. No board row's group disagrees with its item's `status` field, and a gate refuses it.
4. No number on a public surface is both typed by hand and unchecked.
5. Detector applicability is declared per detector, not listed centrally by engine name.
6. A false-positive rate is published per repo across every repo available, with the method stated.
7. `rungs check`, `npm test`, and the site build pass at the epic boundary.

### Out of scope

- **The fleet / multi-repo product.** ADR-0005 Tier C; [WI-041](WI-041-decide-cross-repo-evidence.md)
  holds the question and stays `proposed`. Nothing deferred here.
- **Publishing 0.1.3 or resolving the release-state ambiguity.** [WI-035](WI-035-public-release.md).
- **New detectors.** WI-053 may *report* that a class of problem is undetected; adding one is a
  separate item, and only once independent repos show it recurring — the review's own rule.
- **Anything verdicted `noted`.** On record in the adjudication; produces no work.
- **Whether `--explain`'s surviving findings are *valuable*** — the question §4 of the adjudication
  says nobody has asked. It needs a repo owner, not a measurement, and there is no honest way to
  answer it from here.

## Execution

Not started.

## Review

Not started.
