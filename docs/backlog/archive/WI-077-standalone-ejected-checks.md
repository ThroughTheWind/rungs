---
id: WI-077
title: Make ejected checks genuinely package-independent
type: feature
status: done
branch: feature/WI-077-standalone-ejected-checks
created: 2026-09-05
updated: 2026-09-06
related: [WI-045, WI-066, WI-068, WI-070, WI-073, WI-085, WI-086, F-042, F-045, ADR-0002]
epic: WI-064
children: []
---

## Proposal (rationale)

`rungs eject` promises that a repository can keep its checks after uninstalling Rungs, but the
materialized runner imports a partial TypeScript source copy whose dependency closure is absent.
Even if that loader failure is repaired, the documented aggregate entry point remains the managed
`.ai/rungs.mjs` launcher, which always invokes the exact npm package. Direct gate commands and the
normal local/CI workflow therefore disagree about whether ejection actually ended the dependency.

This is one boundary, not two independent fixes: a standalone engine that cannot run the registry
is not the consumer workflow, and a local aggregate launcher pointing at an incomplete engine only
makes the same failure easier to reach.

## Decision

`accepted` — 2026-09-05, during the user-authorised Arena Lab bootstrap. Fix F-042 and F-045
together. Build a dependency-bundled Node artifact as part of the Rungs package, materialize that
artifact plus the selected gate data at ejection, and replace the managed launcher with a local
ejected launcher whose supported surface is `check`. Both individual rewritten gate commands and
`node .ai/rungs.mjs check [tier]` must work after all access to npm, the installed package and the
producer checkout is removed.

## Plan

### Requirements

- Ship a reproducibly built ejected runner containing the complete engine/runtime dependency
  closure, including current transitive TOML/XML needs, with no imports resolved from a consumer's
  `node_modules` or the producer checkout.
- Preserve every runnable gate: converted declared gates execute the frozen engine/table; existing
  repository-owned command gates retain their command; hooks remain excluded from aggregate runs.
- Materialize the module manifests and raw gate tables needed by meta-gates and skill extension
  ownership, plus substituted JSON tables used for frozen execution.
- Switch the managed `.ai/rungs.mjs` to a package-free local launcher during the same preflighted
  operation. It must support aggregate `check`, ordered tiers, exit status, findings and ledger
  behavior, and clearly refuse lifecycle commands no longer available after ejection.
- Make repeated ejection byte-idempotent and fail before mutation if existing `.rungs` content or a
  diverged launcher cannot be safely claimed.
- Keep the package and source paths honest: the packed CLI copies the built artifact it actually
  ships, and source tests exercise that same artifact rather than a parallel handwritten runner.

### Impacts

- `scripts/build.mjs`, a dedicated ejected-runner entry point, `src/lifecycle.ts`, engine runtime
  module-root discovery, `.ai/gates.toml` rewriting and the instructions-owned launcher transition.
- Package contents and integrity expectations; focused core tests and the packed existing-consumer
  journey.
- README/help/ejected README and generated instructions must narrow “stop depending” to the exact
  retained check surface and explain how to re-adopt Rungs.
- WI-073's complete-operation path preflight should protect every materialized file before the first
  write; no eject-specific path join may reopen that boundary.

### Approach

Add a second esbuild entry point that bundles engine code and all package dependencies into one ESM
file for Node 22. The ejected runner has two explicit modes: a gate id executes one frozen declared
gate, while `check` parses the rewritten registry, applies the same ordered-tier selection, runs
frozen gates in-process and repository-owned command gates as commands, appends the same local
ledger fields, prints findings and exits nonzero for fail/unimplemented/error or an empty/unknown
tier.

Copy the bundle into `.rungs/` together with substituted JSON execution tables and the minimal raw
module manifests/tables needed by `gate-meta` and skill-extension lookup. Recognize only the exact
Rungs-generated command form as a converted declared gate; an arbitrary command carrying engine
metadata stays a repository command. Generate a small `.ai/rungs.mjs` forwarder that uses
`process.execPath`, never npm or PATH lookup.

Precompute bytes and validate destinations before writing. On a repeat, recognize the ejected
registry/launcher and reproduce identical output instead of appending another marker or losing the
table inventory.

### Acceptance criteria / tests

1. Without the fix, a declared gate from an ejected tracked consumer fails at module loading; with
   it, both `node .rungs/run-gate.mjs <id>` and `node .ai/rungs.mjs check` execute and return the
   expected pass/fail statuses.
