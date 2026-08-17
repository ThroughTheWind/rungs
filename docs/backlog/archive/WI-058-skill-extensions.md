---
id: WI-058
title: Implement the skill-extension opt-in, at every layer it was missing from
type: feature
status: done
branch: feature/WI-058-skill-extensions
created: 2026-08-16
updated: 2026-08-16
related: [WI-057, F-019, F-007, ADR-0001]
epic:
children: []
---

## Proposal (rationale)

From [F-019](../FINDINGS.md), found by [WI-057](WI-057-selftest-setup.md) executing a self-test
fixture that had never run.

`modules/backlog/module.toml` declares:

```toml
[skills.work-item]
extensions = { disable-model-invocation = true }
extension_note = """
`work-item` creates branches and merges. A model should not decide on its own that now is the
moment. …
"""
```

`grep -n extensions src/*.ts` returned **nothing**. So:

- `[skills.<name>]` was never parsed — `Manifest` had no `skills` field;
- the key never reached the emitted `SKILL.md`;
- `extensions_allowed_from`, declared in the skills gate table, was read by no engine;
- and `modules/README.md` documented the mechanism to contributors.

**`work-item` creates branches and merges, and the manifest's stated reason for opting it out of
model invocation had been inert since it was written.** The fifth instance of a rule configured and
unread — and the most complete, because it was missing at *every* layer rather than one.

## Decision

`accepted` — 2026-08-16, directed by the user.

## Plan

### Requirements

- `[skills.<name>].extensions` is parsed into the manifest.
- An opted-in extension is written into the emitted `SKILL.md` frontmatter.
- A skill with no opt-in is untouched.
- The gate treats an opted-in key as legal and **still refuses one nobody opted into**.
- The opt-in is read from the **module**, not the consumer repo.

### Impacts

- [`src/types.ts`](../../../src/types.ts), [`src/manifest.ts`](../../../src/manifest.ts),
  [`src/add.ts`](../../../src/add.ts), [`src/engines.ts`](../../../src/engines.ts).
- Every consumer's `work-item` skill gains the key on next install.

### Approach

Inject at emit rather than storing the key in the source skill. That is the point of the opt-in: the
source stays spec-pure and portable ([ADR-0001](../../decisions/ADR-0001-multi-harness-rendering.md)),
and the extension — with its portability cost — stays attached to the module's decision to take it.

### Acceptance criteria / tests

1. A scratch install emits `disable-model-invocation` into `work-item` and not into
   `backlog-summary`.
2. The gate accepts an opted-in key, refuses one nobody opted into, and refuses it again when the
   rule is absent.
3. `rungs check`, `npm test` pass.

### Out of scope

- **New extensions for other skills.** This implements the mechanism; using it is a per-module
  decision with a cost to state.

## Execution

Branch `feature/WI-058-skill-extensions`, cut from `main` at `fd16e07`.

Four layers, because it was missing from four: parse `[skills.*]` into `Manifest.skills`; inject
opted-in keys into emitted skill frontmatter; teach `frontmatter-schema` to consult the owning
module; export the engine so the behaviour can be tested directly.

### Two code paths emit skills, and patching one was not enough

`emittedFiles` and `addModule` both read `modules/<m>/skills/**` and write it out — the same file,
produced twice. Patching only `emittedFiles` left `add` writing the un-extended version, so **an
install and an upgrade would have produced different content for the same skill**, and the
divergence machinery would then have reported the user's file as diverged from something they never
touched. Caught by installing into a scratch repo and finding the key still absent. Both paths now
go through one helper.

The opt-in is read from the **CLI's** module set, not the consumer's files, so a repo cannot
legalise an extension by editing its own copy — the portability cost belongs to whoever took it.

## Review

Verified 2026-08-16.

**1 · A scratch install emits it, selectively.** `rungs init <tmp> tracked`:

| | `disable-model-invocation` |
| --- | --- |
| `.claude/skills/work-item/SKILL.md` | **present** |
| `.claude/skills/backlog-summary/SKILL.md` | absent |

The emitted frontmatter ends `start to finish.` / `disable-model-invocation: true` / `---`.
**Met.**

**2 · The gate accepts, refuses, and refuses without the rule.** Three assertions, because the first
alone would be satisfied by a gate that accepts everything:

- opted-in key with `extensions_opted_in` set → no finding;
- `argument-hint` with nothing opted in → `non-spec key 'argument-hint'`;
- the same opted-in key with `extensions_allowed_from` removed → reported again.

**Met.**

**3 · Gates and tests.** `rungs check` **24 pass · 0 fail · 0 unimplemented · 0 error**;
`npm test` **24 pass**, up from 22. `rungs modules` audits clean. **Met.**

### This repo's own copy

`.claude/skills/work-item/SKILL.md` is a `kept` file — authored here before rungs was installed — so
`upgrade` correctly refuses to touch it, and the key was added by hand to match the module's
declaration. Correct behaviour on rungs' part, worth naming: the mechanism now works for every
consumer that installs, and this repo had to opt itself in like anyone else editing their own file.