---
id: WI-031
title: Integrate transferable Rift Forge workflow capabilities into rungs
type: feature
status: in_progress
branch: feature/WI-031-integrate-rift-forge-capabilities
created: 2026-08-15
updated: 2026-08-15
related: [WI-029, WI-030]
epic:
children: []
---

## Proposal (rationale)

WI-030 refreshed Rift Forge against its newer candidate branch and identified workflow capabilities
that are useful beyond that product: a status predicate shared by verification and landing, a narrow
finding-closure check, live-owner validation for generated triage, on-demand project history, a
generated gate index, and worktree ageing evidence. Rungs currently describes some of these patterns
but does not yet expose a deliberate adoption decision or a capability-level implementation plan.

This item turns the evidence into rungs changes where the existing module contract can support them,
and records an explicit reason for every capability that is deferred or rejected. The goal is a
portable capability, not a source-specific port of Rift Forge scripts.

## Decision

`accepted` — 2026-08-15, by explicit request. The refreshed candidate evidence is sufficient to
start a capability-mapping and integration pass, while preserving rungs' no-runtime and
module-boundary constraints.

## Plan

### Requirements

- Build a capability matrix for the candidate changes: status-preflight/shared predicates,
  self-declared finding closure, live triage-owner validation, on-demand history separation, a
  generated gate index, and worktree ageing. Each row names the candidate path/commit, the rungs
  module or design surface, the running cost, and `adopt`, `defer`, or `reject` status.
- Implement every capability marked `adopt` using the current module/engine contracts, with provenance
  and cost carried in the relevant manifest or design document.
- Add self-tests or fixture coverage for each new mechanical rule, and ensure unsupported source-
  specific behaviour is not silently represented as generic rungs behaviour.
- Update the module catalogue, pattern catalogue, and adoption/detection documentation where the
  capability changes what `rungs add`, `doctor`, `check`, `render`, or `upgrade` promises.

### Impacts

- Likely surfaces: `modules/`, `src/`, `test/`, `docs/design/`, `docs/research/pattern-catalog.md`,
  and the detection/render reports.
- May require an ADR if a capability changes the module definition format, gate engine contract, or
  generated-artifact boundary.
- No changes to the Rift Forge checkout or to product-specific game/data workflows.

### Approach

1. Read the current module manifests and engines before choosing an implementation seam.
2. Write the evidence-backed matrix and identify the smallest portable abstraction for each adoption
   candidate; do not copy Rift Forge file names or assumptions into a generic module.
3. Implement adopted capabilities one at a time with fixtures in both directions (the rule fires and
   the legitimate exception remains allowed), then render/check a representative target repository.
4. Record deferred/rejected rows with the reason and the cost that made them a poor default; leave
   release packaging and public documentation synchronization to WI-032 and WI-035.

### Acceptance criteria / tests

1. The capability matrix exists in a versioned design/research surface and every candidate row has
   provenance, cost, decision, and a reason.
2. Every adopted capability is represented in a module manifest or engine contract, has a passing
   positive and negative test, and appears in generated catalogue/detection output where applicable.
3. A clean `npm test`, `npm run rungs -- check`, and representative `init`/`add`/`check`/`render`
   smoke run pass without weakening an existing gate.
4. A repository-wide search finds no Rift Forge-specific path or command presented as a generic rungs
   requirement without an explicit adapter boundary.
5. The item records any ADR and updates the pattern/module documentation before review.

### Out of scope

- Reimplementing Rift Forge's product or its .NET/Angular tooling.
- A full concurrency/land service in rungs; adopt only a portable contract that fits the CLI.
- Public release, npm publication, or the broader docs/frontend sync (WI-032 and WI-035).

## Execution

Started on `feature/WI-031-integrate-rift-forge-capabilities`.

- Current candidate matrix and portability decisions are being recorded in
  `docs/design/rift-forge-capability-matrix.md`.
- The first adopted capability is a generic self-declared-finding-closure gate,
  implemented in the `findings` module and its markdown engine contract. The
  status-preflight, live-owner, history, gate-index, and ageing candidates are
  explicitly deferred or rejected in the matrix because they require a product
  land service, generated triage schema, or operational owner policy that rungs
  does not own.

## Review

Not started.
