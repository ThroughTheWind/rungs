# ADR-0005 — Self-instrumentation: the runner records what it observes, and nothing else

- **Status:** accepted (narrowed from the original proposal)
- **Date:** 2026-08-14
- **Phase:** 3 (product definition)
- **Decided out of order**, before ADRs 0002–0004, because it changes what every gate-shipping
  module must emit and therefore blocks the Phase 4 module contracts.

---

## Context

[synthesis §6](../research/synthesis.md) named this the corpus's biggest gap:

> *No repo tracks agent-session outcomes: rework rate, gate hit rate, which instruction prevented
> what. Every improvement here was justified by an incident, never by a trend.*

**That framing was wrong in two ways, and correcting it is most of this decision.**

**First, it bundled three things of wildly different tractability.** "Rework rate" needs session
hooks and a judgement call about what counts as rework. "Which instruction prevented what" is
unknowable — you cannot observe a counterfactual. "Gate hit rate" is a fact the runner already
has. One of the three is addressable; the synthesis presented them as one gap.

**Second, "justified by an incident, never by a trend" undersells what `rift-forge` did.** It
measured constantly — 7 of 11 boundary claims false, 37 items mis-statused, 95% of 474 rows naming
finished work, 3 of 5 lands refused, 62 of 90 worktrees prunable. Those are *censuses*: count the
current state, act, then replace the census with a gate. Censuses are cheap, immediately
actionable, and self-eliminating. **The gap is not "no measurement." It is that nothing is
recorded across runs**, so no question about change over time can be asked at all.

## The argument for

### 1. The runner already types numbers it could compute — and they are already decaying

`rift-forge`'s `verify.mjs` carries a registry of **82 gates**, each with a hand-typed `ms`
duration under the comment:

> `ms     measured on 2026-08-06, for keeping the fast tier honest.`

`CONCURRENCY` per tier carries the same shape: *"is per tier and is a measurement, not a
preference."* And [backlog README §10.1](../research/repos/rift-forge.md) states the budget those
numbers exist to protect:

> `pnpm verify --fast` | Every dependency-free gate, ~30s. Run it constantly.

Summing the registry on 2026-08-14: **73 fast-tier gates, 38.4s serial by the typed values.** The
tier runs concurrently, so the ~30s claim is plausible — and **it is not verifiable from the
repo**. One prose figure, in an authority doc, resting on 82 hand-typed components from a single
date, with no recomputation.

This is [`computed-claims`](../research/pattern-catalog.md) exactly, one level up. It is the same
failure `check:boundary-claims` was built for after **7 of 11 population claims went false because
every change that moved a number left the sentence alone** — and it is happening in the runner
that enforces the other gates. **The runner executes all 82 gates on every run and discards every
duration it produces.**

That is the strongest case here, and note what it is *not*: it is not "measure whether the
workflow works." It is "stop typing numbers the machine already has."

### 2. Instrumentation substitutes for provenance, and only a CLI needs it

`rift-forge`'s operator does not need a ledger to decide whether to keep `check:boundary-claims` —
they remember the incident. **ai-cli ships gates into repos where nobody remembers, because there
was no incident.** The provenance lives in this repo's research, not in the user's head.

So a generated system has an obligation a hand-built one does not: it must be able to tell its
owner why a gate is there and whether that reason still applies. A gate the user cannot evaluate
is a gate they eventually disable — and *"a bypassed gate reports nothing"* is `rift-forge`'s own
conclusion about attribution.

### 3. A self-test proves a gate *can* fire, not that it *does*

`gate-self-test` exists because *"a gate whose rules are all currently satisfied is
indistinguishable from a gate that matches nothing."* It closes the correctness question and
leaves the usage one open: a gate that passes its self-test and has never fired on real content in
six months is protecting against something that stopped happening, never happened, or is scoped
too narrowly to catch the real cases. All three matter; none is visible without a record.

### 4. The `ageing-signal` requirement needs data to exist

