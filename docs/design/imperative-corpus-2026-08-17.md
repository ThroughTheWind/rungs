# Imperative detection — corpus, before the matcher

> **Gathered 2026-08-17 for [WI-061](../backlog/items/WI-061-imperative-staleness-detection.md).**
> This document exists because that item's Approach step 1 says *corpus first, engine second* —
> an oracle built after the matcher inherits the matcher's blind spots, which is the documented
> failure ([WI-042](../backlog/archive/WI-042-link-line-references.md)) this repository keeps
> re-learning. **No detector has been written.** Nothing here is a measured false-positive rate.

## What is on this machine

102 directories under `C:\Development\Repositories`, of which **110 files** are agent instruction
documents (`AGENTS.md` / `CLAUDE.md`). That count is misleading and saying why is the point: the
great majority are `rift-forge-*` worktree copies of one repository, so a pooled rate over 110
files would mostly be one document counted forty times.

[WI-053](../backlog/archive/WI-053-false-positive-census.md)'s rule already covers this — **per-repo
rates, never pooled** — and it is why the corpus below is listed by distinct repository.

## Candidate lines per distinct repository

`grep -nEi '\b(must|never|always|shall|required|mandatory|do not|don'\''t)\b'` over each repo's
instruction files, 2026-08-17:

| Repository | Candidate lines |
| --- | --- |
| `rift-forge-candidate` | 134 |
| `rewind` | 31 |
| `ai-cli` (this repo) | 24 |
| `hexguard` | 10 |
| `hexguard-templates` | 10 |
| `axiom-mesh` | 0 |
| `gridforge` | 0 |

Two repositories with **zero** matter as much as the large one: a detector that reports nothing on
them is correct, and any future claim that instruction files "always" contain unenforced rules is
already falsified by two repos in this corpus.

## The finding that changes the design

**Reading the candidates by hand, almost all of them are genuine imperatives.** Instruction files
are rule documents by construction, so the base rate of "a modal verb here is a real rule" is very
high — unlike the all-markdown scan that produced 46.6% false positives in WI-042, where most
`file.ts:387` matches were ordinary prose.

The false-positive shapes that do appear are narrow and mostly mechanical to exclude:

- **Heading qualifiers** — `## Design system — source of truth (MANDATORY for any UI work)`. A
  label on a section, not a rule with an object.
- **Statements of fact about the repo**, not instructions — `Build-internals are never mirrored`.
  Grammatically identical to a rule; different in kind.
- **Quotations and examples**, which the approach already excludes by skipping code spans and
  fenced blocks.

So the risk WI-061's Impacts section flags — *"a regex over prose is exactly the shape that
produced 46.6%"* — is **materially lower for this scope than for WI-042's**, because the scope is
instruction files rather than all prose. That is a reason to keep the scope narrow, not a reason to
relax the measurement.

## What is still required before anything ships

Unchanged from the item, and none of it is done:

1. **The oracle.** Hand-classify the candidate lines per repo into rule / not-a-rule *before* the
   matcher exists. This document collects the corpus; it does not classify it.
2. **[R7](../backlog/items/WI-061-imperative-staleness-detection.md)'s ADR** — what a detector may
   assert about a repository whose enforcement surface it cannot see. This is the requirement the
   item turns on, because the capability's last appearance was a fabricated console block, and
   *"8 of 17 have no mechanical enforcement"* is not a statement anyone can make about someone
   else's repo from its markdown.
3. **Per-repo false-positive rates**, with the threshold WI-053 set: above roughly one in five on
   any single repository, the class is narrowed or dropped rather than shipped.

## What this cannot tell you

- It is one operator's machine, and the corpus is dominated by one project's worktrees. A rate
  measured here is a rate about these repositories, not about repositories.
- The by-hand reading above is an impression, not a classification. It is recorded as the reason to
  keep going, not as evidence that the detector will pass.
- Zero detectors exist. Every number here is a count of *candidate* lines — what a naive matcher
  would look at, not what a correct one would report.
