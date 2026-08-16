---
id: WI-056
title: Triage the self-test mismatches, and fix what they exposed
type: feature
status: done
branch: feature/WI-056-triage-selftest-mismatches
created: 2026-08-16
updated: 2026-08-16
related: [WI-045, F-006, F-007, F-018]
epic:
children: []
---

## Proposal (rationale)

From [F-018](../FINDINGS.md). [WI-045](WI-045-run-gate-self-tests.md) built a runner that executes
self-test fixtures and left it unwired, because wiring it produced mismatches that could not be
attributed: stale fixture, or harness bug?

This triages them. The value is not the count going down — it is that **each mismatch is a question
nobody had asked**, because until WI-045 no fixture had ever run.

## Decision

`accepted` — 2026-08-16, directed by the user.

## Plan

### Requirements

- Every mismatch is attributed to a cause: a defect in the gate set, or a defect in the harness.
- A defect in the gate set is fixed, not annotated.
- `rungs check` stays green throughout — no red merged on unexplained failures.

### Impacts

- [`modules/adr/`](../../../modules/adr/module.toml) gains a gate; `frontmatter-schema` and
  `sections` engines change. Gate count 23 → 24.

### Approach

Take them one at a time and follow each to its cause rather than pattern-matching on the message.

### Acceptance criteria / tests

1. Each mismatch investigated is attributed and, where it is a real defect, fixed.
2. `rungs check` green; `npm test` passing.
3. Whatever remains is recorded with what is now known about it.

### Out of scope

- **Wiring the runner into the gate.** That needs zero unexplained mismatches, and this did not
  reach zero. F-018 stays open with the reason.

## Execution

Branch `feature/WI-056-triage-selftest-mismatches`, cut from `main` at `1cb551e`.

**Four real defects, none of which were the harness.** Every one had been invisible because the
fixtures asserting them had never run:

1. **`adr` declared no gate for its own `[sections]` table.** The table was fully specified —
   required sections, `non_empty`, `min_words`, a message citing the admission rule's second
   criterion — and nothing read it. This is F-007's shape for the third time. Added
   `adr-sections-present`.

2. **Two fixtures were labelled for the wrong gate.** They described sections and were attached to
   `adr-required-fields`, which checks *frontmatter* and could never have satisfied them. Relabelled
   to the new gate.

3. **`adr-required-fields` then had no `pass` fixture at all** — both of its fixtures had been the
   mislabelled ones. A gate asserting only that something fails cannot tell "correct" from "matches
   nothing", which is `gate-self-test`'s own argument. Added.

4. **`[frontmatter_schema.reciprocal]` was configured and implemented nowhere.** Its fail fixture is
   a `superseded` record with no `superseded_by` — it could never have failed. Implemented, plus
   `required_when`, which is a different failure from a one-way link and was not expressible before.

**And one the new gate found immediately.** `adr-sections-present` fired on
`ADR-0002`'s `## Decision` as empty. It is not — a `### (a)` follows it directly, and the
`non_empty` check split on *any* heading, so a section made of subsections read as empty. That is the
normal shape for a long decision record. Fixed to split on the same-or-higher level.

**A deadlock in my own tooling, fixed on the way past.** `npm run claims` runs `rungs check` to
record the run, and `execSync` throws on a non-zero exit — so the moment a gate failed, claims could
not be regenerated, and `site-claims-current` fails *because* claims are stale. Regenerating is now
possible exactly when it is needed.

## Review

Verified 2026-08-16.

**1 · Every mismatch attributed.** Of 17 originally: 10 were harness artifacts, fixed in WI-045;
**4 were real defects in the gate set**, fixed here; 7 remain and are characterised in
[F-018](../FINDINGS.md) rather than left as a number. **Met for those investigated.**

**2 · `rungs check` green, tests passing.** **24 pass · 0 fail · 0 unimplemented · 0 error** — up
from 23 with `adr-sections-present`. `npm test` 22 pass. The declaration half of
`gates-self-tests-both-directions` reports 0 findings across 23 gates. **Met.**

**3 · What remains is recorded.** F-018 rewritten with the current seven, the four causes found, and
a changed recommendation — see below. **Met.**

### The recommendation changed, and that is the useful output

F-018 originally said *"triage each by hand"*. Having done that for a round, the advice is now
**stop triaging one at a time**. Every round found something real, so the runner is clearly worth
having — but every round also *moved which fixtures fail*, and a gate whose failures shift under it
cannot block a merge.

The recurring cause is structural: **a fixture describes a fragment, and an engine needs a
scenario.** `gates-links-resolve`'s pass fixture asserts a link that resolves, which is unprovable
without the file it points at. No amount of harness fixes that; the format has to let a fixture say
what it assumes. That is an [ADR-0003](../../decisions/ADR-0003-module-definition-format.md)
change, and it is the next move rather than a seventh round of this one.