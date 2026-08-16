---
id: WI-045
title: Execute gate self-test fixtures instead of only declaring them
type: feature
status: proposed
branch:
created: 2026-08-16
updated: 2026-08-16
related: [WI-044, F-006, F-005]
epic:
children: []
---

## Proposal (rationale)

Promoted from [F-006](../FINDINGS.md), 2026-08-16.

Every gate declares `[[self_test]]` fixtures with an `expect = "pass"` / `"fail"` pair, and
**nothing runs them**. `gateMeta` string-matches the table to confirm both blocks exist;
[`src/engines.ts`](../../../src/engines.ts) is the only code that reads `self_test`, and grepping
`src/` for the term returns that one site.

So the fixtures are documentation that looks like a test. `gates-links-resolve`'s fixture
`See [the plan](./does-not-exist.md).` has never been executed — and had it been, it would have
caught [F-005](../FINDINGS.md) in 2026-08, months before the file-level token exemption was found by
hand.

The gap compounds: `gate-self-test` exists in the pattern catalogue precisely because *"a gate whose
rules are all currently satisfied is indistinguishable from a gate that matches nothing"*. A
self-test that is declared and not run has the same shape as the problem it was invented to solve,
one level up.

**Why it is an item and not a fix.** Of the fixtures in the repo, 27 are runnable text (`input = "…"`)
and the rest are structured objects with roughly eight bespoke shapes —
`{workflows, similarity, exempt}`, `{worktrees: [{branch}]}`, `{values: […]}`,
`{matching_files, location}` — each needing its own synthesizer to become a real repo state. A runner
covering only the text half would leave most fixtures declared-but-unrun while reporting a passing
self-test suite, which is F-006 again with better marketing.

## Decision

Undecided. The open question is whether the structured fixtures are worth synthesizers at all, or
whether they should be rewritten as text fixtures so one runner covers everything. The second is
more work up front and leaves one mechanism instead of nine.

## Plan

> Filled on acceptance.

### Requirements

- Every declared fixture is **executed**, or is reported by name as unrun. No fixture is silently
  skipped, on the same rule the runner already applies to a missing engine.
- A fixture whose result disagrees with its `expect` fails the gate that declares it.
- The runner works on a consumer repo, not only here.
- Adding a fixture requires no code change for the shapes already supported.

### Impacts

- [`src/engines.ts`](../../../src/engines.ts) (`gateMeta`), and a new fixture-execution path.
- Possibly every `gates/*.toml` in [`modules/`](../../../modules/README.md), if the structured
  fixtures are rewritten rather than synthesized.
- **Expect this to find real bugs.** Twenty-one gates have never had their fixtures run; the honest
  expectation is that some fail immediately, and that is the item working rather than a setback.

### Approach

To be written on acceptance. The shape: write each `input` to a temp tree, run the named engine over
it, assert the finding count against `expect`. Decide the structured fixtures first, because that
choice determines whether the runner needs one path or nine.

### Acceptance criteria / tests

1. Every `[[self_test]]` in `modules/` is executed or named as unrun; the count of each is printed.
2. A deliberately broken fixture fails its gate.
3. Any gate whose fixtures now fail is either fixed or has its failure recorded as a finding.
4. `rungs check` and `npm test` pass.

### Out of scope

- **Fixing whatever the runner finds.** Those are separate items or findings; this builds the runner.
- **New fixtures for gates that lack them.** `gates-self-tests-both-directions` already refuses that.

## Execution

Not started.

## Review

Not started.
