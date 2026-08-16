---
id: WI-044
title: Resolve the open findings register
type: chore
status: done
branch: chore/WI-044-resolve-open-findings
created: 2026-08-16
updated: 2026-08-16
related: [WI-045, WI-046, F-001, F-003, F-006, F-007, F-011, F-012, F-013]
epic:
children: []
---

## Proposal (rationale)

Seven findings were open, four of them opened during
[WI-037](../items/WI-037-act-on-external-review.md)'s run and three inherited from 2026-08-15. A register
that only grows stops being a register: [FINDINGS.md](../FINDINGS.md) states that it *"counts what
was recorded, not what was noticed"*, and the same logic applies one level up — a row nobody ever
closes is a row people stop writing.

This item takes each to a disposition. Not each to a fix: **`fixed`, `promoted` and `dismissed` are
all resolutions**, and forcing everything into `fixed` is how a batch like this quietly becomes six
half-done features.

## Decision

`accepted` — 2026-08-16, directed by the user.

## Plan

### Requirements

- Every row leaves the Open table with a written reason, per
  [FINDINGS.md](../FINDINGS.md)'s three dispositions.
- A finding whose fix is a design change is **promoted**, not attempted here.
- No fix ships without evidence it works *and* evidence it does not over-fire — the register's own
  standard, and the one [WI-042](WI-042-link-line-references.md) was opened for missing.
- `rungs check` and `npm test` pass.

### Impacts

- [`src/engines.ts`](../../../src/engines.ts), [`src/engines2.ts`](../../../src/engines2.ts),
  [`src/cli.ts`](../../../src/cli.ts), [`modules/gates/gates/structural.toml`](../../../modules/gates/gates/structural.toml).
- [`site/astro.config.mjs`](../../../site/astro.config.mjs) and a new
  [`site/scripts/check-vendored.mjs`](../../../site/scripts/check-vendored.mjs).
- One new repo-owned gate in `.ai/gates.toml`. Gate count 20 → 21.
- Two new items, [WI-045](../items/WI-045-run-gate-self-tests.md) and [WI-046](../items/WI-046-console-provenance.md).

### Approach

Work each finding in ascending cost, and let measurement decide the ones the finding itself left
open. F-007 offered two options and named the cheaper; I implemented the more expensive one, measured
it at **ten findings, all ten false**, and narrowed it until it was clean rather than falling back —
the fallback was still available the whole time and the measurement is what justified not taking it.

### Acceptance criteria / tests

1. The Open table is empty; every row appears in Closed with a disposition and a reason.
2. Each `fixed` finding has a test or a self-test asserting both directions.
3. Each `promoted` finding names its item and what scope that item takes.
4. `rungs check` and `npm test` pass; the site builds with 0 broken links.

### Out of scope

- **Archiving the 39 `done` items.** `rungs backlog archive`, which
  [backlog/README.md §8](../README.md) instructs contributors to use, **does not exist** —
  `rungs backlog` is an unknown command. Recorded as [F-015](../FINDINGS.md) rather than worked
  around by hand: moving 39 files and recomputing every link repo-wide is exactly the mechanical
  repo-wide edit that goes wrong silently.
- **Fixing what the promoted items cover.** WI-045 and WI-046 have their own plans.

## Execution

Branch `chore/WI-044-resolve-open-findings`, cut from `main` at `7e5f3c6`.

### F-001 — merged-status fires on a branch that landed nothing · **fixed**

The finding proposed *"is an ancestor **and** has at least one commit of its own"*. Implemented as
`base..branch > 0`, it was wrong, and the probe caught it: **after any merge a branch is zero commits
ahead**, so that version never fires again — it deletes the gate while looking like a fix. Had the
test only covered the false-positive direction it would have shipped.

What distinguishes them is the merge commit. This repo merges `--no-ff`, so a branch that landed
work is some merge commit's *second* parent; one that landed nothing never is. Verified three ways
in a throwaway repo — branch cut with no commits (silent), same with `main` advancing underneath
(silent), branch with a commit then merged (fires). **Known gap, stated in the code:** a
fast-forward merge that keeps the branch is read as having landed nothing. That is a workflow this
repo does not use, and it is the direction to be wrong in.

### F-003 — nothing verifies the vendored design-system shas · **fixed**

New [`site/scripts/check-vendored.mjs`](../../../site/scripts/check-vendored.mjs) re-hashes all 33
files listed in `VENDORED.md`; registered as `site-vendored-unedited`, a repo-owned `command` gate
placed **outside** every managed block so `upgrade` cannot rewrite it. The hashing is duplicated
from the generator rather than imported, deliberately: a checker sharing the producer's hash cannot
catch the producer hashing wrongly, which is the mistake [WI-042](WI-042-link-line-references.md)
was opened for.

