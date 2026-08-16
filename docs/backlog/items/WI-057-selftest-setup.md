---
id: WI-057
title: Narrow the self-test mismatches, and locate the real cause
type: feature
status: done
branch: feature/WI-057-selftest-setup
created: 2026-08-16
updated: 2026-08-16
related: [WI-045, WI-056, F-007, F-018]
epic:
children: []
---

## Proposal (rationale)

From [F-018](../FINDINGS.md), whose recommendation after
[WI-056](WI-056-triage-selftest-mismatches.md) was: stop triaging one at a time, because a fixture
describes a *fragment* while an engine needs a *scenario*. Give the format a `setup` block naming
the sibling files a fixture assumes — an [ADR-0003](../../decisions/ADR-0003-module-definition-format.md)
change — then wire the runner in.

**That recommendation was wrong, and this item is mostly the correction.**

## Decision

`accepted` — 2026-08-16, directed by the user.

## Plan

### Requirements

- Establish what each remaining mismatch actually needs before changing any format.
- Fix what is a defect; record what is not.
- `rungs check` stays green throughout.

### Approach

Read the seven fixtures first. The `setup` block was proposed from one example —
`gates-links-resolve`'s pass fixture, which genuinely needs a sibling file — and generalised
without checking the others.

### Acceptance criteria / tests

1. Each remaining mismatch is attributed to a concrete cause.
2. Defects fixed; non-defects recorded with evidence.
3. `rungs check` green, `npm test` passing.

### Out of scope

- **Wiring the runner in.** Still requires zero unexplained mismatches.
- **A `setup` block.** Refuted below; nothing deferred, the idea is withdrawn.

## Execution

Branch `feature/WI-057-selftest-setup`, cut from `main` at `a107cdd`.

### The `setup` block was the wrong answer, and reading the fixtures showed it in one pass

**Not one of the seven remaining fixtures needed a sibling file.** The proposal had been generalised
from a single example. What they actually needed:

| Cause | Count | Kind |
| --- | ---: | --- |
| Fixtures left behind when the skill schema moved to another module | 3 | **defect** |
| `targetPath` could not read an array-form table (`[[frontmatter_schema]]`) | 1 | harness |
| The builder ignored `table = "Closed"`, so a row was written under no heading | 1 | harness |
| `extensions_allowed_from` configured and implemented nowhere | 1 | **defect** |
| Unexplained | 1 | — |

Fixed: the three stale `gates-frontmatter-valid` fixtures now describe the `rules` schema that is
actually in that table; `targetPath` takes the first entry of an array table; the builder writes a
`## <table>` heading before a row. **7 → 3.**

### Then the remaining three localised the real problem

`session-sections-present`'s two fixtures were called directly, with the same table and the same
blocks the gate would pass:

```
result: [ { expect: "fail", outcome: "ok" }, { expect: "pass", outcome: "ok" } ]
```

**Both pass.** Through `gateMeta` the same fixtures report a mismatch. Same inputs, different
answer — so the runner and the fixtures are fine and **the wiring is the defect**. Every previous
round had been attributing wiring artifacts to fixtures and "fixing" the wrong end, which is exactly
why the failing set kept moving.

That reframes F-018 from an open-ended format question into a bounded debugging task with an oracle:
make `gateMeta` agree with the direct call.

### `extensions_allowed_from` — the fifth of its kind

`skills.toml` declares `extensions_allowed_from = "module.toml:skills.<name>.extensions"`, and
`grep` finds no reader. Worse, **`[skills.<name>]` is not parsed into the manifest at all** — the
`Manifest` type has no `skills` field — so the opt-in that is supposed to attach a portability cost
to a decision attaches to nothing. Recorded as [F-019](../FINDINGS.md) rather than implemented: it
needs manifest parsing, an engine change and a test, which is an item.

## Review

Verified 2026-08-16.

**1 · Each mismatch attributed.** Seven: three stale fixtures, two harness gaps, one unimplemented
rule, one that led to the wiring diagnosis. **Met.**

**2 · Defects fixed, non-defects recorded.** Three stale fixtures replaced, two harness gaps fixed,
[F-019](../FINDINGS.md) opened for the unimplemented rule, F-018 rewritten around the wiring
diagnosis. **Met.**

**3 · Green.** `rungs check` **24 pass · 0 fail · 0 unimplemented · 0 error**; `npm test` 22 pass.
**Met.**

### The correction worth keeping

I proposed the `setup` block from one example and generalised it without reading the rest. Six of the
seven fixtures did not need it, and the seventh pointed at the wiring instead. **A recommendation
written from a single case is a guess with a citation** — and this one would have produced a format
change to ADR-0003 for a problem that turned out to live in fifty lines of integration code.