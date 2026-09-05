---
id: WI-072
title: Track the consumed release boundary
type: feature
status: in_progress
branch: feature/WI-072-release-consumption-boundary
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, WI-070, F-025]
epic: WI-064
children: []
---

## Proposal (rationale)

`release-fragment-current` rejects a versioned changelog fragment only when it names a version
below the package version. Immediately after a release, however, a forgotten fragment and the
package version are equal. Rungs therefore shipped 0.2.0 with its consumed `0.2.0.md` fragment
still present while the gate written to catch that exact error reported green.

The next public cut will supply Arena Lab's immutable consumer version. Relying on the same prose
step again would knowingly carry F-025 across the release boundary. The repository needs an
offline, tracked statement of the last version whose fragments were assembled, and the existing
gate must reconcile fragments, package version and that statement before tagging becomes
irreversible.

## Decision

`accepted` — 2026-09-05. Close F-025 before the 0.4.0 cut as a separate WI-064 child. Extend the
existing gate rather than adding another overlapping release gate. The marker records changelog
consumption, not npm publication, so it can be advanced and checked before the tag and publish
boundary.

## Plan

### Requirements

- Add `{{changelog_dir}}/CONSUMED_THROUGH` as tracked release-module state whose complete content is
  exactly `UNINITIALIZED`, `none`, or a three-part numeric version.
- Emit `UNINITIALIZED` for a new or upgraded module and fail with actionable initialization guidance
  until the owner explicitly chooses `none` or the last version whose fragments were consumed.
- Seed Rungs' own marker to `0.3.1`, its latest released version, without inferring this value for
  other repositories.
- Treat a concrete consumption boundary as steady-state truth that must equal the parseable package
  version. A boundary above or below it is red; the temporary red while assembling a release is
  intentional.
- Preserve the current stale-fragment rule and additionally reject every versioned fragment at or
  below a concrete consumption boundary. Keep higher-version and non-version fragment names valid.
- Make the cut-release procedure advance the marker in the same reversible preparation that
  assembles notes and deletes consumed fragments, then bump versions and run all gates before tag.
- Preserve consumer ownership: init and upgrade never overwrite an existing marker, including one
  Rungs records as diverged after the consumer initializes it.

### Impacts

- `changelog-freshness` engine, its fixture builder and production-path regression coverage.
- Release module 1.4.0 → 1.5.0, its emitted files, gate table, skill and Rungs' manually maintained
  registry copy.
- Rungs' release runbook, generated public claim data and reconstructed 0.4.0 fragment.
- Upgrade behavior: existing release-module consumers deliberately become red until they initialize
  the new marker. Their later consumer-owned edits remain protected but may be reported as diverged.
- F-025 closes only after the implementation lands with end-to-end gate evidence.

### Approach

Keep one `release-fragment-current` gate and extend its existing table row with the marker path.
The engine parses the package version and marker independently, reports missing, blank, malformed
and `UNINITIALIZED` state, enforces equality for a concrete boundary, and compares each versioned
fragment with both values. `none` is the explicit first-release exception: an equal fragment may
remain while that first release is being prepared. Use `our-schema` applicability because Rungs
defines the marker shape but the consumer intentionally maintains its value.

The equality invariant is required, not cosmetic. Testing only `fragment < package` or
`fragment <= consumed` would still pass if a releaser forgot both deletion and marker advancement.
Once the package is bumped, equality forces the marker to advance; once it advances, a retained
same-version fragment fails.

Add the marker as a normal module file so fresh installs and 1.4.0 upgrades receive a visible
sentinel through existing no-overwrite lifecycle behavior. Do not infer history from package
metadata, tags or the network: those can state what was versioned, not whether fragments were
actually assembled.

### Acceptance criteria / tests

1. Missing, blank, malformed and `UNINITIALIZED` markers fail with a concrete initialization step;
   a boundary above or below the package version also fails.
2. `none` permits first-release preparation, while a concrete boundary equal to the package version
   passes when no consumed fragments remain.
3. A fragment equal to or below the concrete boundary fails; one above both values and a non-version
   fragment pass. The exact F-025 shape—package, boundary and retained fragment all `0.2.0`—fails
   through production `runGates`, not only a direct engine call.
4. Every release-module self-test executes in both directions with zero unrun fixtures, and the
   extensionless marker cannot satisfy `release-changelog-fragment`.
5. A non-default changelog directory emits and reads its substituted marker path.
6. Fresh install creates only `UNINITIALIZED`; a 1.4.0 upgrade adds the sentinel and stays red until
   initialized; existing and later-edited markers are never overwritten.
7. Focused tests, full `npm test`, package dry-run, `git diff --check` and all registered Rungs gates
   pass. The exact pushed SHA passes the complete six-cell OS/Node matrix and site job.

### Out of scope

- F-042's broken dependency-free `eject` boundary and F-043's inherited inline exemptions. Each is
  a separate release blocker requiring its own work item before 0.4.0; neither is folded into this
  engine change.
- Proving npm publication or consulting a registry. The marker asserts local changelog consumption
  and deliberately works offline.
- Cutting, tagging or publishing 0.4.0, or adopting it in Arena Lab. WI-064 retains those later
  producer/canary/consumer stages.
- A new release gate, a new engine, an ADR or an automatic inference/migration of release history.

## Execution

Not started.

## Review

Not started.
