# Cross-repo evidence: the argument, at its strongest, and the answer

> **Authoritative for:** whether rungs may ever hold evidence gathered across more than one
> repository, and which of the three things that phrase covers is refused.
> **Not authoritative for:** the rest of [ADR-0005](../decisions/ADR-0005-self-instrumentation.md)
> Tier C — rework rate, attribution and composite scores are untouched here.
>
> Produced by [WI-041](../backlog/archive/WI-041-decide-cross-repo-evidence.md). Its outcome is
> recorded in ADR-0005 itself.

## The proposal

Both external reviews landed on the same idea, and the second called it the most defensible version
of the product. Neither the modules, the CLI, nor the templates are hard to copy; what would be is a
catalogue of failure patterns keyed by how often each is *actually observed*:

```text
P-026 unenforced imperative
observed across: 312 repositories
confidence: high
```

The second review extended it to an eventual organisational product — *"across 300 repositories,
which have unenforced policies, which have conflicting agent instructions, which are shipping
enormous global contexts?"*

## Why this needed a decision rather than a refusal

[ADR-0005](../decisions/ADR-0005-self-instrumentation.md) Tier C already refuses *"any network
transmission or cross-repo aggregation… including opt-in"*. It would have been easy to quote that
and stop.

Two things made that inadequate. **The ADR's stated reason is about transmission** — an opt-in
network path *"would make every other guarantee here conditional"* — while the reviewer's counts do
not obviously require one. And **this repo's own worst-known weakness is the same shape**: four
source repos, one author, so every convergence in the pattern catalogue is one operator agreeing
with themselves. An argument for wider observation is not obviously wrong here; it is the thing the
research most needs.

So the phrase had to be split before it could be answered.

## The three things "cross-repo evidence" means

| | What it is | Who holds the data | Verdict |
| --- | --- | --- | --- |
| **(a)** Counts collected from **users'** repositories | Telemetry, however phrased | Us | **Refused, permanently** |
| **(b)** Counts derived from **public** repositories the operator reads | Research | Us, from public sources | **Already permitted — and already happening** |
| **(c)** A count within **one** repository, never leaving the machine | The gate ledger | The repo's owner | **Already Tier A** |

Collapsing these is what made the proposal look blocked. Only (a) is refused.

### (a) — refused, and the reason is not squeamishness

An opt-in network path changes what every other promise in this product means. Today
[`product-brief.md` §8](product-brief.md) can say *"no telemetry to us"* without qualification, and
`eject` can be a promise rather than a courtesy, because there is nothing to be cut off from. Add a
flag and every one of those becomes *"unless you enabled it"* — a sentence a reader has to check
their own configuration to evaluate.

It also inverts the product's own argument. rungs exists to say that a repository's claims about
itself should be mechanically checkable **by its owner**. A tool that quietly accumulates
observations about repositories it was invited into is making claims about them to someone else.

And the honest engineering cost is not the flag. It is an endpoint, a retention policy, a privacy
statement, a legal basis in some jurisdictions, and a breach story — before a single pattern count
is more trustworthy than the one below.

**Unchanged. The ADR was right and stays as written.**

### (b) — permitted, and this is where the reviewer's instinct actually lands

Nothing prevents reading public repositories and counting what is found there. **This project has
already done it twice**: fourteen public frameworks extracted under
[WI-009](../backlog/archive/WI-009-public-agent-framework-corpus.md) and
[WI-018](../backlog/archive/WI-018-follow-on-public-agent-research.md), each pinned to a commit SHA
with its licence recorded, precisely because a date alone does not make a count reproducible when
other people are pushing.

That is the same evidence the reviewer wants, obtained the way this repo already obtains evidence:

- the operator reads, so the reader is accountable for what the count means;
- sources are public and pinned, so anyone can re-derive it;
- nothing is transmitted, so no guarantee becomes conditional.

It is slower and it does not scale, and **both of those are features here**, because the failure
this project is most exposed to is a confident number nobody can re-derive.

**Clarified rather than changed.** Tier C's bullet says *aggregation*, which read plainly also covers
(b) — and (b) has been happening in this repo throughout. That ambiguity is a defect in the ADR, and
it is what this document fixes.

### (c) — already allowed

The gate ledger, Tier A: local, gitignored, never transmitted. Untouched.

## What would change the answer to (a)

Recorded so a future proposer meets a test rather than a wall:

1. **A repo owner can produce the count themselves, and choose to publish it.** Not a flag in the
   tool — a command whose output they read first. That is a different product and it is not refused
   here, because nothing is transmitted by us.
2. **The pattern catalogue is shown to be wrong in a way only breadth could have caught**, on
   evidence rather than intuition. [WI-053](../backlog/archive/WI-053-false-positive-census.md)'s
   census is the honest version of that experiment and it produced 0% — measured across eleven
   project shapes built by **one operator**, which is exactly the limit at issue.
3. **Someone other than this project's author wants it**, which no review has yet established: both
   reviews are one reader, and one reader asking twice is one data point asked twice.

## The answer

**ADR-0005 Tier C stands, with its aggregation bullet split.** (a) refused permanently; (b) named as
permitted and already in use; (c) unchanged.

The reviewer's strategic instinct is right — evidence about how often a failure pattern actually
occurs *is* the durable thing here. The disagreement is only about where it comes from, and the
answer this project can defend is: from sources anyone can check, read by someone who is accountable
for the reading.
