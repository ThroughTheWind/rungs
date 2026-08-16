---
id: WI-043
title: Make `add` honour a detected paradigm instead of installing over it
type: feature
status: proposed
branch:
created: 2026-08-16
updated: 2026-08-16
related: [WI-039, ADR-0004, F-014]
epic: WI-037
children: []
---

## Proposal (rationale)

[ADR-0004](../../decisions/ADR-0004-adoption-detection.md) defines six per-artifact states and says
of state 5 that `add` **prints the comparison and stops**. That behaviour does not exist.

`paradigm` is read by `doctor` and by nothing else. `grep -n paradigm src/add.ts src/cli.ts`
returns five hits on 2026-08-16, all of them in `doctor`'s rendering; `add.ts` has none. So a repo
whose work lives in an issue tracker is now correctly *reported* as a different paradigm by
[WI-039](WI-039-external-tracker-paradigm.md) — and `rungs add backlog` will still write a Markdown
backlog beside it, silently, along with `AGENTS.md`, `.ai/` and 12 gates.

**This predates WI-039.** The `milestones` paradigm has had the same hole since the CLI shipped, so
no paradigm has ever stopped an install. WI-039 is what made it visible, by adding the first
paradigm anyone would actually hit.

It matters because it is the half that answers the objection. The
[external review](../../design/external-review-2026-08-16.md) asked why work state is not in
Linear or Jira; the adjudication's answer was that rungs *maps* rather than *migrates*, on ADR-0004's
authority. That answer is currently true of `doctor` and false of `add`.

Recorded as [F-014](../FINDINGS.md) and promoted here immediately: an accepted ADR state that
silently does nothing is not an observation, it is a defect with a written specification already
attached.

## Decision

Undecided. Opened `proposed` because it is a **CLI behaviour change** that WI-039's plan explicitly
placed outside itself (*"No CLI change expected. If one turns out to be needed, that is a finding
about ADR-0004's paradigm mechanism"*), and because refusing an install a user typed deliberately is
a design choice someone should make on purpose rather than inherit from a bug fix.

The open question is the default. Refusing outright is what ADR-0004 says. Warning loudly and
proceeding is friendlier and is what most tools do. They differ exactly when the user knows better
than the detector, which is the case ADR-0004's `--confirm-threshold` precedent already handles.

## Plan

> Filled on acceptance.

### Requirements

- `add` consults each resolved module's detect state before writing anything.
- On `paradigm`, that module is not installed; the `note` and the `compare` link are printed.
- An explicit flag installs anyway, and the flag's name states what it overrides.
- Dependencies pulled in by a refused module are not written either, unless another requested
  module needs them.
- `--dry-run` reports the refusal identically.

### Impacts

- [`src/add.ts`](../../../src/add.ts) and `cmdAdd` in [`src/cli.ts`](../../../src/cli.ts).
- `--help` gains a flag ([WI-004](WI-004-help-completeness.md)'s standing requirement).
- Both existing paradigms change behaviour: `milestones` and `external-tracker`.
- **Risk:** a paradigm signature that over-matches now blocks an install rather than printing a
  line. That raises the cost of a false positive from noise to obstruction, which is the argument
  for the flag and for keeping signatures narrow.

### Approach

Mirror `--confirm-threshold`, which already has this exact shape for the rung check: detect, refuse
by default, name the override in the refusal message. One mechanism, two uses.

### Acceptance criteria / tests

1. `rungs add backlog` into a repo with `.github/ISSUE_TEMPLATE/` writes nothing and prints the
   comparison.
2. The override flag installs it, and says what it is overriding.
3. A repo with no paradigm is unaffected — the four source repos install as before.
4. `--dry-run` and the real path agree.
5. `rungs check` and `npm test` pass.

### Out of scope

- **New paradigm signatures.** WI-039 owns those; this owns what `add` does with them.
- **Adapters, sync, or import.** Refused in
  [`external-review-2026-08-16.md` §3.1](../../design/external-review-2026-08-16.md).
- **The other five ADR-0004 states.** Only state 5 is unimplemented; nothing deferred.

## Execution

Not started.

## Review

Not started.
