---
id: WI-059
title: Wire the self-test runner in, and fix the four defects that blocked it
type: feature
status: done
branch: feature/WI-059-selftest-wiring
created: 2026-08-16
updated: 2026-08-16
related: [WI-045, WI-056, WI-057, F-006, F-018]
epic:
children: []
---

## Proposal (rationale)

Closes [F-018](../FINDINGS.md), and with it [F-006](../FINDINGS.md)'s substance: gate self-tests
were declared and never executed, so every fixture in the repo was documentation shaped like a test.

Three previous rounds ([WI-045](WI-045-run-gate-self-tests.md),
[WI-056](WI-056-triage-selftest-mismatches.md), [WI-057](WI-057-selftest-setup.md)) built the
runner and took the mismatches 17 → 7 → 3, each time finding real defects but never reaching zero,
so the runner stayed unwired and no fixture ran on a normal `rungs check`.

## Decision

`accepted` — 2026-08-16, directed by the user.

## Plan

### Requirements

- Zero mismatches, then wire the runner into `gates-self-tests-both-directions`.
- A fixture that disagrees with its engine fails the gate.
- Fixtures that cannot be reproduced are **reported, never counted as passes**, and do not fail the
  gate — an unbuildable fixture is not a defect in the gates.

### Approach

F-018 said the direct call was the oracle and the wiring had to be made to agree with it. Follow
that, and check the oracle itself before trusting it.

### Acceptance criteria / tests

1. Zero mismatches across all executable fixtures.
2. The wired gate fails on a fixture that disagrees with its engine.
3. Unrun fixtures are reported and do not fail the gate.
4. `rungs check` and `npm test` pass.

### Out of scope

- **Making the remaining 45 fixtures runnable.** Their shapes need context the format does not
  carry. Recorded, not attempted.

## Execution

Branch `feature/WI-059-selftest-wiring`, cut from `main` at `0425173`.

### My own diagnosis was wrong, and checking it was the first step

F-018 recorded that "the runner is sound; the wiring is not", on the evidence that
`session-sections-present` returned `ok, ok` called directly and `mismatch` through `gateMeta`.

**The oracle was wrong.** I had called the runner with `engine = 'sections'` — inferred from the
gate's *name*. The registry says `frontmatter-schema`. So the two paths were not running the same
thing, and the wiring had never been at fault.

Instrumenting `gateMeta` step by step is what showed it, in one line of output: `engine:
"frontmatter-schema"`.

### Four defects, all of the same family

| | |
| --- | --- |
| **`session-sections-present` declared an engine whose table it does not have.** `session.toml` holds `[sections]` and `[filename_schema]`; the gate asked for `frontmatter_schema`, got `undefined`, scanned nothing and **passed by examining nothing** on every run since it shipped. The handoff's seven required sections had never been checked | fixed: `engine = "sections"` |
| **`[register_schema.open]` was read by nothing.** `registerSchema` only ever used the top-level spec, so the Open table's `non_empty = ["Sev", "Pri", "What", "Evidence"]` and its Sev/Pri enums had never been enforced | fixed: sub-specs are iterated |
| **The table matcher was a substring test.** Once the Open spec ran, every *Closed* row failed it — because `## Closed — 2026-08-16 by [WI-044](archive/WI-044-resolve-open-findings.md)` contains "open", inside a filename | fixed: the heading must *start with* the table name |
| **The runner did not bridge `opted_in` → `extensions_opted_in`**, so the fixture for an opted-in extension asserted the opposite of what it said | fixed |

The first is the one worth pausing on. `pass session-sections-present 0ms` — **no examined count** —
had been printed on every run of this repo for as long as the gate existed. The tell was in the
output the whole time.

## Review

Verified 2026-08-16.

**1 · Zero mismatches.** Across the registry: **ok 17 · mismatch 0 · unrun 45**. **Met.**

**2 · The wired gate fails on a disagreeing fixture.** Flipped one `session-sections-present` fixture
from `fail` to `pass` and ran `rungs check`:

```
FAIL gates-self-tests-both-directions   23 examined
   gate 'session-sections-present' has no self-test expecting 'fail'
   self-test for 'session-sections-present' expected pass, fired: missing section 'Up next'
```

Both halves — the declaration check and the execution check — caught it. Restored, passes. **Met.**

**3 · Unrun fixtures reported, not failing.** 45 are named in a line on every run and the gate
passes. Making them a finding was tried first and reverted: it would leave `rungs check` permanently
red for fixtures whose shapes the format cannot express, which is how a gate gets disabled. **Met.**

**4 · Gates and tests.** `rungs check` **24 pass · 0 fail · 0 unimplemented · 0 error**;
`npm test` 24 pass. `session-sections-present` now reports **1 examined**, and firing it was verified
by renaming a heading in `.ai/session.md`: `missing section 'Up next'`. `findings-disposition-has-reason`
went from 0 examined to **19**. **Met.**

### What this leaves

45 fixtures still have no builder — `worktrees`, `workflows`+`similarity`, `values`, `changed`, and
a dozen other shapes that describe git state or multi-file scenarios. They are counted and named on
every run rather than quietly skipped, which is the honest position: **17 of 62 executable fixtures
now assert something, and the other 45 are visibly not asserting anything.**

That is the number to improve next, and it is a format question rather than a harness one — but this
time with a working runner to measure against, rather than a guess about what the format needs.