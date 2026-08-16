---
id: WI-038
title: Make doctor report a repo's own defects, not only which modules it resembles
type: feature
status: planned
branch:
created: 2026-08-16
updated: 2026-08-16
related: [WI-037, WI-005, ADR-0004, ADR-0005]
epic: WI-037
children: []
---

## Proposal (rationale)

Acts on **claims 3, 12 and 13** of the
[2026-08-16 external review](../../design/external-review-2026-08-16.md).

`doctor` is the advertised entry point and the primary case is retrofit
([`product-brief.md` §2](../../design/product-brief.md)). What it answers today is a *presence*
question: [`src/cli.ts:77-183`](../../../src/cli.ts) scans once and maps fifteen module signatures
over the result, reporting `ours` / `theirs` / `different paradigm` / `absent`, and says so
plainly at line 152 — *"This reports presence, never quality."*

The question an unfamiliar repo actually has is a *defect* question: which of my agent rules say
MUST and have nothing checking them, how many near-identical CI workflows do I have, which topics
have two documents claiming authority, which referenced commands do not exist.

**Those detectors are already written.** They ship as gates inside modules and run only after
installation, over rungs-managed content:

| Question | Existing gate |
| --- | --- |
| Imperative rules with no enforcement | `gates-rules-declare-enforcement` |
| Near-identical CI workflows | `ci-workflow-proliferation` |
| Oversized always-on context | `instructions-core-size` |
| Conflicting or missing document authority | `docauth-scope-headers`, `docauth-ownership-respected` |
| Dead links and nonexistent paths | `gates-links-resolve`, `gates-paths-exist` |

So the analysis is gated behind installing the thing the analysis exists to justify. That is
backwards for a retrofit-first tool, and it is the single cheapest change that makes `doctor`
worth running on a repo that has never heard of rungs.

This continues [WI-005](WI-005-doctor-next-step.md), which fixed `doctor` ending on fifteen
`absent` lines with nothing to do next. WI-005 gave it a next command; this gives it a reason.

## Decision

`accepted` — 2026-08-16, as a child of [WI-037](WI-037-act-on-external-review.md).

## Plan

### Requirements

- A read-only detector pass runs the existing structural engines over an **arbitrary repo**,
  installed or not, and never writes.
- Every reported row carries **a file path and a count or quote**. A row with neither is a bug, not
  a soft finding.
- **No score, grade, letter, percentage, bar, or maturity label anywhere in the output.**
  [ADR-0005](../../decisions/ADR-0005-self-instrumentation.md) Tier C refuses composites
  permanently; the review's own mockup violates this and the adjudication
  ([§4.1](../../design/external-review-2026-08-16.md)) takes the risk register and drops the bars.
- **Under-report deliberately.** [ADR-0004](../../decisions/ADR-0004-adoption-detection.md) biased
  detection signatures toward false negatives; the same bias applies here for a stronger reason —
  these engines read rungs-shaped inputs, so on a foreign repo a technically-correct finding can
  still be framed against a convention the repo never adopted.
- The output states what it did **not** cover, every run, as `doctor` already does at
  [`src/cli.ts:152-154`](../../../src/cli.ts).
- Ends by naming **one** command, as WI-005 established — never the maximal one.

### Impacts

- [`src/cli.ts`](../../../src/cli.ts): `cmdDoctor` gains a detector section and the flag that
  controls it; the `--help` tables gain a row (`--help` completeness is
  [WI-004](WI-004-help-completeness.md)'s standing requirement).
- [`src/engines.ts`](../../../src/engines.ts) / [`engines2.ts`](../../../src/engines2.ts) /
  [`engines3.ts`](../../../src/engines3.ts): engines must be callable outside a registered gate
  registry. Expect this, not the CLI wiring, to be most of the work.
- `README.md`, [`docs/getting-started.md`](../../getting-started.md), and the site's doctor console
  block gain the new output. Coordinate with [WI-040](WI-040-public-surface-first-command.md) so
  the surfaces are written once.
- **Risk:** false positives on foreign repos. Mitigated by the under-report requirement and
  measured by acceptance criterion 4, not by hope.
- **Risk:** run time. `doctor` currently scans once; running six engine families over a large repo
  is a different cost. Measure it; if the pass is slow it goes behind the flag rather than into the
  default path.

### Approach

**Reuse the engines; add no checks.** The value here is reachability, not new detection. A
detector that does not already exist as a gate is out of scope for this item — if the pass wants
one, that is a finding or a new item.

**Two decisions taken against real output, not in this plan:**

1. **Surface.** `--explain` as the review proposes, versus putting the rows in plain `doctor` with
   the flag controlling verbosity. Leaning toward the second — a defect the user must pass a flag
   to see is one most users never see — but a `doctor` that grew long enough to bury its Next line
   would undo WI-005. Decide by printing both against the four source repos.
2. **Framing.** Whether findings are stated as rows or, following ADR-0005 Tier B, as *questions
   with the incident attached*. Tier B's precedent is strong and the provenance already exists in
   every module manifest.

**Verify on the corpus, not on this repo.** rungs passes its own gates by construction, so a run
here proves nothing about a foreign repo. The four source repos are the test set;
[`detection-verification.md`](../../design/detection-verification.md) is the precedent and format.

### Acceptance criteria / tests

1. The pass runs against a repo with no `.ai/rungs.toml` and produces at least one evidenced row,
   with a path, on at least two of the four source repos.
2. Every row's evidence is re-derivable by hand from the path it cites — checked by hand for a
   sample of five.
3. `grep` over the new output paths finds no score, grade, percentage, bar glyph, or
   maturity-label vocabulary (`mature` / `partial` / `weak` / `fragmented`).
4. **Every finding on one foreign repo is triaged by hand into real / mis-framed / wrong**, and the
   count is recorded in the item. A mis-framed rate above roughly one in five means the pass
   under-reports further before it ships — the number is a threshold, not a statistic.
5. `doctor` still ends with exactly one recommended command (WI-005 not regressed).
6. `--help` lists the flag and exits 0 (WI-004 not regressed); `rungs check` passes; `npm test`
   passes.
7. A dated run and its output are recorded in the item's Review, with the command.

### Out of scope

- **A separate `lint agents` command.** Capability first, surface later — see
  [WI-037](WI-037-act-on-external-review.md)'s Out of scope. No follow-up item opened, deliberately.
- **New detectors.** Existing engines only. A wanted-but-missing check becomes a finding.
- **Any maturity score, health grade, or repository rating.** Refused permanently by ADR-0005
  Tier C; not deferred, not a future flag.
- **Writing or fixing anything.** This pass is read-only; remediation stays `add` / `upgrade`.
- **Cross-repo or aggregate reporting.** ADR-0005 Tier C; the question of changing that is
  [WI-041](WI-041-decide-cross-repo-evidence.md), not this item.

## Execution

Not started.

## Review

Not started.
