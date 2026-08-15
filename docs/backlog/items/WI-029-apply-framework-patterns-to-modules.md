---
id: WI-029
title: Apply framework-derived patterns to shipped modules
type: docs
status: review
branch: feature/WI-029-apply-framework-patterns
created: 2026-08-15
updated: 2026-08-15
related: [WI-017]
epic:
children: []
---

## Proposal (rationale)

[WI-017](WI-017-framework-synthesis.md) admits framework-derived patterns whose target surfaces are
already shipped: `instructions`, `workflows`, `skills`, `gates`, `session`, and `testing`. The
research item is forbidden from editing `modules/`, so the catalogue can otherwise become more
accurate while installed repositories continue receiving the pre-synthesis definitions.

This item owns the implementation decision once, across the affected modules. It prevents six
small edits from silently choosing different vocabulary, versioning, and upgrade behavior.

## Decision

`accepted` — 2026-08-15. The item will apply only patterns with a useful, repository-level
expression. The `testing` entry remains catalogue-only because the module catalogue deliberately
dropped a language-specific testing module; product-only/runtime patterns remain outside the module
boundary. No child item is needed before the concern table is completed.

## Plan

### Requirements

- Build a concern table from
  [`frameworks/synthesis.md`](../../research/frameworks/synthesis.md#5-catalogue-reconciliation)
  mapping each admitted pattern to the exact shipped module files it would change.
- Decide per concern: update in this item, leave catalogue-only with a reason, or split to a named
  child item before implementation.
- Keep manifests, templates, skills, rules, parameters, examples, and gates consistent where a
  concern crosses more than one generated surface.
- State module-version and `rungs upgrade` consequences before editing generated content.
- Preserve the synthesis boundary: product UI, live-tail transport, and sandbox implementation are
  not repository-module capabilities.

### Impacts

- Potential changes under `modules/instructions`, `modules/workflows`, `modules/skills`,
  `modules/gates`, `modules/session`, and `modules/testing`.
- Possible module version bumps, catalogue references, generated fixture updates, and upgrade tests.
- No CLI command-surface change is implied by the research.

### Approach

Run per-concern decomposition before changing a module. A pattern with no enforceable or useful
generated expression stays catalogue-only with a written reason; evidence does not require every
research finding to become scaffold content.

If the concern table reveals independently releasable changes or incompatible module-version
requirements, create child items and keep this item as their decision/coordination parent.

### Acceptance criteria / tests

1. Every commensurable new or strengthened pattern from WI-017 has one disposition and one target
   file set.
2. Every implemented module change carries matching provenance and version/upgrade handling.
3. No product-only pattern is represented as a capability rungs does not install.
4. Generated fixtures and documentation agree with the changed modules.
5. `rungs check` and the complete module/CLI test suite pass; the site builds with 0 broken links.

### Out of scope

- Reopening the six framework extractions or their pinned evidence.
- Implementing a sandbox, event-stream backend, run-control UI, agent runtime, or model provider.
- Changing CLI commands unless a separately accepted child item establishes that need.
- Treating every catalogue entry as mandatory module content.

## Execution

`in_progress` — 2026-08-15. The implementation boundary is the generated repository contract:
instructions, workflows, skills, and session guidance may change; no product runtime, sandbox,
transport, or model-provider capability is added.

### Concern table

| Admitted or strengthened pattern | Disposition | Exact target file set | Version / upgrade consequence |
| --- | --- | --- | --- |
| `isolation-boundary-declaration` | Update | `modules/instructions/module.toml`, `modules/instructions/fragments/AGENTS.md` | Bump instructions `1.0.0` → `1.1.0`; existing installs receive the fragment on `rungs upgrade`. |
| `bounded-agent-loop` | Update | `modules/workflows/module.toml`, `modules/workflows/rules/bounded-invocation.md`, `modules/workflows/skills/decompose/SKILL.md`, `modules/workflows/fragments/AGENTS.md` | Bump workflows `1.0.0` → `1.1.0`; new rule and skill text are emitted by `rungs upgrade`. |
| `agent-facing-interface` | Update | `modules/workflows/module.toml`, `modules/workflows/rules/invocation-boundaries.md`, `modules/workflows/skills/decompose/SKILL.md`, `modules/skills/module.toml`, `modules/skills/rules/skill-authoring.md`, `modules/skills/fragments/AGENTS.md` | Bump workflows and skills to `1.1.0`; generated guidance changes on upgrade. |
| `ownership-changing-handoff` | Update | `modules/workflows/module.toml`, `modules/workflows/rules/invocation-boundaries.md` | Workflows `1.1.0`; no CLI surface change. |
| `protocol-with-escape-hatch` | Update | `modules/workflows/module.toml`, `modules/workflows/rules/invocation-boundaries.md` | Workflows `1.1.0`; review-only guidance is emitted on upgrade. |
| `resumable-approval-state` + `approval-bound-to-request` | Update | `modules/workflows/module.toml`, `modules/workflows/rules/invocation-boundaries.md` | Workflows `1.1.0`; review-only guidance is emitted on upgrade. |
| `interrupt-as-state` (merged into `resumable-approval-state`) | Update | `modules/workflows/rules/invocation-boundaries.md` | No separate catalogue id or version; stable pending identity and continuation state are part of workflows `1.1.0`. |
| `explicit-output-designation` | Update | `modules/workflows/module.toml`, `modules/workflows/rules/invocation-boundaries.md`, `modules/skills/rules/skill-authoring.md` | Workflows and skills `1.1.0`; generated authoring guidance changes on upgrade. |
| `skill-neighbours` (strengthened with ownership/return semantics) | Update | `modules/skills/module.toml`, `modules/skills/rules/skill-authoring.md`, `modules/skills/fragments/AGENTS.md` | Skills `1.1.0`; no new invocation mechanism. |
| `prompt-writes-artifact` (strengthened with status/recovery contract) | Update | `modules/skills/rules/skill-authoring.md`, `modules/workflows/skills/decompose/SKILL.md` | Skills/workflows `1.1.0`; existing generated files are refreshed by `rungs upgrade`. |
| `session-handoff` (narrowed to narrative continuity) + `event-stream-not-audit-log` | Update | `modules/session/module.toml`, `modules/session/fragments/AGENTS.md`, `modules/session/skills/close-session/SKILL.md` | Bump session `1.0.0` → `1.1.0`; session template/skill are refreshed by `rungs upgrade`. |
| `replay-safe-side-effect` | Catalogue-only | None; remains a rung-3 research candidate in `frameworks/synthesis.md` | Workflows is a rung-2 module; implementing durable replay semantics would require a separate version/profile decision. |
| `typed-output-gate`, `structural-gates` comparison | Catalogue-only | None; generic gates cannot validate domain-specific output types | No module change; avoid claiming a capability the gate engine cannot enforce. |
| `contract-test-base`, `deterministic-model-substitution` | Catalogue-only | None; `testing` module was intentionally dropped from the catalogue | No module change; language-specific test harnesses remain downstream concerns. |
| `worktree-lifecycle`, `narrowest-anchor-loop`, `scope-discipline` | Leave as-is / catalogue mapping | Existing concurrency/instructions definitions or non-commensurable analogy | No version change; existing shipped definitions already cover the repository-level expression. |
| Existing gates self-test fixture hygiene (`gate-self-test`) | Update | `modules/gates/gates/structural.toml` | No gates version bump; `${{...}}` passthrough keeps the existing self-test intent while satisfying the manifest audit. |
| Product-only durable-superstep, event-log-plus-live-tail, run-control-surface, shared-workspace-subagents | Out of scope | None | No installed capability or CLI change. |

The module versions above are the pre-edit versions. Each changed manifest and fragment will carry
matching provenance before the review status is recorded.

### Implementation notes

- `instructions`, `workflows`, `skills`, and `session` are now `1.1.0`; their manifests, fragments,
  rules, skills, and templates agree on the adopted vocabulary and provenance.
- The `gates` self-test fixture now uses the repository's `${{...}}` passthrough form, preserving the
  link-template test while making `rungs modules`' parameter audit clean. The existing gates version
  remains `1.0.0` because no gate behavior changed.
- The catalogue records the new pattern-to-module mapping and the deliberately catalogue-only
  patterns. A temporary `disciplined` scaffold confirmed that the new workflow rules and updated
  skills render, and its `rungs upgrade` preview reported zero stale or divergent files.

### Verification

- `node src/cli.ts modules` — 15 modules, audit clean.
- `node src/cli.ts check` — 20 pass, 0 fail, 0 unimplemented, 0 error.
- `cd site && npm run build` — 88 pages built, 0 broken links; existing duplicate-content-id
  warnings remain recorded as F-010.
- `cd site && npm run check` — 0 Astro diagnostics, 1127 internal links, 0 broken.
- `npm test` — 5 focused module/CLI unit tests pass.

## Review

`review` — 2026-08-15. The concern table is complete and each commensurable WI-017 pattern has one
disposition and an exact source-file set. The implemented patterns are present in module provenance,
module versions, fragments, rules, skills, templates, and the catalogue; the intentionally
catalogue-only rows explain why no generated capability is claimed. `replay-safe-side-effect` stays
out of the rung-2 workflows module, typed output validation stays out of generic gates, and the
language-specific testing candidates stay out of the deliberately dropped testing module.

Acceptance review:

1. **Disposition coverage — pass.** The table covers the confirmed/strengthened patterns, merged
   `interrupt-as-state`, new invocation patterns, catalogue-only testing/gate candidates, existing
   mappings, and product-only residues.
2. **Provenance and upgrade handling — pass.** Instructions, workflows, skills, and session are
   `1.1.0`; source manifests and fragments carry the matching pattern ids and incidents. A temporary
   disciplined scaffold rendered the new rules and its upgrade preview reported zero stale or
   divergent files.
3. **Product boundary — pass.** No sandbox, event transport, run-control surface, agent runtime,
   model provider, or CLI command was added. The generated rules explicitly state those limits.
4. **Generated agreement — pass.** `docs/design/module-catalog.md`, module manifests, source
   fragments, rules, skills, and templates use the same parameters and pattern vocabulary. The
   gates self-test fixture preserves its template-link behavior while `rungs modules` reports a
   clean audit.
5. **Verification — pass.** `node src/cli.ts check` is 20/20; `node src/cli.ts modules` is audit
   clean; `npm test` is 5/5; `site` builds 88 pages and checks 1127 internal links with 0 broken.
   Existing duplicate-content-id build warnings remain recorded in F-010.
