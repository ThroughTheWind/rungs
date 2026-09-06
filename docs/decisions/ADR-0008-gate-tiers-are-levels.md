---
id: ADR-0008
title: "A gate tier is an ordered level, and an unknown tier is refused"
status: accepted
date: 2026-08-17
---

# ADR-0008 — A gate tier is an ordered level, and an unknown tier is refused

- **Status:** accepted
- **Date:** 2026-08-17
- **Phase:** post-6, from [WI-060](../backlog/archive/WI-060-release-0.2.0.md), closing
  [F-020](../backlog/FINDINGS.md)
- Constrains [ADR-0005](ADR-0005-self-instrumentation.md) (what the runner may record).

---

## Context

`[runner] tiers = ["fast", "full"]` looks like a ladder and was implemented as a set of tags. The
runner's filter was one line:

```ts
if (tier && g.tier && g.tier !== tier) continue;
```

Exact string equality. So `full` selected only gates *labelled* `full`, and on a registry where
every gate is `fast` — which is this repository, 25 of 25 on 2026-08-17 — it selected **nothing**.
The zero case then printed `no gates registered — is this a rungs repo?`, blaming the repo for the
filter's choice.

That would be an ordinary bug if anything else had caught it. Nothing did, for two reasons that
matter more than the line itself:

1. **The shipped `cut-release` skill told every consumer to gate a release with
   `rungs check --tier full`** — a command that selects zero gates *and* names a flag the CLI does
   not accept. The one procedure that says "do not proceed on a red gate" could not go red.
2. **Nothing rejected a tier that named nothing.** `rungs check banana` was a silent no-op. A
   filter that matches no gate is indistinguishable, at the exit code, from a filter that matched
   every gate and they all passed.

The second is the real defect. A tier that selects nothing is not a small run; it is *no* run
wearing a passing exit code, and it appears at exactly the moment — cutting a release — when
somebody is relying on the check most and inspecting it least.

## Decision

**A tier is an ordered level. `[runner] tiers` declares the order, and running a tier runs every
gate at that level or below it.**

With `tiers = ["fast", "full"]`:

| Invocation | Runs |
| --- | --- |
| `rungs check` | every registered gate |
| `rungs check fast` | gates tiered `fast`, plus every untiered gate |
| `rungs check full` | gates tiered `fast` **and** `full`, plus every untiered gate |

An untiered gate runs in every tier. A gate whose tier is not in `[runner] tiers` is a registry
error, not a gate that quietly never runs.

**A tier the registry does not declare is refused**, naming what is declared, with a non-zero exit.
`rungs check banana` is now an error rather than an empty pass.

**A run that selects no gate is never a pass.** Where a filter is responsible, the output says which
filter and how many gates it declined to run.

## Alternatives considered

**Keep tags, and fix only the message and the skill.** This is what was shipped first, deliberately,
because it stopped the wrong diagnosis immediately and carried no semantic risk. Rejected as the
end state: it leaves `rungs check full` running zero gates on this repo, honestly. Honest and
useless is still useless, and the next person to add a `full` gate would silently change what
`--fast` covers relative to it.

**Make `full` a reserved word meaning "everything".** Smaller, and rejected: it privileges two
names the module format does not own. A repo that declares `tiers = ["quick", "nightly", "full"]`
gets nothing from a special case built around `full`, and a repo with `tiers = ["full", "fast"]`
would get a reserved word that contradicts its own declared order.

**Infer the order from cost — run whatever fits `fast_budget_ms`.** Rejected on
[ADR-0005](ADR-0005-self-instrumentation.md): that makes the *set of gates that ran* a function of
how loaded the machine was, so two runs of the same command on the same commit could disagree, and
the ledger could not say why. The budget stays what it is — a declared expectation the ledger can
report a breach of, not an input to selection.

**Warn on an unknown tier and run everything.** Rejected. A typo would then run *more* than asked
for, which is safe for gating and wrong for the person who typed it; and it makes the exit code
stop distinguishing "I ran what you asked" from "I ran something else".

## Consequences

**Good**

- `rungs check full` is a superset of `rungs check fast`, which is what the word already implied to
  everyone reading it.
- A release cannot be gated by a filter that matches nothing without a non-zero exit saying so.
- A mistyped tier is an error at the point of use.

**Costs, accepted**

- **This changes behaviour for any consumer that already declares tiers.** A repo that used `full`
  as a disjoint label — "the slow gates only" — now gets its fast gates as well. That is a real
  break, and it is the reason this is an ADR rather than a patch. It is judged acceptable because
  the tag reading produced no working configuration: the only registry in existence that exercised
  it, this one, ran zero gates.
- Tier order now has to be declared correctly. `tiers = ["full", "fast"]` is a valid declaration
  that means something surprising, and nothing detects that the *names* disagree with the order.
  Recorded here rather than solved; naming is not orderable by machine.

**Neutral**

- Untiered gates run in every tier. They are rare and the alternative — a default tier — is the
  no-default rule this project already argued out in [ADR-0007](ADR-0007-detector-applicability.md),
  applied where it does not fit: an untiered gate has not failed to decide anything, because
  "always" is the answer most gates want.

## Revisit triggers

1. **A repo declares tiers whose names do not match their order** — `["full", "fast"]`, or a set
   where the ladder reading is simply wrong. The cost accepted above becomes a real defect, and the
   answer is probably to refuse the declaration rather than to reinterpret it.
2. **Someone wants a tier that is genuinely disjoint** — a `flaky` or `manual` set that must *not*
   be pulled in by a higher level. That is a second concept wearing the tier field, and it should
   get its own one rather than a reserved name.
3. **More than three tiers appear in practice.** The ordering holds, but `check` grows a selection
   problem this decision does not address, and the ergonomics are worth revisiting before a fourth
   level is normal.

## Admission check

Against [the rule](README.md): (1) constrains every gate registry and every consumer that declares
tiers ✅ · (2) tags-with-a-better-message, a reserved `full`, budget-inferred selection, and
warn-and-run-everything were all real alternatives, rejected for stated reasons ✅ · (3) changing
tier semantics after third-party registries exist is far costlier than now, when one registry
exercises it ✅ · (4) not owned by a module doc — `tiers` is runner behaviour, not the `gates`
module's content ✅ · (5) not an implementation detail; the code cannot state why a tier is a level
rather than a tag, and the one-line filter it replaces read as a deliberate choice ✅.
