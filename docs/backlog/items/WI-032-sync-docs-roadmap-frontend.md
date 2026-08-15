---
id: WI-032
title: Sync public docs, roadmap, and frontend surfaces with the current product
type: docs
status: review
branch: feature/WI-032-sync-docs-roadmap-frontend
created: 2026-08-15
updated: 2026-08-15
related: [WI-030, WI-031]
epic:
children: []
---

## Proposal (rationale)

The Rift Forge refresh changed the research spine and exposed the same class of drift rungs warns
about: README status, roadmap language, design/module documentation, and the published site can each
describe a different product. The repository now has fifteen modules, a pre-release v0.1.1 package,
generated site content, and new candidate-derived integration work queued behind WI-031. Those facts
need one synchronized public story before an external user is asked to adopt the CLI.

## Decision

`accepted` — 2026-08-15, by explicit request. Documentation and frontend synchronization is a
separate item from capability implementation and release readiness so stale claims cannot hide in a
large feature branch.

## Plan

### Requirements

- Audit `README.md`, `docs/roadmap.md`, `docs/getting-started.md`, `docs/design/`, module README files,
  and `site/src/`/generated content against the current command surface, module catalogue, package
  metadata, and WI-031 decisions.
- Update stale counts, version/status language, module descriptions, adoption guidance, navigation,
  and calls to action; date any measured claim and state the command that proves it.
- Keep research-derived facts attributed to their source and mark interpretation as opinion; do not
  silently convert a roadmap intention into a shipped capability.
- Ensure the public frontend routes expose the same docs and release posture as the repository source.

### Impacts

- Documentation and static-site content, generated artifacts, internal links, and user onboarding.
- May require a small content/schema adjustment in `site/`, but no new runtime dependency or product
  feature.
- WI-031 is a dependency for any capability wording; unresolved capability decisions remain clearly
  marked as planned work.

### Approach

1. Create a claim inventory with source path, current value, intended value, and evidence command/date.
2. Reconcile the roadmap's phase/status vocabulary with the backlog and package metadata, then sync
   README and getting-started guidance.
3. Rebuild the site content and inspect representative landing, docs, roadmap, module, and research
   routes for hierarchy, links, and first-use clarity.
4. Run the generated/link/type gates and leave any intentionally historical statement explicitly
   labelled with its survey date.

### Acceptance criteria / tests

1. The claim inventory covers README, roadmap, getting-started, design/module docs, and public site
   routes; every changed factual claim has a source and date.
2. No unqualified stale module count, version/status claim, command name, or roadmap phase remains in
   the audited surfaces.
3. `npm run rungs -- check`, `npm test`, `cd site && npm run build`, and `cd site && npm run check`
   pass with zero broken links and no new type diagnostics.
4. A representative first-time user can follow the public docs from install through `doctor`, `init`,
   and the next recommended command without encountering contradictory instructions.

### Out of scope

- Implementing WI-031 capabilities, quality remediation, or publishing a release (WI-034/WI-035).
- Rewriting historical research claims that are correctly labelled and evidenced.
- A visual redesign unrelated to clarity, navigation, or current-product accuracy.

## Execution

Execution started on `feature/WI-032-sync-docs-roadmap-frontend` after WI-031 merged. The claim
inventory is `docs/design/WI-032-claim-inventory.md`; it records each changed fact, its authority,
and the command/date used to re-check it.

- `npm test`: 6/6 pass.
- `npm run rungs -- check`: 20 pass, 0 fail.
- `cd site && npm run build`: 96 pages built; the pre-existing duplicate-content-id warnings
  remain, with no new type diagnostics.
- `cd site && npm run check`: 0 Astro errors/warnings/hints; 1,195 internal links, 0 broken.

## Review

Ready for review. README, roadmap, module catalogue, product brief, and landing-page claims now
use the current package/module/candidate evidence. The new matrix and claim inventory are published
through the existing docs glob; no second content copy or route registry was introduced.
