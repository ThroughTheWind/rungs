---
id: WI-087
title: Make every shipped self-test fixture execute, or state exactly why it cannot
type: feature
status: done
branch: feature/WI-087-executable-self-test-coverage
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

`accepted` — 2026-09-06 under [WI-085](../items/WI-085-existing-promises-remediation.md). Give every fixture
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

Executed 2026-09-06 on `feature/WI-087-executable-self-test-coverage`, cut from `main` `1670d1f`
(WI-086 landed). The scratch inventory (`.scratch/fixture-inventory.mjs`, gitignored) was the
oracle throughout: 147 fixtures · 71 ok · 69 unrun · 7 mismatch at the start.

**Runner.** `src/selftest.ts` was rewritten around one rule: a builder is keyed on what the fixture
declares and never on the verdict it expects. Every shipped shape has one — files of N lines,
managed blocks, rule sources and renderings, derived index blocks, item files and the next-id
marker, register rows, story files, workflow files sharing a stated fraction of structure,
pointer documents, open findings with detail, skills naming or not naming peers, one skill's
description, a topic restated in a document, worktrees holding branches, merge drivers declared
and installed, a merged or unmerged item branch, a board row and its item, the meta-gate examining
a module directory the fixture builds (through a module-root override in `src/ejected.ts`, reset in
`finally`), and content fixtures with `tier`, `subsections` and a spec-derived table heading.
Context a fixture needs is now declared in it: link inputs name the files that exist, stale-blocker
inputs name the finished item, rule-propagation inputs name the registry row, board inputs name the
item's status. Paths are written and returned with forward slashes — the audit population had never
matched its own glob on Windows. An engine that throws is `error`, a gate failure; the two fixtures
no engine can serve are `unrun` with the unimplemented rule named.

**Rules the fixtures asserted and no engine read**, now implemented: `when` and
`required_subsections` (sections), `field_shape` (frontmatter-schema), `requires_note`
(register-schema, note column configurable), `exempt_marker` and `similarity_on`/`similarity_min`
(file-population, Jaccard over job ids, `uses:` and `run:` tokens), register-row ids (id-integrity),
`derives = "file-index"` currency and never-rendered detection (render-freshness). `render` now
fills a `file-index` block from its sources (`renderDerivedBlocks`), because a gate that compares
rows to records would otherwise turn every consumer's ADR index red with no command able to fix it.

**Shipped defects the executing fixtures exposed**, fixed in the same change:

1. Every exemption-marker check (`engines.ts`, `engines2.ts`, `engines3.ts`, the closure gate)
   matched `marker\s*\S`, and `-->` is a non-space character — so `<!-- owner-ok: -->` exempted.
   The reason must now be on the marker's line and must not be the comment closer.
2. `findings-self-declared-closure`'s row pattern (engine default and the findings table) required a
   `]` after the id; real rows are `| F-054 | …`, so the gate had examined nothing on any consumer.
3. Two tables shared one spec entry between two gates: `instructions-render-current` also judged the
   repo-map block (entry `rules`, renamed `render`), and `skills-spec-pure` would have judged
   descriptions once `field_shape` existed (entry `skills`, split into `spec-pure` and
   `description-routes`).
4. `skills-description-routes`, once real, failed two shipped skills: `harden-rule` and
   `design-align` named no trigger phrase. Both descriptions now say "Use when …"; this repo's
   identical copy of `harden-rule` is updated with the module's.
5. `docauth-working-rules`' fourth fixture said "We used to …", which the negation window rightly
   permits regardless of the marker, so it could never have failed for its stated reason; it now
   states a present-tense violation with a bare marker. `specs-status-evidence`'s rows lacked the
   `Story` column the register requires, so they fired for the wrong reason; rows now carry it, and a
   pass fixture with a note joins the fail fixture without one.

**This repository.** `adr-index-current` fired the moment currency was checked: the `adr-index`
block in `docs/decisions/README.md` had been empty beside ten records since it was written, with a
hand-kept table doing the index's job below it. `rungs render` now fills the block; the hand-kept
table is gone. `rungs check` reports 30 pass and, for the first time, no unrun fixtures.

**Deviations.** One the plan did not foresee. Filling the ADR index block at install made the
packed journey call `docs/decisions/README.md` diverged: the record hashes the emitted bytes, and a
filled block is not the emitted bytes. Ownership now hashes a module-owned file with every managed
block's **body** stripped (`ownershipHash` beside `contentHash`; used by the install record, upgrade
planning and application, detection and the eject launcher check), with a recorded raw hash from an
older record still accepted through either reading. The five owned files carrying blocks — the ADR
and specs indexes, the ci trigger block, the session archive index, the shared registry — all hold
generated bodies, so the rule is consistent; a deleted block still reads as an edit because the
markers stay in the hash. `warn_at` stays unimplemented per Out of scope.

**Found on the way.** [F-062](../FINDINGS.md): `design-sync` ships a gate that cannot function
(`local-modification` detection and `rungs design pull`, neither of which exists).

## Review

Against each acceptance criterion, 2026-09-06, Windows 11, Node `v22.22.3`, npm `10.9.8`:

1. **Inventory.** `node .scratch/fixture-inventory.mjs` (scratch, gitignored): **148 fixtures ·
   146 ok · 2 unrun · 0 mismatch · 0 error**. The two unrun are both
   `design-mirror-not-edited`, each with the detail "rule `detect = "local-modification"` is
   unimplemented, and the `rungs design pull` it presupposes does not exist". Started the day at
   147 · 71 · 69 · 7 (one fixture was added: the `requires_note` pass case).
2. **This repository.** `node src/cli.ts check`: 30 pass, and for the first time no "fixture(s)
   have no builder" line — every fixture of the 26 registered gates executes. The count the
   allowlist predicts here is zero, because `design-sync` is not installed.
3. **Production path.** `test/core.test.js` "the table rules the fixtures exposed…" seeds a violation
   and its correction through `runGates` for `when` (tier-1 plan passes, tier-2 plan fails),
   `required_subsections`, `field_shape` (and proves `skills-spec-pure` ignores wording),
   `exempt_marker` (bare vs reasoned), register-row ids, the closure row pattern (real row,
   bare marker, reasoned marker), `file-index` (0 rows fail; `renderDerivedBlocks` writes the two
   rows and the gate passes; a second render changes nothing) and never-rendered detection.
   "every shipped self-test fixture executes…" runs the inventory inside the suite and holds
   `unrun` to the explicit two-entry allowlist. "ownership ignores a filled managed block…" covers
   the ownership deviation.
4. **`--explain` on the source repos**, captured before any engine change and after all of them,
   ANSI stripped, diffed: hexguard-templates `d24cf0aa`, rift-forge `846cfa06` and axiom-mesh
   `3e1508a8` byte-identical. hexguard `51b25dac` differs by two lines: the "29 self-test fixture(s)
   have no builder" line is gone because they run, and `ci-workflow-proliferation` reports 97
   matching files instead of 99 — the similarity rule now excludes the two workflows whose structure
   differs from the rest, which is the count the gate's message always promised.
5. **Suite and gates.** Focused: the eight ownership-related tests and the packed journey, 8 pass
   (1 host skip). Full serial `node --test --test-concurrency=1 test/*.test.js` on the final tree:
   **149 tests, 146 pass, 0 fail, 3 platform skips, 244 s**. `node src/cli.ts check`: 30 pass,
   0 fail. `node src/cli.ts modules`: audit clean.

**Pending.** The exact-SHA OS/Node matrix has not run: the branch is not pushed.