2. After ejection, rename or remove the isolated installed package prefix and run with no usable npm
   or producer path. Aggregate checks still execute every non-hook gate, including repository command
   gates, and use only files committed inside the consumer plus `process.execPath`.
3. Fast/full/default tier selection, unknown/empty tiers, unimplemented/error outcomes, finding
   text, aggregate exit code and `.ai/.gate-ledger.jsonl` fields match the production runner's
   semantics on the same fixture registry.
4. `gates-self-tests-both-directions` and skill frontmatter extension checks retain their pre-eject
   verdicts from materialized raw metadata rather than passing on an empty module set.
5. The rewritten `.ai/rungs.mjs` contains no package spec/npm invocation, local and generated CI
   continue calling it, and non-check commands fail with an explicit ejected-state explanation.
6. A second eject produces no byte or Git diff. Pre-existing/diverged owned destinations refuse the
   entire operation without partially rewriting the registry or launcher.
7. `npm pack --json` includes the exact bundled asset; a packed isolated existing-repository journey
   proves its integrity, removes package access, runs direct and aggregate checks, and leaves the
   producer checkout unchanged.
8. Focused tests, full `npm test`, package dry-run, `git diff --check` and all registered Rungs gates
   pass. The exact pushed SHA passes all six OS/Node matrix cells and the site job.

### Out of scope

- Preserving `render`, `upgrade`, `add`, `backlog archive`, concurrency commands or any other Rungs
  lifecycle command after ejection; the retained product is the frozen check system.
- Removing Node itself from an ejected consumer, updating frozen engines after ejection, or making
  externally authored command gates independent of the runtimes they deliberately invoke.
- WI-076 archive containment, F-043 branch-local exemption evidence, F-034 line-ending behavior,
  publishing v0.4.0 or adopting it in Arena.

## Execution

Executed 2026-09-06 on `feature/WI-077-standalone-ejected-checks`, cut from `main`
`3de9111` under the [WI-085](WI-085-existing-promises-remediation.md) programme, after WI-073's
path boundary had landed (2026-09-05). Baseline reproduction before any change: the built CLI's
`eject` failed before writing (it resolved `dist/glob.ts`), and the source CLI's ejected gate failed
with `ERR_MODULE_NOT_FOUND` for `smol-toml` — `engines.ts` imports the TOML parser, the self-test
runner, the manifest loader and substitution, none of which the five copied files carried.

What was built, following the Approach:

- `scripts/build.mjs` gains a second esbuild entry, `src/ejected-runner.ts` → `dist/ejected-runner.mjs`,
  with `packages: "bundle"`: 186 KB, every remaining import a `node:` builtin. `eject` copies that
  artifact and refuses if it is not built — it never copies loose sources again.
- `src/ejected.ts` holds the runtime roots (module set, frozen tables, producing version) and the
  one command form a converted gate may take. `engines.ts`, `check.ts` and `substitute.ts` read the
  roots instead of deriving paths from `import.meta.url`, which inside a bundle under `.rungs/`
  pointed at a `modules/` the consumer does not have and at a `package.json` that does not exist —
  the second of those threw inside `resolveParams`, the caller's catch returned no table, and the
  meta-gate passed without running a fixture.
- `check.ts` owns the `check` command end to end (`checkCommand`, moved verbatim from `cli.ts`)
  plus an ejected mode in which a converted gate runs in-process from its frozen JSON table. The
  production CLI runs the same converted entry as the repository command it is, so both paths reach
  the same engine on the same table.
- `eject` materialises `.rungs/run-gate.mjs`, `.rungs/tables/<module>-<table>.json` (substituted
  with the installed parameters), `.rungs/modules/<name>/{module.toml,gates/*.toml}` for every
  installed module and every frozen table's owner, `.rungs/ejected.json` and `.rungs/README.md`;
  rewrites the registry block-wise (the old lazy regex, on an already-converted block, ran into the
  next block); and replaces `.ai/rungs.mjs` with a forwarder that runs the bundle through
  `process.execPath` and refuses every other command by name. Hooks keep `kind = "declared"`: the
  runner skips them by trigger and their tables are frozen for dispatch.
- Preflight: every destination goes through `preflightEmittedPaths` before the first write; a
  `.rungs/` not written by a prior eject, or a launcher whose hash no longer matches the install
  record and is not already the forwarder, refuses the whole operation (`EjectRefusal`). A repeat
  reuses the recorded ejection date and rewrites nothing that is byte-identical after newline
  normalisation.

**Deviations, with reasons.**

