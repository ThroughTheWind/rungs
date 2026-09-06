---
id: WI-087
title: Make every shipped self-test fixture execute, or state exactly why it cannot
type: feature
status: planned
branch:
created: 2026-09-06
updated: 2026-09-06
related: [WI-085, WI-045, WI-056, WI-057, WI-059, WI-086, WI-077, F-018, F-006]
epic: WI-085
children: []
---

## Proposal (rationale)

`gates-self-tests-both-directions` executes a fixture only when its engine is on the runner's
context-free list and its shape has a builder. Recomputed 2026-09-06 with a scratch script over all
fifteen module tables (`.scratch/fixture-inventory.mjs`, run from this checkout): **147 fixtures,
71 execute and agree, 69 are unrun, 7 disagree with their engine.** This repository's meta-gate
reports 45 unrun and zero mismatches because it only examines the 26 gates registered here; the
7 mismatches live in modules this repo does not install, so no gate anywhere has ever run them.

Reading the seven, none is a fixture typo. Four are rules a shipped table configures and no engine
reads — the F-007 shape, again: `sections` ignores `required_subsections` (specs) and the per-tier
`when` condition (workflows, which therefore flags every tier-1 plan for tier-2 sections in three
profiles); `register-schema` ignores `requires_note` (specs); `file-population` ignores
`exempt_marker` (audit) and the structural `similarity_*` keys (ci, which therefore fires on any
repo with eight workflows however different they are). Two are a builder writing a register row
under no heading when the spec names one (design-sync). One is the builder joining paths with the
platform separator, so on Windows the audit population never matches its own glob.

Among the unrun, the same reading finds `findings-ids` unable to detect a duplicate finding id
(the engine extracts one id per file, and a register is one file), `adr-index-current` checking
that a block exists and never that it is current (`derives = "file-index"` is unread),
`instructions-render-current` passing a repo that has rule sources and has never rendered anything,
and `skills-description-routes` reading a `field_shape` block nothing implements — so that gate has
examined every consumer's skills and checked nothing about their descriptions. These are consumer
promises in shipped profiles, and the fixtures that would have caught them were documentation.

## Decision

`accepted` — 2026-09-06 under [WI-085](WI-085-existing-promises-remediation.md). Give every fixture
an explicit scenario — context declared in the fixture, builders keyed on fixture fields, adapters
for engines that need a Git repository or a module root — and implement the table rules the
fixtures assert where they are bounded. A rule that stays unimplemented is named as such in the
runner's output and in a producer-side test, never relabelled obsolete.

## Plan

### Requirements

- Every `[[self_test]]` in every bundled module resolves to one of: `ok`, `mismatch` (a gate
  failure), `error` (the engine threw — a gate failure, no longer converted into `unrun`), or
  `unrun` with a reason naming the unimplemented rule. `no builder` is not an acceptable reason at
  the end of this item.
- Fixture construction never branches on `expect`. Context a fixture needs — files that exist, an
  item's status, a Git branch state, a registry row — is declared in the fixture and built the same
  way for both directions.
- The rules fixtures assert are implemented in their engines: `when` and `required_subsections`
  (sections), `requires_note` (register-schema), `exempt_marker` and structural `similarity`
  (file-population), `field_shape` (frontmatter-schema), row ids in a register (id-integrity),
  `derives = "file-index"` (render-freshness), no rendering anywhere (render-freshness), and the
  hook engine from WI-086.
- A producer-side test runs the inventory over all fifteen modules and asserts zero `mismatch`,
  zero `error`, and an unrun set equal to an explicit allowlist with reasons, so the seven
  invisible mismatches cannot recur invisibly.
- Existing verdicts on this repository and on the four source repos' `--explain` output are
  preserved except where an implemented rule now legitimately fires; every such change is listed.

### Impacts

- `src/selftest.ts` (builders, adapters, outcomes), `src/engines*.ts` (the rules above),
  `src/engine-table.ts` if a mapping moves, module gate tables (fixture context, never expected
  verdicts), `test/core.test.js`.
- Risk: implementing `similarity` or row-level ids may fire on real repositories. Each new rule is
  run against this repo and the four source repos before it ships; a rule above WI-053's one-in-five
  false-positive threshold on any single repo is narrowed or left unrun with its reason.

### Approach

Fix the seven mismatches first, because each is a shipped defect. Then builders by fixture shape,
smallest first: files with N lines, populations, filenames, registers, then the Git-backed shapes
(merged status, worktrees, merge drivers) reusing the repository builder `change-requires-file`
already has. The meta-gate's own fixtures need a module root the fixture controls; the ejected
runner's root override from WI-077 provides it and is reset in `finally`. `design-mirror-not-edited`
depends on a `rungs design pull` command that does not exist and is recorded as unsupported with
that reason, not built here.

### Acceptance criteria / tests

1. The inventory script reports `mismatch: 0`, `error: 0`, and lists every remaining `unrun` with
   a reason that names an unimplemented rule; the count is recorded with the command and date.
2. `rungs check` here reports the unrun count that the allowlist predicts for the gates registered
   here, and `gates-self-tests-both-directions` still passes.
3. Each implemented rule fails on a seeded violation and passes when corrected, through the
   production `runGates` path, in `test/core.test.js`.
4. `doctor --explain` on hexguard, hexguard-templates, rift-forge and axiom-mesh changes only where a
   listed rule now fires; the diff is recorded per repo with its commit.
5. Full `npm test`, all registered gates and `rungs modules` pass.

### Out of scope

- Building `rungs design pull` or any command a fixture presupposes.
- `warn_at` thresholds: the runner has no warning state, and inventing one is an ADR-0005 question,
  not a fixture repair. Recorded as a finding if still unimplemented at close.
- Rewriting fixtures to match what an engine happens to do today.

## Execution

Not started.

## Review

Not started.
