---
id: WI-077
title: Make ejected checks genuinely package-independent
type: feature
status: planned
branch:
created: 2026-09-05
updated: 2026-09-05
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

Not started; begin after WI-073 lands so ejection inherits its operation-wide path boundary.

## Review

Not started.
