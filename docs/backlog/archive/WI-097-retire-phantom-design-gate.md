---
id: WI-097
title: Retire the design-sync gate that presupposes a command that does not exist
type: chore
status: done
branch: feature/WI-097-retire-phantom-design-gate
created: 2026-09-06
updated: 2026-09-06
related: [WI-087, WI-085, ADR-0007]
epic:
children: []
---

## Proposal (rationale)

F-062: `design-sync` ships `design-mirror-not-edited`, whose table declares
`detect = "local-modification"` and `generated_by = "rungs design pull"`. No engine implements the
detection and no `design pull` command exists — the mirror is produced by the `/design-pull` *skill*,
an agent procedure — so the gate passes on every repository by examining nothing. Its two fixtures
were the only ones of 163 that cannot execute, held on an explicit allowlist since
[WI-087](WI-087-executable-self-test-coverage.md). `module-commands-exist` never caught
the phantom because it reads `command` keys, not `generated_by` values.

## Decision

`accepted` — 2026-09-06, at the user's request to tackle F-059 to F-063. Retire the gate rather than
build `design pull`: a CLI command that fetches an external design authority is a feature with no
accepted design, and a gate that reports green while checking nothing is worse than no gate — it is
the confidently-wrong probe ADR-0007 refuses. The rule the gate stated (the mirror is generated; a
hand edit is destroyed by the next pull) stays where it already lives, in the skill's text. This is
not a weakening: nothing the gate ever detected stops being detected.

## Plan

### Requirements

- The gate, its table entry and its two fixtures are removed from `design-sync`; the module's
  version moves 1.0.0 → 1.1.0 and the fragment marker follows.
- The `/design-pull` skill no longer names a gate; it states the rule directly.
- `module-commands-exist` treats a `generated_by` value naming `rungs …` as a command claim.
- The self-test inventory's unsupported allowlist is empty and asserted empty; the named-unsupported
  mechanism stays for the next case.

### Impacts

- `modules/design-sync/{module.toml,gates/design.toml,fragments/AGENTS.md,skills/design-pull/SKILL.md}`,
  `scripts/check-module-commands.mjs`, `src/selftest.ts`, `test/core.test.js`, site claims snapshot.

### Approach

Delete, then make the gate that should have caught it read the value it hid in. Alternative —
implement `local-modification` against a manifest the skill would be asked to write — rejected: a
gate that depends on an agent remembering to write a manifest is the same green-by-omission with
one more step.

### Acceptance criteria / tests

1. The inventory test asserts zero unrun fixtures; `runSelfTests` on a `modified` fixture now reports
   "no builder", not a named unsupported rule.
2. A test proves `module-commands-exist` fails on a table whose `generated_by` names a command the
   CLI does not dispatch.
3. Serial suite, `rungs check` and the site claims check pass; `doctor --explain` output for this
   repository is unchanged (it does not install `design-sync`).

### Out of scope

- Building `rungs design pull`; a separate proposal if a consumer ever needs it. Nothing else deferred.

## Execution

Branch `feature/WI-097-retire-phantom-design-gate` from `28837f14`, 2026-09-06. As planned. The
`/design-pull` skill now tells the agent to check `git status` and `git diff` on the mirror before
pulling, since no gate watches it — the honest replacement for a gate that claimed to. The fragment
marker moved to `design-sync@1.1.0` with the module version, so a consumer's `upgrade` sees the
change. `unsupportedReason` stays as a function that returns null, so the next table rule nothing
implements is named there rather than counted as "no builder".

## Review

1. Targeted (2026-09-06): "the self-test runner executes a fixture…" (a `modified` fixture is now
   "no builder"), "every shipped self-test fixture executes…" (unrun list empty, every row ok) and
   "module-commands-exist reads generated_by values…" (an honest `node .ai/rungs.mjs render` passes,
   a phantom `rungs design pull` fails naming the file and line): 3/3.
2. Inventory `node .scratch/fixture-inventory.mjs`: 161 fixtures, 161 ok, 0 unrun, 0 mismatch,
   0 error (was 163 with 2 unrun; the two retired fixtures are the difference).
3. `node scripts/check-module-commands.mjs`: 54 spans resolve; it caught this item's own first
   wording of the retirement comment, which named the phantom in a code span — reworded.
4. `npm test`: 157 tests, 154 pass, 0 fail, 3 skipped, 151 s. `node src/cli.ts check`: 32 pass
   after archiving; claims snapshot regenerated (`design-sync` 1.1.0).
