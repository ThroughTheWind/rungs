---
id: WI-041
title: Decide whether cross-repo pattern evidence is ever in scope, and record it
type: spike
status: proposed
branch:
created: 2026-08-16
updated: 2026-08-16
related: [WI-037, ADR-0005]
epic: WI-037
children: []
---

## Proposal (rationale)

Acts on **claim 16** of the
[2026-08-16 external review](../../design/external-review-2026-08-16.md).

The review's headline strategic recommendation is that the durable advantage here is not the
modules, the CLI, or the templates — all copyable — but a catalogue of failure patterns keyed by
how often each is actually observed:

```text
P-026 unenforced imperative
observed across: 312 repositories
confidence: high
```

**That is refused by an accepted decision.**
[ADR-0005](../../decisions/ADR-0005-self-instrumentation.md) Tier C rules out *"any network
transmission or cross-repo aggregation"*, explicitly *"including opt-in"*, with the stated reason
that an opt-in network path *"would make every other guarantee here conditional."*

So this is not a feature request with a scheduling problem. It is an outside reader identifying the
most defensible version of this product and an accepted ADR refusing it on trust grounds. Both
positions are coherent, and **the collision deserves an answer on the record** — because it will be
proposed again, by someone who has not read Tier C, roughly every time the project is discussed.

Two things make this more than a formality. First, the ADR's stated reason is about *transmission*,
while the review's counts could in principle come from repos the operator reads themselves — a
distinction Tier C does not currently draw, and possibly should. Second, this repo's own biggest
known weakness is that its four source repos share an author, so **every convergence in the pattern
catalogue is one operator agreeing with themselves** — which is an argument for wider observation
that the review did not make and that already has an accepted answer of its own
([WI-018](WI-018-follow-on-public-agent-research.md): read public repos, do not collect from users).

## Decision

Undecided — awaiting the decision this item exists to produce. Opened `proposed` deliberately: a
spike that assumes its own outcome is not a spike.

## Plan

> Filled on acceptance. What follows is the question and its boundaries, which are what a decision
> needs; the method is one document and a conversation.

### Requirements

- Produce **one** outcome, dated, in the decision record: ADR-0005 amended with a new trust posture
  and the conditions attached, **or** ADR-0005 reaffirmed with the refusal restated and this
  item's argument named as considered-and-declined.
- Distinguish the three things the review's single mockup bundles, since they have different costs
  and different answers: (a) counts collected from users' repos, (b) counts derived from public
  repos the operator reads, (c) a per-repo count that never leaves the machine and is already
  Tier A.
- State the cost of each honestly — trust posture, privacy surface, the infrastructure it implies,
  and what it does to every other guarantee the tool makes.
- Whichever way it goes, [`external-review-2026-08-16.md`](../../design/external-review-2026-08-16.md)
  §4.2 links to the outcome, so the adjudication does not read as unresolved forever.

### Impacts

- [ADR-0005](../../decisions/ADR-0005-self-instrumentation.md) — amended or annotated. Tier C is
  cited by [`product-brief.md` §8](../../design/product-brief.md) and by
  [`README.md`](../../../README.md)'s design commitments, so an amendment touches both.
- **No code.** A decision that lands as an implementation is a decision nobody made.
- If the answer is (b) — public repos only — it is closer to
  [WI-018](WI-018-follow-on-public-agent-research.md)'s existing method than to anything new, and
  may need no ADR change at all. Establish that before proposing one.

### Approach

To be written on acceptance. The shape: one document that puts the review's argument at its
strongest next to Tier C's stated reason, separates (a)/(b)/(c), and ends in a recommendation a
person accepts or rejects. **The strongest form of the argument for is written by whoever is
inclined to refuse it** — an ADR that beats a weak version of its alternative is the same defect as
a gate that has never fired.

Timebox it. This is a decision, not a research programme, and it must not block the release.

### Acceptance criteria / tests

1. ADR-0005 carries a dated outcome — amendment or reaffirmation — with the reasoning.
2. (a), (b) and (c) are separately answered; a single verdict covering all three is a failed spike.
3. The argument for is stated at its strongest before it is answered.
4. §4.2 of the adjudication links to the outcome.
5. If reaffirmed, the refusal is stated somewhere a future proposer will actually meet — not only
   inside a 250-line ADR.

### Out of scope

- **Building anything.** No collection, no endpoint, no opt-in flag, no schema — including a
  disabled one. Nothing deferred: if the answer is yes, the implementation is a new item with its
  own plan.
- **The per-repo ledger.** Already accepted as Tier A and unaffected either way.
- **Widening the research corpus.** [WI-018](WI-018-follow-on-public-agent-research.md) owns that
  and is already accepted.
- **Reopening the rest of Tier C** — rework rate, session outcomes, instruction attribution,
  composite health scores. This item is the aggregation bullet only. The score bullet is separately
  reaffirmed in [§4.1](../../design/external-review-2026-08-16.md) of the adjudication.

## Execution

Not started.

## Review

Not started.
