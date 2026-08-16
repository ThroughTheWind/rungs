---
id: WI-053
title: Census `--explain` against every repo available, and publish the false-positive rate
type: spike
status: planned
branch:
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

Not started.

## Review

Not started.
