---
id: WI-052
title: Make detector applicability a declared property rather than two lists
type: feature
status: planned
branch:
created: 2026-08-16
updated: 2026-08-16
related: [WI-048, WI-038, WI-042, ADR-0003, ADR-0004]
epic: WI-048
children: []
---

## Proposal (rationale)

Acts on **claim 14** of the [second external review](../../design/external-review-2026-08-16b.md) —
its strongest technical recommendation, and the strongest across both reviews:

> The Rift Forge incident demonstrates that detecting a condition correctly isn't enough. You need
> *can this detector legitimately interpret this repository?* before *did the condition fire?*
> That distinction should become first-class.

**The distinction exists and is not first-class.** It lives as two hard-coded sets of engine names
in [`src/explain.ts`](../../../src/explain.ts):

- `IN_SCOPE` — which detect states allow any detector to run;
- `CONVENTION_FREE` — the three engines allowed against a repo that is not ours.

Both were written from measurement, and both are correct today. The problem is where they are.
Applicability is a property of **a detector**, declared centrally as a list of **engine** names in a
file the detector's author never opens. A new gate inherits an applicability nobody chose for it:
add a gate on a new engine and it silently cannot run on foreign repos, or add one on
`file-population` and it silently can. Neither is stated anywhere near the gate.

That is the same shape as every failure in this repo's own research — a rule that is true, enforced
somewhere else, and invisible at the point of use.

## Decision

`accepted` — 2026-08-16, as a child of [WI-048](WI-048-act-on-second-external-review.md).

## Plan

### Requirements

- Each gate declares whether it can interpret a repo that did not adopt rungs' conventions, in its
  own manifest or table, next to its `why`.
- The declaration is **required**, not defaulted — an undeclared gate does not run on foreign repos
  and is reported as undeclared. Silence must not resolve to "safe": that is the
  `enforcement-declaration` argument (`gated` | `review-only`, no silent third category) applied to
  applicability.
- `explain` reads the declaration instead of matching engine names.
- The behaviour on all available repos is **unchanged** by the refactor. This is a move, not a
  retune; retuning is WI-053's evidence to justify.
- The manifest audit (`rungs modules`) reports a gate missing the field.

### Impacts

- [`src/explain.ts`](../../../src/explain.ts), [`src/types.ts`](../../../src/types.ts) (`GateSpec`),
  [`src/manifest.ts`](../../../src/manifest.ts) (audit), and every `modules/*/module.toml` that
  declares a gate.
- **A module-format change**, which is [ADR-0003](../../decisions/ADR-0003-module-definition-format.md)
  territory. Whether it needs an ADR is decided against the diff — see Approach.
- Third-party modules, once a registry exists, would have to declare it. That is an argument for
  doing it now rather than after.

### Approach

**Move first, change nothing.** Land the declaration with values that reproduce today's behaviour
exactly, proven by diffing `--explain` output across every available repo before and after. Only
then is any individual gate's applicability worth arguing about.

**The vocabulary is the decision.** A boolean (`foreign_ok`) is the smallest thing that works and
probably too small — the real answer has at least three cases: *reads only the repo's own content*,
*reads rungs-managed artifacts*, and *reads content whose meaning depends on our conventions even
though the file is theirs*. `register-schema` on `hexguard-templates` was the third, and a boolean
would have hidden why. Prefer a small enum with the reason in the name.

**ADR or not:** if the field is additive and optional-with-a-reported-default, it is a manifest
change and this item's Execution records it. If it becomes required — which the requirements above
say it should — every existing module changes and third-party modules inherit a new obligation, and
that is an ADR. Decide when the diff exists, not now.

### Acceptance criteria / tests

1. Every gate in `modules/` declares applicability; the audit fails one that does not.
2. `--explain` output is byte-identical before and after, on at least `hexguard`,
   `hexguard-templates`, `axiom-mesh` and `rift-forge`.
3. A gate on a new engine, with no declaration, does not run on a foreign repo and is reported.
4. `explain.ts` contains no list of engine names.
5. The enum's cases each have a real gate that needs them — a case with no member is deleted.
6. `rungs check`, `npm test`, and the site build pass.

### Out of scope

- **Retuning any gate's applicability.** Behaviour-preserving move only; changes need WI-053's
  evidence.
- **Confidence scores or per-detector thresholds.** The review's sketch lists a "confidence
  boundary"; a number attached to a finding is a judgement, which
  [ADR-0005](../../decisions/ADR-0005-self-instrumentation.md) Tier C refuses. Applicability is
  binary-ish and observable; confidence is not. Rejected, not deferred.
- **Remediation metadata.** The sketch also lists it. Modules already ship remediation as the thing
  they install; a second representation would be a second thing to go stale.
- **New detectors.** WI-053 may show a gap; filling it is a later item.

## Execution

Not started.

## Review

Not started.
