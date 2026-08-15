---
id: WI-036
title: Port updated design-system site surfaces and prepare the next package release
type: feature
status: done
branch: feature/WI-036-design-system-versions
created: 2026-08-15
updated: 2026-08-15
related: [WI-032, WI-035]
epic:
children: []
---

## Proposal (rationale)

The design-system export now contains a Versions surface and a richer site footer, while the
Astro app still exposes neither. Porting those surfaces keeps the public site aligned with its
design authority and gives the package a truthful, navigable release history before the next npm
release.

## Decision

`accepted` — 2026-08-15, requested by the repository owner; implement the site sync and prepare the
next package version, while keeping the irreversible tag/publication decision separate until the
release checks pass.

## Plan

### Requirements

- Vendor the current `design_system/export/` into the tracked site design-system copy.
- Add a first-class `/versions/` page based on the exported Versions surface, with current package
  and release data rather than stale sample values.
- Port the exported footer composition into the Astro layout without reintroducing phase or stale
  npm-name claims; retain working internal, GitHub, and npm links.
- Bump the CLI package and lockfile to `0.1.3`, and align current public documentation with the
  package and site state.

### Impacts

- Site routes, navigation, shared layout, vendored design-system files, package metadata, changelog,
  README, roadmap, and release-readiness documentation.
- Railway deploys from `main`; the site build and link gate must remain green.
- The npm registry is immutable, so publication of `0.1.3` remains an explicit release action.

### Approach

- Run the existing vendor script so generated design-system files and browser assets remain derived
  from the export.
- Translate the React kit into Astro markup using the existing design-system components, keeping
  dates and version claims sourced from the package/registry evidence available at implementation.
- Use `0.1.3` as the next patch version because the change is additive site/documentation work and
  does not alter the CLI command contract.
- Do not tag or publish in this item; assess `/cut-release` after the implementation and gates pass.

### Acceptance criteria / tests

- `site/src/pages/versions.astro` exists, is linked from the shared navigation/footer, and the site
  build emits `/versions/` with no stale sample release values.
- The shared footer matches the new composition, contains no phase or unclaimed-name copy, and all
  destinations resolve.
- `package.json` and `package-lock.json` agree on `0.1.3`; current README, roadmap, and readiness
  prose no longer claim an older local package version.
- `npm test`, `npm run rungs -- check`, `npm --prefix site run build`, and
  `npm --prefix site run check` pass.

### Out of scope

- Creating annotated tags, release/deploy branches, or publishing to npm; those are the separate
  `/cut-release` decision after this item is reviewed.

## Execution

Branch created from `main`: `feature/WI-036-design-system-versions`.

- Vendored the current design-system export with `npm run vendor`; the export was already
  represented in the tracked component copy, so no generated component delta was needed.
- Added `site/src/pages/versions.astro`, linked it from `NAV` and the shared footer, and adapted the
  exported sample state to published `0.1.2` plus the prepared `0.1.3` package metadata.
- Replaced the footer with the exported two-column composition while retaining the current docs,
  npm, and GitHub destinations and removing stale phase/namespace copy.
- Added `changelog.d/0.1.3.md`, bumped `package.json` and `package-lock.json`, and aligned the
  current README and roadmap statements.

## Review

Acceptance criteria verified:

- `/versions/` is emitted by the Astro build and is linked from the shared navigation/footer; the
  rendered page shows `0.1.2` as latest and `0.1.3` as pending from the root package metadata.
- The footer contains Versions, npm, and GitHub destinations and no phase or stale namespace copy;
  the link gate reports 1,415 internal links with 0 broken.
- Package and lockfile agree on `0.1.3`; current README and roadmap claims agree with public latest
  `0.1.2` and the prepared next version.
- `npm test` (7/7), `npm run rungs -- check` (20/20), `npm --prefix site run build` (99 pages), and
  `npm --prefix site run check` (0 errors, 0 warnings, 0 hints) pass.

Merged into `main` in `11cbf43` on 2026-08-15; the feature branch is retained remotely for the
release audit trail until the release branches are created.
