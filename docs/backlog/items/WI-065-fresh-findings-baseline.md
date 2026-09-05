---
id: WI-065
title: Make a fresh tracked findings register pass its own gate
type: feature
status: planned
branch:
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, F-018]
epic: WI-064
children: []
---

## Proposal (rationale)

Installing `@rungs/cli@0.3.1` with the tracked profile into a clean clone of Arena Lab registered 21
gates, then failed immediately: `findings-disposition-has-reason` interpreted the scaffold's own
`| — | | | *nothing open* | | | |` placeholder as a finding with missing Sev, Pri and Evidence.
A generated baseline that fails its own schema makes first use start with a waiver and prevents the
consumer from distinguishing its defects from Rungs' defects.

## Decision

`accepted` — 2026-09-05, by the user as the first bootstrap repair. Fix the general empty-register
case in Rungs before adopting the tracked package in Arena Lab.

## Plan

### Requirements

- The findings register emitted by the module passes `findings-disposition-has-reason` while it
  contains no real finding.
- A malformed real open row still fails with the missing required fields named.
- The behavior is generic and does not special-case Arena paths or content.
- A fresh tracked scaffold reaches the check runner without this failure.

### Impacts

- `src/engines2.ts` register-schema parsing or the findings module's generated empty state.
- Focused engine tests and a packaged/scratch tracked-scaffold regression.
- Module version and upgrade behavior only if emitted content changes.

### Approach

First reproduce the smallest table input and trace whether placeholder rows should be omitted by the
producer or recognized as empty by the schema engine. Prefer one generic representation of an empty
register. Preserve enforcement for any row that claims a real identifier.

### Acceptance criteria / tests

1. A focused test reproduces the 0.3.1 failure before the fix.
2. The generated empty findings register produces zero schema findings after the fix.
3. A real row missing Sev, Pri or Evidence still produces the expected findings.
4. A fresh tracked install followed by `rungs check` has zero failures attributable to the empty
   findings register.
5. `npm test` and this repository's `rungs check` pass without weakening an existing gate.

### Out of scope

- Implementing builders for every currently named but unrun self-test fixture; those remain visible
  coverage debt and are not the cause of this false failure.
- Existing-authority migration, CLI pinning, ref-only Git behavior or publishing; WI-066 through
  WI-068 and a later release item own those concerns.

## Execution

Not started.

## Review

Not started.