1. The frozen tables are JSON *and* the raw tables are copied. The plan listed both; keeping both
   is deliberate rather than redundant — the JSON is what runs (the parameter source is gone after
   ejection, so re-substituting is impossible), the raw TOML is what the meta-gate's fixtures and the
   skill-extension lookup read. One source of truth per question.
2. The retained launcher surface is declared as a list (`EJECTED_RETAINED`, currently `check`)
   rather than hard-coded, because [WI-086](WI-086-consumer-hook-delivery.md) dispatches the
   shell-safety hook through the same launcher and must add `hook` to it; a hook adapter that points
   at a command ejection removed would block every tool call in an ejected repo.
3. Ejection adds one markdown file, `.rungs/README.md`, so `gates-links-resolve` examines one file
   more than before; the regression expects exactly that difference instead of blind equality.

**A mistake worth recording.** The first version of the end-to-end regression compared the 186 KB
runner as a `Buffer` against a `string`. The equality always failed, and the assertion library then
built a character-level diff of two 186 KB values — 221 seconds, then `Array buffer allocation
failed`, and the host went down three times before the cause was found. Large artefacts are now
compared by digest in both test files, with the reason beside each comparison.

## Review

Against each acceptance criterion, 2026-09-06, Windows 11, Node `v22.22.3`, npm `10.9.8`:

1. **Loading.** Before: reproduced as above. After: `test/core.test.js` "eject ships a package-free
   runner…" runs `node .rungs/run-gate.mjs instructions-core-size` (exit 0; exit 1 with the
   budget finding once `AGENTS.md` is padded) and `node .ai/rungs.mjs check` (exit 1, because the
   fixture carries a deliberately red repository command) from a disciplined consumer.
2. **Package absent.** `test/package.test.js` ejects with the packed candidate from the isolated
   prefix, commits, renames the prefix away, empties `npm_execpath` and points `npm_config_cache` at
   an empty offline directory, then runs the direct gate (exit 0) and `check full` (exit 0, `0 fail ·
   0 unimplemented · 0 error`, the adopted repository validator passing). What this does not prove:
   that Node is absent from `PATH` — repository command gates need the runtimes they invoke, so the
   Node directory stays; stated in the test.
3. **Semantics.** The core regression records `runGates` before ejection and compares the ejected
   `check` gate by gate: same ids in the same order, same status, same examined count (the link gate
   examines one more file, `.rungs/README.md`, asserted exactly); `fast` selects the same subset,
   `--full` the superset, `banana` is refused with the same sentence, a declared tier selecting
   nothing exits 1 with "no gates in the quick tier"; the ledger has one line per gate with the
   fields `at, id, status, ms, examined`. Output is the same function (`checkCommand`), so the
   agreement is by construction and the test is a guard against regression.
4. **Meta-gates.** The ejected `gates-self-tests-both-directions` examines the same count as the
   production run (asserted per gate) and the package journey asserts a non-zero examined count
   after the prefix is gone. Skill extension ownership reads the same materialised manifests.
5. **Launcher.** The forwarder contains neither `@rungs/cli` nor `npm` (asserted in both tests),
   runs the bundle via `process.execPath`, and answers `render`/`upgrade --apply` with exit 1 and an
   explanation naming ejection. The generated workflow and `AGENTS.md` still call
   `node .ai/rungs.mjs check`, unchanged.
6. **Idempotence and refusal.** A second eject with a different stamp reports `unchanged`, the tree
   digest of `.rungs/`, the registry and the launcher is identical, `git status` is clean, and a
   dry-run lists only `unchanged`. A foreign `.rungs/` and an edited launcher each throw
   `EjectRefusal` with the registry and launcher byte-identical afterwards and no `.rungs/` written.
7. **Packed journey.** `npm pack --json` lists `dist/ejected-runner.mjs` (asserted); the journey's
   integrity check, prefix removal, direct and aggregate ejected checks and producer-unchanged
   assertion all pass; the consumer rolls back to its seed commit.
8. **Suite and gates.** `npm run build` then `node --test --test-concurrency=1 test/*.test.js`:
   144 tests, 141 pass, 0 fail, 3 platform skips, 165 s serial. `node src/cli.ts check`: 30 pass,
   0 fail, 0 unimplemented, 0 error. `npm pack --dry-run --json`: `@rungs/cli@0.4.0`, 118 entries.
   `git diff --check` clean. **The exact-SHA OS/Node matrix is pending**: this branch is not pushed,
   so no remote run exists for it; recorded as unobserved, not as passed.

Status moves to `review`; `done` and the archive move happen in the change that lands the branch.
