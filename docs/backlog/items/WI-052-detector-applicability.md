---
id: WI-052
title: Make detector applicability a declared property rather than two lists
type: feature
status: done
branch: feature/WI-052-detector-applicability
created: 2026-08-16
updated: 2026-08-16
related: [WI-048, WI-038, WI-042, ADR-0003, ADR-0004, ADR-0007]
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

Branch `feature/WI-052-detector-applicability`, cut from `main` at `9a4c1e7`.

`applicability` is now a required field on every declared gate, sitting next to `engine`.
[`ADR-0007`](../../decisions/ADR-0007-detector-applicability.md) records the decision — the plan said
to decide against the diff, and the diff decided it: the field is required, all 41 shipped gates
changed, and third-party modules would inherit the obligation, which is the plan's own criterion for
an ADR rather than a manifest note.

### The vocabulary, and why not a boolean

Three cases, each with a gate that needs it — the plan's requirement that a case with no member be
deleted:

| Value | Gates | Why it is not just "no" |
| --- | ---: | --- |
| `repo-content` | 8 | Measures their content. A broken link is a broken link in anybody's methodology |
| `our-artifacts` | 7 | Checks something we wrote. `adr-index-current` reported a missing `adr-index` block against hexguard's healthy decision index — guaranteed by the repo's *state* |
| `our-schema` | 26 | Reads their file against our shape. `specs-status-evidence` produced 70 findings on a spec register that is fine and has its own columns |

A boolean would merge the last two, which is exactly the distinction that explains a false positive
to whoever reads it.

**Classification is by engine, deliberately.** That is what the outgoing hard-coded sets keyed on, so
the move is provably behaviour-preserving. Where a gate genuinely wants to differ from its engine's
default, that is a retune needing evidence — [WI-053](WI-053-false-positive-census.md)'s — and
ADR-0007's first revisit trigger.

### Deviations from the plan

None of substance. One addition the plan did not name: [`modules/README.md`](../../../modules/README.md)
gains authoring rule **5b** with the table and the reason, because a required field a module author
meets only through an audit failure is a field they will resent.

## Review

Verified 2026-08-16.

**1 · Every gate declares applicability; the audit fails one that does not.** 41 gates across 15
modules. Deleting one declaration produced:

```
1 issue(s):
  audit gate-no-applicability — gate 'audit-output-is-rows' does not declare applicability
  (repo-content | our-artifacts | our-schema)
```

Restored, `audit clean`. A test also states the invariant directly, so it fails in `npm test` rather
than only in a command someone has to run. **Met.**

**2 · `--explain` output is byte-identical before and after.** Captured on all four source repos,
`git stash`ed the change, re-captured, and diffed:

```
hexguard IDENTICAL · hexguard-templates IDENTICAL · axiom-mesh IDENTICAL · rift-forge IDENTICAL
```

Including `rift-forge`'s 2,057 findings. This is the criterion the whole item turns on — it is a
move, not a retune — and it is the one that would have been easiest to assert without checking.
**Met.**

**3 · An undeclared gate does not run on a foreign repo and is reported.** Unit test both ways: on
`theirs` the engine is never called and the id appears in `skipped.undeclared`; on `ours-current` it
runs, because applicability constrains foreign repos only. `--explain` prints the skip with the ids.
**Met.**

**4 · `explain.ts` contains no list of engine names.** `CONVENTION_FREE` is gone; what remains is
`FOREIGN_SAFE = { 'repo-content' }`, a list of *applicability values*, which is the vocabulary
rather than the membership. **Met.**

**5 · Each enum case has a real member.** 8 / 7 / 26 above. **Met.**

**6 · Gates, tests, site.** `rungs check` → **23 pass · 0 fail · 0 unimplemented · 0 error**.
`npm test` → **20 pass**, up from 18. Site builds, 1,877 links, 0 broken; `check:claims` matches.
**Met.**

### One thing that turned out simpler than expected

Applicability is read from the **CLI's** module set, not from a consumer repo's `.ai/gates.toml`, so
it needs no propagation, no version bump, and none of [F-016](../FINDINGS.md)'s upgrade machinery. A
repo gets whatever the CLI it runs believes. Worth stating because the sequencing argument for
fixing F-016 first assumed otherwise — F-016 was worth fixing on its own merits, and this did not
depend on it.
