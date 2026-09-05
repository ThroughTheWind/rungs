---
id: WI-074
title: Make release version sources format-aware and fail closed
type: feature
status: in_progress
branch: feature/WI-074-version-source-formats
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, WI-072, F-047]
epic: WI-064
children: []
---

## Proposal (rationale)

The release table advertises Node, .NET and Python version sources, but `computed-claim` follows a
configured `path` only for JSON. A real `pyproject.toml` disagreement therefore contributes no
value and the gate reports green after examining only the JSON file. Parse failures and missing
configured values are swallowed the same way.

Arena Lab itself is .NET, and the bootstrap is meant to establish a trustworthy reusable release
module rather than a Node-only happy path. A consistency gate that silently removes an ecosystem
from the comparison is more dangerous than an explicit limitation because its green result is the
evidence checked before an immutable package cut.

## Decision

`accepted` — 2026-09-05, during the user-authorised Arena Lab bootstrap. Make each declared source
format explicit and fail closed once a matching configured file exists but cannot contribute its
value. A source glob matching no file remains optional; a matched source that is malformed or lacks
its configured value is not evidence of agreement.

## Plan

### Requirements

- Read dotted `path` values from JSON and TOML and the configured XML element from
  `Directory.Build.props`, using one shared version-source reader rather than format logic embedded
  in one gate loop.
- Count and compare every matched, non-excluded source; JSON/TOML/XML disagreement must produce one
  actionable finding naming each contributing file and value.
- Report a matched source that is malformed, lacks its configured path/element, or contains an
  unusable version scalar instead of silently omitting it.
- Fail when the complete configured source set yields no version, while allowing an optional glob
  that simply matches no file when another valid source participates.
- Preserve explicit `exclude` behavior and independently versioned package guidance.
- Keep source-reading semantics reusable by WI-072's changelog boundary when that branch integrates.

### Impacts

- `computedClaim` and a shared source parser in `src/`; release module gate fixtures and the fixture
  builder; focused production-path regression coverage.
- Public release claims may name Python participation only after this item lands.
- WI-072 may replace its branch-local source parser with this shared implementation during rebase;
  that integration is mechanical and must retain WI-072's exact marker semantics.

### Approach

Dispatch by an explicit supported descriptor derived from the declared source: dotted `path` plus
the file format for JSON/TOML, or `xpath` for the narrow XML element used by the release module.
Return a result that distinguishes no match, parse failure, missing value and valid scalar; `null`
must not collapse all four states. Keep pattern matching and `exclude` in `computedClaim`, but move
file interpretation out so the changelog engine can consume the same truth later.

Each matched source increments examined evidence whether valid or invalid. Collect parse/value
findings first, then compare valid values. This preserves the useful disagreement report while
ensuring a malformed third source cannot turn a three-way comparison into a green two-way one.

### Acceptance criteria / tests

1. Equal JSON, TOML and XML sources pass with all three examined; any one disagreement fails and
   names every contributing file/value.
2. Malformed JSON/TOML, a missing dotted path/XML element and an invalid scalar each fail with the
   offending file and reason rather than being skipped.
3. A non-matching optional glob is harmless when at least one valid source exists; zero contributed
   sources fails with actionable configuration guidance; explicit exclusions remain excluded.
4. The exact F-047 production shape—`package.json` at `1.0.0` and `pyproject.toml` at `2.0.0`—fails
   through `runGates` with both sources examined.
5. Release-module fixtures execute in both directions with zero newly unrun fixtures.
6. Focused tests, full `npm test`, package dry-run, `git diff --check` and all registered Rungs gates
   pass. The exact pushed SHA passes all six OS/Node matrix cells and the site job.

### Out of scope

- F-046 path containment, F-042/F-045 eject independence and F-043 branch-local exemptions; their
  own work items retain those boundaries.
- Discovering arbitrary version locations, executing dynamic Python version providers, validating
  SemVer policy, or deciding which independently versioned files a consumer should exclude.
- Cutting or publishing 0.4.0 and Arena Lab's final immutable adoption.

## Execution

Not started.

## Review

Not started.
