---
id: WI-045
title: Execute gate self-test fixtures instead of only declaring them
type: feature
status: done
branch: feature/WI-045-run-gate-self-tests
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

## Decision

`accepted` — 2026-08-16, directed by the user.

The open question — synthesize the structured fixtures or rewrite them as text — was answered by
counting them: **114 self-tests, 29 with `input`, 85 structured across 23 distinct shapes**, not the
~8 this item estimated. Neither option is small, and the runner had to exist before either could be
judged. So: build the runner, run what can be run faithfully, and let the measurement decide the
rest.

## Execution

Branch `feature/WI-045-run-gate-self-tests`, cut from `main` at `9f1c3d4`.
[`src/selftest.ts`](../../../src/selftest.ts) executes a fixture against its engine in a temp repo
and returns `ok` / `mismatch` / `unrun`.

### It is not wired into the gate, and that is the finding

Wired into `gates-self-tests-both-directions` it reported **17 failures**, and every one inspected
was the harness's own fault:

| Cause | Example |
| --- | --- |
| Fixtures assume sibling files | `gates-links-resolve`'s pass fixture is `See [this table](./structural.toml).` — it asserts a link *that resolves*, and in an empty temp directory it does not |
| Tokens substituted with a placeholder | The skills schema's scan became `probe/**/SKILL.md` while its fixture still wrote `.claude/skills/x/SKILL.md`, so the engine saw no file |
| Table sections narrowed by gate id | Fed the `rules` schema to a fixture describing a `SKILL.md` |

Two were fixed — real module defaults instead of `probe`, and passing the whole table section — which
took 9 mismatches to 5. **The remaining 5 are untriaged**, and I cannot currently tell a stale
fixture from a further harness gap.

**A gate that cries wolf is deleted faster than the gate it was checking**, and this repo has that
written down. So the runner ships unwired: `rungs check` stays honest at 23 pass, and the claim that
fixtures are executed is not made until it is true.

### What the runner does cover

- Engines whose verdict depends only on the described file's content —
  `frontmatter-schema`, `sections`, `file-budget`, `register-schema`, `file-population`. Everything
  else is `unrun`, because a fixture that needs context it does not carry cannot be executed
  faithfully. **This is ADR-0007's applicability question one level down**: ask whether the check can
  legitimately run before running it.
- A generic builder for the declarative content keys (`frontmatter`, `sections`, `opening`, `body`,
  `row`) and for `matching_files`, rather than one builder per shape — per-shape sprawl is what left
  85 fixtures unrunnable to begin with.
- **A shape with no builder is `unrun`, never a pass.** That is requirement 1 and it is the part
  that stops this becoming F-006 one level up.

## Review

Verified 2026-08-16. **Three of four criteria unmet, so this stays at `review`.**

**1 · Every fixture executed or reported unrun. NOT MET.** The runner distinguishes the three
outcomes correctly, but it is not attached to anything that runs on every change, so in practice no
fixture is executed during `rungs check` today.

**2 · A deliberately broken fixture fails its gate. Met at the unit level, not the gate level.** The
test asserts `mismatch` for a fixture that disagrees with its engine, `unrun` for an unbuildable
shape, and `unrun` for an engine needing absent context. What is unproven is the same behaviour
through `gates-self-tests-both-directions`.

**3 · Any gate whose fixtures now fail is fixed or recorded. NOT MET** — 5 mismatches remain
untriaged and are recorded as [F-018](../FINDINGS.md) rather than left in a commit message.

**4 · `rungs check` and `npm test` pass.** 23 pass · 0 fail; `npm test` 22 pass, up from 21. **Met.**

### Closed 2026-08-16 by [WI-059](WI-059-selftest-wiring.md)

All four criteria now met. The runner is wired into `gates-self-tests-both-directions`, **ok 17 ·
mismatch 0 · unrun 45**, and a fixture that disagrees with its engine fails the gate — verified by
flipping one and watching it fail.

The prediction below was wrong in an instructive way. It said the durable fix was a fixture format
carrying its context, and named an ADR-0003 change. What actually blocked wiring was four ordinary
defects — including a gate declared against an engine whose table its module does not have, which
had been passing by examining nothing since it shipped. **The format was never the obstacle**; see
[WI-057](WI-057-selftest-setup.md), which refuted the `setup` block, and WI-059, which refuted the
"broken wiring" diagnosis that replaced it.

### What it would have taken, as predicted at the time — and why it was wrong

Either a fixture format that carries its context — a `setup` block naming the sibling files a
fixture assumes — or per-fixture triage of the remaining 5 followed by wiring. The first is a change
to [ADR-0003](../../decisions/ADR-0003-module-definition-format.md)'s territory and the more likely
right answer, because the current format describes fragments and the runner needs scenarios.

That is a decision, not a continuation, which is why this stops here rather than guessing.
