---
id: WI-043
title: Make `add` honour a detected paradigm instead of installing over it
type: feature
status: done
branch: feature/WI-043-add-honours-paradigm
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

`accepted` — 2026-08-16. The user directed that WI-039 be finished, which this blocks.

**The open question answered itself.** The item was opened undecided between refusing outright and
warning-then-proceeding. That is only an open question if the default is being invented here, and it
is not: [ADR-0004](../../decisions/ADR-0004-adoption-detection.md) state 5 already says `add`
*"prints the comparison and stops"*, and the ADR is accepted. Choosing the friendlier default would
have been amending an accepted decision from inside a bug fix — the exact move
[WI-037](../items/WI-037-act-on-external-review.md)'s third requirement forbids. So: refuse by default,
`--confirm-paradigm` to override, mirroring `--confirm-threshold`.

## Plan

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

Branch `feature/WI-043-add-honours-paradigm`, cut from `main` at `1dbb9e1`.

`cmdAdd` scans once, detects every module in the resolved order, and refuses those whose state is
`paradigm` before writing anything. `blockedByParadigm` in
[`src/add.ts`](../../../src/add.ts) propagates the refusal along dependency edges.

Two decisions taken during execution, both from behaviour the first version got wrong:

1. **The refusal applies under `--dry-run` too**, unlike `--confirm-threshold` beside it, which
   carries `&& !dryRun`. A preview that installs what the real run refuses is a preview of a
   different command. Criterion 4 is what forced this; the threshold check's own behaviour here
   looks like a bug, and is left alone as not this item's.
2. **The surviving install order is recomputed, not filtered.** The first version refused `backlog`
   and then wrote `instructions` and `gates` anyway — pulled in *solely* as its dependencies, so
   nobody asked for them and nothing surviving needed them. Filtering `order` in place cannot see
   that; re-resolving the closure from the surviving *requested* names can. `add backlog adr` on the
   same repo correctly still writes `instructions` and `gates`, because `adr` needs them.

## Review

Verified 2026-08-16 on `feature/WI-043-add-honours-paradigm`, against a repo with
`.github/ISSUE_TEMPLATE/bug_report.md`.

**1 · `add backlog` writes nothing and prints the comparison. Met.**

```
  backlog: this repo already does this another way — external-tracker
      matched .github/ISSUE_TEMPLATE/bug_report.md
      Work items here are Markdown files in the repo; your tracker is a system outside it. …
      compare: docs/research/synthesis.md#33-unit-of-work
      instructions, gates not written — pulled in only for the above

  Pass --confirm-paradigm to install anyway. Nothing was written.
```

The repo afterwards contains `.git`, `.github`, `README.md` and nothing else. Exit 1.

**2 · The override installs and says what it overrode. Met.**

```
  backlog: installing over an existing external-tracker (.github/ISSUE_TEMPLATE/bug_report.md) — --confirm-paradigm
      You will have two systems for one job. That is a choice, not a merge.
```

`docs/` is then written. The message was added after the first version installed silently — an
override that prints nothing is indistinguishable from a detection that found nothing, and the two
want opposite follow-ups.

**3 · A repo with no paradigm is unaffected. Met.** `add backlog --into hexguard-templates
--dry-run` reports `5 create · 1 rule · 2 skill · 1 merge`, unchanged. The four source repos detect
no paradigm (WI-039 criterion 3), so none of them can reach this path.

**4 · `--dry-run` and the real path agree. Met.** Both refuse, both write nothing, both name the
override.

**5 · `rungs check` and `npm test`. Met.** 20 pass · 0 fail · 0 unimplemented · 0 error; 12 tests
pass, up from 11 — the new one covers refusal propagating along `audit → findings → backlog`, which
is the chain that exists because one repo produced 268 audit documents with no register. `--help`
lists `--confirm-paradigm` and exits 0.

### Partial installs are now possible, and that is intended

`add backlog adr` on a tracker repo installs `adr` and refuses `backlog`. That is the point — the
paradigm note recommends exactly this ("install only the modules that do not duplicate it"). Exit
code is 0 when anything installed, 1 when nothing did.
