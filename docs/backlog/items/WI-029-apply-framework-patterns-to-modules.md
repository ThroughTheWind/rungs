---
id: WI-029
title: Apply framework-derived patterns to shipped modules
type: docs
status: planned
branch:
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

Not started.

## Review

Not started.
