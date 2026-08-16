---
id: ADR-0007
title: "Detector applicability is declared per gate, and has no default"
status: accepted
date: 2026-08-16
---

# ADR-0007 — Detector applicability is declared per gate, and has no default

- **Status:** accepted
- **Date:** 2026-08-16
- **Phase:** post-6, from [WI-052](../backlog/items/WI-052-detector-applicability.md)
- Extends [ADR-0003](ADR-0003-module-definition-format.md) (module format) and
  [ADR-0004](ADR-0004-adoption-detection.md) (detection bias).

---

## Context

`doctor --explain` runs rungs' own gate engines over repositories that never installed rungs. Its
whole risk is confident noise: a finding that is true about *our* conventions and meaningless about
*their* repo.

[WI-038](../backlog/archive/WI-038-doctor-explain-detectors.md) shipped that restriction as two
hard-coded sets of **engine names** inside `src/explain.ts` — which modules may run at all, and
which engines are safe against a foreign repo. Both sets were derived from measurement and both were
correct. The problem was where they lived.

**Applicability is a property of a detector, and it was stored as a list of engine names in a file
the detector's author never opens.** Consequences, all silent:

- A new gate on `file-population` inherits foreign-safety nobody chose for it.
- A new gate on a new engine silently cannot run on foreign repos at all, which is the case
  `doctor --explain` exists for.
- Nothing at either declaration says which happened.

That is the same shape as every failure in this project's own research: a rule that is true,
enforced somewhere else, and invisible at the point of use.

The second external review named it independently, and called it the strongest available technical
change: *"can this detector legitimately interpret this repository?"* must be asked before *"did the
condition fire?"*

## Decision

**Every declared gate states its `applicability`, in its own manifest entry, next to `engine`.
There is no default.**

| Value | Means | Runs on a repo that is not ours |
| --- | --- | --- |
| `repo-content` | Measures the repo's own content — a count, a length, whether a link resolves | **Yes** |
| `our-artifacts` | Checks something rungs wrote; it cannot exist unless we installed | No |
| `our-schema` | Reads their file, against a shape we defined | No |

**An undeclared gate does not run against a foreign repo, is named in the output, and fails
`rungs modules`.** Silence must not resolve to "safe".

The three cases are what measurement produced, not a taxonomy invented up front. `our-artifacts`
exists because `adr-index-current` reported a missing `adr-index` block against `hexguard`'s
perfectly healthy decision index — a finding guaranteed by the repo's *state*. `our-schema` exists
because `specs-status-evidence` produced 70 findings on `hexguard-templates`, whose spec register is
fine and simply has its own columns. A boolean would have merged those two and hidden why each was
excluded.

## Alternatives considered

**A boolean `foreign_ok`.** Smallest thing that works, and rejected: it collapses `our-artifacts`
and `our-schema` into one "no", which is exactly the distinction that explains a false positive to
whoever is reading it. The cost of the enum is one word per gate.

**Keep the central lists, and document them.** Rejected. Documentation of a rule enforced elsewhere
is what this project's research calls the failure mode; a module author cannot be expected to read
`explain.ts`.

**Infer applicability from the engine at runtime.** Rejected — it is what exists today, and it is
wrong in principle rather than in detail: two gates on the same engine can differ, and the engine
cannot know.

**Add a confidence score alongside**, as the review's sketch proposed. Rejected on
[ADR-0005](ADR-0005-self-instrumentation.md) Tier C: a number attached to a finding is a judgement,
and "probe only what the data settles without judgement" applies. Applicability is observable;
confidence is not.

## Consequences

**Good**

- A gate's foreign-repo behaviour is visible where the gate is written.
- Adding an engine no longer silently changes any gate's reach.
- `rungs modules` refuses a manifest that has not decided.
- Third-party modules, once a registry exists, inherit the obligation from the start — which is the
  main argument for deciding this now rather than after.

**Costs**

- **A required field on every declared gate**, and all 41 shipped gates changed. Mechanical, and it
  is why this is an ADR rather than a refactor.
- Third-party module authors must understand a distinction they did not invent. Mitigated by the
  table in [`modules/README.md`](../../modules/README.md) §5b and by the audit naming the values.
- The enum will be wrong eventually. A fourth case is a change to this ADR, not a quiet addition —
  and a case with no member gets deleted.

**Neutral, worth stating:** applicability is read from the **CLI's** module set, not from a consumer
repo's registry, so it needs no propagation and no version bump. A repo gets the current answer from
whatever CLI version it runs.

## Revisit triggers

1. **A gate genuinely needs a different applicability from another gate on the same engine.** That
   would confirm the per-gate decision; the classification is currently by engine because that is
   what makes the move from the old lists provably behaviour-preserving.
2. **A fourth case appears twice**, from different modules, with evidence.
3. **The census ([WI-053](../backlog/items/WI-053-false-positive-census.md)) shows `repo-content` is
   itself too broad** on repos nobody here built — in which case the values, not the mechanism, are
   what change.

## Admission check

Against [the rule](README.md): (1) constrains every future gate ✅ · (2) a boolean and keeping the
central lists were both real alternatives, rejected for stated reasons ✅ · (3) retrofitting a
required field after third-party modules exist is far costlier ✅ · (4) not owned by a module doc —
it changes the module *format* ✅ · (5) not an implementation detail; the code cannot state why the
three cases exist ✅.
