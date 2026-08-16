---
id: WI-053
title: Census `--explain` against every repo available, and publish the false-positive rate
type: spike
status: done
branch: spike/WI-053-false-positive-census
created: 2026-08-16
updated: 2026-08-16
related: [WI-048, WI-038, WI-042, WI-052]
epic: WI-048
children: []
---

## Proposal (rationale)

Acts on **claims 15 and 16** of the
[second external review](../../design/external-review-2026-08-16b.md):

> The remaining risk is no longer mainly over-engineering. It's now generalisation. … If the next 20
> genuinely unrelated repositories produce useful `doctor --explain` results with low false-positive
> rates, I'd move the concept from interesting niche developer tool toward potentially important
> infrastructure.

**The argument for this is ours, not theirs.** `--explain` shipped claiming a 0% mis-framed rate
measured on three repos. Running it against the fourth produced **46.6% false positives**, and the
triage that missed it shared the engine's own assumption
([WI-042](../archive/WI-042-link-line-references.md)). One repo moved the headline number by 46
points. There is no reason to believe nine repos is enough either — and right now nine is what we
have.

A census is cheap, it is the kind of measurement
[ADR-0005](../../decisions/ADR-0005-self-instrumentation.md) explicitly calls legitimate ("count the
current state, act, then replace the census with a gate"), and it is self-eliminating.

**What it cannot do, stated up front:** every repo reachable from here was built by the same
operator. A census over them measures whether the detectors survive *different shapes*, not
different *people*. That is a real result and it is not the reviewer's test. Nothing in this item
should be reported as though it were.

## Decision

`accepted` — 2026-08-16, as a child of [WI-048](WI-048-act-on-second-external-review.md).

## Plan

### Requirements

- Run `--explain` against **every** repo available locally, not a chosen sample. A sample chosen by
  the person hoping for a low number is not a measurement.
- Classify every finding: real / mis-framed / wrong. Publish the rate **per repo**, never pooled —
  pooling hides the `rift-forge` case, which is the whole point.
- The triage must **not** share the engines' assumptions. That is the specific failure of WI-038's
  first triage, and it is why this item exists.
- Report the repos where the pass found nothing, and say which produced nothing because they are
  clean versus because nothing was detected as present.
- State the census's own limit — one operator — in the output, not just in this item.

### Impacts

- A census script, and a dated results document under [`docs/design/`](../README.md).
- Probably several new findings; possibly items if a class of false positive recurs.
- Runs after [WI-052](WI-052-detector-applicability.md), so it measures declared applicability
  rather than the current hard-coded sets — otherwise it has to be run twice.

### Approach

**Classify by re-derivation, not by inspection.** For each finding, resolve the claim independently
of the engine that produced it — the filesystem for a path, an independent count for a population, an
independent line count for a budget. Where a class cannot be re-derived mechanically, hand-check a
sample and say it is a sample.

**Expect the interesting result to be a repo, not an average.** The useful output of the `rift-forge`
run was not "46.6%", it was "`:line` code references". A rate tells you whether to ship; a class
tells you what to fix.

### Acceptance criteria / tests

1. Every locally available repo is run, and the list of repos is in the results document.
2. Per-repo real / mis-framed / wrong counts, with the classification method stated per finding
   class.
3. The triage tool is shown not to share the engines' assumptions — by construction, described.
4. Any false-positive class above roughly one in five on any single repo becomes a finding or an
   item before this closes.
5. The one-operator limit is stated in the results document.
6. `rungs check` and `npm test` pass.

### Out of scope

- **Fixing what it finds.** Findings and items; this measures.
- **Cloning public repos to widen the corpus.** A different item with a licence question and a
  network dependency, and it is the reviewer's test rather than this one. Named here so the gap is
  explicit rather than quietly folded in.
- **Judging whether findings are *valuable*** — [§4 of the adjudication](../../design/external-review-2026-08-16b.md)
  says nobody has asked, and it needs a repo's owner. A census cannot answer it.
- **Adding detectors.** Only when independent repos show a failure recurring.

## Execution

Branch `spike/WI-053-false-positive-census`, cut from `main` at `c81f2a1`. Results:
[`docs/design/explain-census-2026-08-16.md`](../../design/explain-census-2026-08-16.md).

**2,291 findings across 6 repositories, 0 wrong, 0 unclassified.**

### Three things the census found about its own method

1. **82 directories are not 82 repositories.** 63 of them are `rift-forge*` worktrees and clones of
   one project. Censusing them would have manufactured a sample size four times the truth, with the
   average dominated by a single repo. Three are kept. The plan said "every repo available, not a
   chosen sample" — this is the one deviation from that, and it is the opposite of cherry-picking.

2. **A count against a live repo needs a commit, not a date.** `rift-forge` reported 2,057 findings
   during [WI-042](../archive/WI-042-link-line-references.md) and 1,994 here, hours apart the same
   day — it took a docs merge at 19:00 in between. Every row is now pinned to a SHA plus the number
   of uncommitted files. This is the rule [`roadmap.md`](../../roadmap.md) already applies to the
   public-framework research, arriving from the other direction.

3. **Silence has two causes.** Four of the sixteen silent repos had **zero modules in scope** — no
   detector was ever eligible, so the repo was not examined. The other twelve were examined and
   produced nothing. Reporting both as "clean" would be the false-negative version of exactly the
   error this census exists to measure.

## Review

Verified 2026-08-16.

**1 · Every available repo run, and the list published.** 82 `.git` directories found, 22 censused
after the worktree collapse, all named in the results document with their SHAs. **Met, with the
deviation in Execution 1 stated rather than absorbed.**

**2 · Per-repo counts with the method stated per class.** Six rows, four classification methods
tabulated. No pooled rate is published anywhere — `rift-forge` is 87% of all findings, so a pooled
number would be its number wearing a corpus's clothes. **Met.**

**3 · The triage does not share the engines' assumptions — shown, not asserted.** This is the
criterion the item exists for, because WI-038's did share them and therefore could not fail. The
classifier was run against ten findings that are true or false by construction, including the exact
`:line` case that defeated the previous triage, and required to produce every verdict including
`unclassified`. All ten correct. **Met.**

**4 · No class above one in five.** The highest rate is 0%. Nothing opened. **Met — and §6 of the
results document says why that is weaker than it looks.**

**5 · The one-operator limit stated in the output.** §4 of the results document, not only here:
every repository was built by the same person, so this measures survival across eleven project
*shapes*, not across other people. That is not the test the review asked for and the document says
so. **Met.**

**6 · Gates and tests.** `rungs check` → 23 pass · 0 fail. `npm test` → 20 pass. **Met.**

### What this closes, and what it does not

It closes the question *"do the detectors fire wrongly on repos with different shapes?"* — no,
measurably, at 0% over 2,291 findings with a classifier proven able to say otherwise.

It does not close **generalisation**, which the second review called the main remaining risk, and it
cannot: the corpus is one operator's. Nor does it touch whether the surviving findings are *worth
acting on* — §5 — which needs a repository's owner rather than a measurement. Both are recorded as
open questions rather than answered by a number that does not address them.