### F-007 — `backticked_paths` configured and unimplemented · **fixed**

The finding offered two options and called the collapse *"smaller and honest"*. I implemented the
check instead, because `gates-paths-exist`'s provenance is a **distinct measured incident** —
hexguard's instruction files naming paths across 105 packages — that the markdown-link scan does not
cover, and collapsing would have deleted it.

First run: **ten findings on this repo, all ten wrong** — slash commands (`/work-item`), branch
placeholders (`feature/WI-###-slug`), illustrative directories (`.cursor/rules/`), bare filenames
whose anchor is unknowable. Narrowed to the incident's actual shape — contains `/`, has a file
extension, resolved against both the repo root and the citing file's directory — which takes it to
**zero**, and it still catches a genuinely stale path.

The table is now one entry per gate id, so the two gates no longer run the identical scan and
report everything twice. It fired immediately on real content: the `why` text of the gate added for
F-003, in this same branch, cited `src/design-system/VENDORED.md` when the file is at
`site/src/design-system/VENDORED.md`.

### F-012 — ledger questions printed from `check` · **fixed**

Moved to `doctor`. The ADR does not merely name the command, it gives the reason —
[ADR-0005](../../decisions/ADR-0005-self-instrumentation.md): *"They must be pull (`doctor`), never
push; no output during normal runs."* `check` **is** the normal run, so tier B was pushing, inside
the feature that forbade pushing. The README's example also named `check-findings-register`, which
is not a gate id here; now `audit-output-is-rows`, which is.

### F-013 — `astro dev` serves no stylesheet on Windows · **fixed**

`fileURLToPath(new URL("../", import.meta.url))` instead of `.pathname`. Verified in the browser:
3 stylesheets load, `h1` computes to Barlow 46px on the themed background, **0 console errors** —
against 49 consecutive 403s before.

### F-006, F-011 — **promoted**

Both need a design change rather than a fix, and both are sized wrong for a register row:

- **F-006** → [WI-045](../items/WI-045-run-gate-self-tests.md). 27 fixtures are runnable text; the rest are
  ~8 bespoke structured shapes (`{workflows, similarity}`, `{worktrees}`, `{values}`,
  `{matching_files}`), each needing its own synthesizer. A runner covering only the easy half would
  reproduce the finding's own complaint one level down.
- **F-011** → [WI-046](../items/WI-046-console-provenance.md). The `Console` component renders the literal
  label `real output · <command>` and is **vendored** — the directory is generated, now sha-gated
  by F-003's own fix, and the export it comes from is gitignored and not in this checkout. So the
  cheap interim the finding suggested (rename the attribute) is not available from here.

### Deviations from the plan

None of substance. Two fixes were harder than the finding predicted (F-001's discriminator, F-007's
narrowing) and both are recorded above with what the measurement changed.

## Review

Verified 2026-08-16 on `chore/WI-044-resolve-open-findings`.

**1 · Open table empty, every row closed with a reason.** Seven rows moved: five `fixed`, two
`promoted`. Checked by reading [FINDINGS.md](../FINDINGS.md) after the change;
`findings-disposition-has-reason` passes over all of them, which is the mechanical half.

**2 · Both directions asserted per fix.**

| Finding | Assertion |
| --- | --- |
| F-001 | Unit test: branch that landed nothing is silent; branch that landed work and kept a stale status fires |
| F-003 | The gate passes on 33 matching files; a mismatch exits 1 with the pair printed |
| F-007 | Unit test over five spans, exactly one reported; two self-test fixtures, `pass` and `fail` |
| F-012 | `check` output contains no `Ledger questions`; `doctor` output does |
| F-013 | Browser: 3 stylesheets, computed font and background correct, 0 console errors |

**3 · Promoted findings name their item and scope.** F-006 → WI-045, F-011 → WI-046, both with the
reason the fix is a design change stated in the row itself. **Met.**

**4 · Gates, tests, site.** `rungs check` **21 pass · 0 fail · 0 unimplemented · 0 error** (20 + the
new vendored gate). `npm test` **14 pass, 0 fail**, up from 12. Site builds; link check clean.

### What this did not close

[F-015](../FINDINGS.md), opened here rather than resolved: `rungs backlog archive` is documented in
[backlog/README.md §8](../README.md) as the way to archive finished items, and the command does not
exist. 39 `done` items sit in `items/` and `archive/` holds only its README. That is the same class
as F-012 — a surface promising behaviour the code does not have — and it is why this item did not
"mark items closed" by hand.