[Failure mode F8](../research/synthesis.md) — *the mitigation extends the outage* — was recorded
because attribution made `rift-forge`'s red CI painless and it stayed red, 11 of 15 runs. The
pattern catalog already requires that any known-broken-is-non-blocking affordance ship an ageing
signal. **An ageing signal is by definition a record across runs.** Rejecting instrumentation
outright would mean shipping a pattern the CLI cannot implement.

## The argument against

### 1. It taxes the cheapest tier

Structural gates are near-free and should stay that way; if each must carry logging plumbing,
fewer get installed and the tool is net negative.

**Answered by design:** instrumentation belongs to the **runner**, not the gates. `rift-forge`
already proves the runner exists and already knows every gate's identity, tier, and dependencies.
Individual gates stay dumb — they exit 0 or 1. The runner records. Zero per-gate cost.

### 2. Hit counts are measurement theater — and this repo's own rules forbid them

This is the serious objection. A hit counter says a gate fired. It does not say the finding was
real, the fix was right, or anything was prevented. A gate firing constantly may be excellent or
badly scoped and producing noise people route around; the counter cannot tell them apart.

`rift-forge` states the rule this violates, twice over: *"a probe encoding a guess is a gate that
is confidently wrong, which is worse than the typed number"*, and **probe only what the data
settles without judgement.** "Is this gate worth its runtime" is not settled by a count.

**Not answered — accepted.** This is what narrows the decision from "instrument" to "record what
is directly observed, and refuse to score it."

### 3. The interesting comparison needs aggregation, which is a non-goal

A single repo's series has almost no statistical power; the generalizable question — do these
gates work, across repos — requires sending data somewhere, which
[the brief §8](../design/product-brief.md) rules out.

**Partly answered:** the *local* question is n=1 by nature and legitimate. *"You installed 12
gates; 4 have never fired; 2 fire on every run"* is actionable for that owner regardless of
statistics. The general question stays unanswerable, and this ADR does not claim otherwise.

### 4. Any instrumentation in a dev tool invites "where does this go"

Real friction, manageable: local file, gitignored, no network, stated as a non-goal, and the
ledger is plain text the owner can read and delete.

## Decision

**Yes — scoped to what the runner directly observes, and explicitly refusing everything that needs
judgement.** Three tiers: record, ask, refuse.

### Tier A — Record (judgement-free)

The generated runner appends one line per gate per run to a gitignored ledger
(`.ai/.gate-ledger.jsonl`): gate id, timestamp, exit status, wall-clock ms, and tier.

That is the whole schema. Every field is something the runner observes directly; none requires
interpretation.

**The first consumer is the typed-number problem.** `ai-cli doctor` compares observed durations
against the registry's declared budget and reports drift — and `ai-cli render` can write the
observed value back, making the durations computed rather than typed. This is
[`computed-claims`](../research/pattern-catalog.md) applied to the runner's own registry, which is
the one place in the corpus it was never applied.

### Tier B — Ask (two unambiguous signals, surfaced as questions)

`doctor` surfaces exactly two things, and only because both are binary facts rather than
judgements:

| Signal | Question, with provenance attached |
| --- | --- |
| **Never fired** on real content since install | *"`check-findings-register` has run 340 times and never fired. It exists because `hexguard` produced 268 audit reports with no register to close them into. Is that still a risk here — or is this gate scoped too narrowly to catch it?"* |
| **Fires on essentially every run** | *"`check-ids` has failed 47 of the last 50 runs. A gate that is red by default is one people learn to bypass. Fix, rescope, or remove."* |

Both are stated as questions with the extracted incident attached. **Neither is a verdict**, and
`doctor` never computes a score, grade, or percentage of "workflow health."

### Tier C — Refuse

Explicitly out of scope, permanently, not "not yet":

- **Rework rate, session outcomes, instruction attribution.** The first two need judgement about
  what counts; the third is a counterfactual. Shipping a number for any of them would be the
  confidently-wrong probe the corpus warns about.
- **Any network transmission or cross-repo aggregation.** Including opt-in. It is a different
  product with a different trust posture, and offering it would make every other guarantee here
  conditional.
- **Any composite health score.** A single number over incommensurable signals is the purest form
  of a probe encoding a guess.

### Pins — what the ledger does not cover

Following `computed-claims`' second rule — **pin what the gate does not cover, so green never
reads as "verified"** — `doctor` prints these alongside any ledger output, every time:

- It does not measure whether a gate is **valuable**, only whether it ran and whether it fired.
- Gates invoked **directly** (`pnpm check:ids` rather than through the runner) are not counted, so
  a low run-count may mean low usage of the runner, not low usage of the gate.
- **CI runs are not counted.** The ledger is local and machine-local.
- It says nothing about **rules that are not gates** — the `review-only` half of
  `enforcement-declaration` remains unmeasured by construction.

## Consequences

**For the module contracts (this is why it was decided first):**

- The `gates` module owns a **runner with a declarative gate registry** — id, tier, command,
  declared duration, self-test — not merely a folder of scripts and a list of npm entries.
- **Every gate-shipping module registers its gates with that runner** instead of appending to
  `package.json`. That is a real change to the Phase 4 module contract and the reason this ADR
  blocked Phase 4.
- Gates themselves gain nothing and must stay dumb: exit 0 or 1, no logging, no ledger awareness.
  A gate that writes to the ledger itself is a bug.

**Good**

- Kills a whole class of stale typed numbers before the CLI can ship any.
- Makes `ageing-signal` implementable rather than aspirational.
- Gives a generated system the self-explanation a hand-built one gets from memory.
- The ledger is one append per gate per run — cheap, inspectable, deletable.

**Costs and risks**

- **A runner is a bigger artifact than a folder of scripts**, and it is now on the critical path
  for the `gates` module. Accepted: `rift-forge` needed one anyway at 82 gates, and tier-1 gate
  sets can ship with a trivial runner.
- **Bypass undercounts.** Mitigated by pinning it, not by preventing it.
- **Tier B's questions could still nag.** They must be pull (`doctor`), never push; no output
  during normal runs.

## Alternatives considered

**Reject instrumentation entirely** — defensible on objection 2 alone, and it was the leading
option until the 82 typed `ms` values turned up. Rejected because refusing to record wall-clock
means the CLI ships the exact defect it exists to prevent, in its own runner.

**Instrument inside each gate** — rejected: taxes the cheapest tier, duplicates plumbing 82 times,
and lets a gate lie about itself.

**Full session-outcome tracking** (the original synthesis §6 reading) — rejected as Tier C. Not a
cost objection: the outputs would require judgement the data cannot supply, which is the
confidently-wrong-probe failure.

**Opt-in anonymous aggregation** — rejected. The local question does not need it, the general
question is a different product, and an opt-in network path makes every privacy statement
conditional.

**A "workflow health score"** — rejected. It is the composite-of-incommensurables version of the
same error, and it would be the first thing anyone screenshots.

## Revisit triggers

1. **A repo's ledger is asked a question Tier A's schema cannot answer**, twice, by different
   people → extend the schema, deliberately, one field at a time.
2. **`doctor`'s Tier B questions are measured as ignored** — if owners never act on never-fired
   gates, the signal is not worth its plumbing and Tier B should be cut while Tier A stays.
3. **A cross-vendor session-lifecycle standard emerges** that makes rework observable without
   judgement → reopen Tier C's first bullet only.

## Admission check

Against [the rule](README.md): (1) constrains every gate-shipping module ✅ · (2) "reject entirely"
was a real alternative, rejected for a stated reason ✅ · (3) retrofitting a runner and a registry
after modules ship is far costlier than designing for it ✅ · (4) not owned by an existing doc ✅ ·
(5) not an implementation detail — it changes the module contract ✅.
