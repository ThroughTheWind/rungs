# Findings

Things noticed while doing something else. **A finding is the observation; a work item is the
decision.** Recording one must cost almost nothing, or it will not happen — so a finding is a
**row**, not a file. Items are files; findings are rows. The asymmetry is deliberate.

<!-- NEXT-ID: F-017 -->

## Open

| Id | Sev | Pri | What | Evidence | When to act | How to fix |
| --- | --- | --- | --- | --- | --- | --- |
| F-016 | high | now | `rungs upgrade --apply` does not rewrite `.ai/gates.toml`. A module version that adds, removes or renames a gate upgrades its **files** and leaves the **registry** at the old version, so the new gate never runs and the user is told the upgrade succeeded | Found 2026-08-16 during WI-050. Added `backlog-board-reconciled` and bumped `backlog` 1.0.0 → 1.1.0; `rungs upgrade --apply` reported `backlog 1.0.0 → 1.1.0  4 diverged · 4 current` and `.ai/gates.toml` still read `# rungs:begin backlog@1.0.0` with three gates. `grep -c backlog-board-reconciled .ai/gates.toml` → 0, and `rungs check` still reported 21 gates. `rungs add backlog` re-registered it and the count went to 22 | Now. Every consumer repo that upgrades a module silently keeps the old gate set, which is the failure mode the whole `unimplemented gates are not passes` rule exists to prevent — arriving through the upgrade path instead of the registry one. It also means the WI-050 gate will not reach any existing install by upgrading | `applyUpgrade` should call `registerGates` for each upgraded module, as `add` does. Check the reverse too: a gate **removed** from a manifest should leave the registry, or an upgraded repo keeps running a gate the module no longer ships |

## Closed — 2026-08-16 by [WI-047](items/WI-047-backlog-archive-command.md)

| Id | What | Disposition | Reason |
| --- | --- | --- | --- |
| F-015 | `rungs backlog archive` was named in three files shipped into **every consumer repo** — two of them saying "never by hand" — and the command did not exist. 39 `done` items sat in `items/`; `archive/` held only its README | promoted | [WI-047](items/WI-047-backlog-archive-command.md), 2026-08-16, implemented the same day. Implemented rather than documented away: rewriting §8 to describe a manual move would delete a capability from every scaffolded repo at once to make one sentence true. Links are resolved from the citing file's directory rather than pattern-matched, because the same target appears as `items/X.md`, `../items/X.md` and `X.md`. Trialled on two clones first, which caught a doubled destination path and a version that wanted to rewrite 334 links across 58 files including module templates — a repo-wide reflow disguised as an archive. Final run: 39 items, 135 links, 37 files; `rungs check` 21 pass and the site's 1,721 links still 0 broken |


## Closed — 2026-08-16 by [WI-044](archive/WI-044-resolve-open-findings.md)

| Id | What | Disposition | Reason |
| --- | --- | --- | --- |
| F-001 | `backlog-merged-status` fired on a branch cut but not yet committed to — trivially an ancestor of `main`, so it read as merged. Hit four times in two days, always on the happy path between `git switch -c` and the first commit | fixed | Merged now means *is an ancestor **and** is some merge commit's second parent*. **The fix this row proposed was wrong and measuring it is what caught that:** implemented as "has commits ahead of base" it never fires again, because after any merge a branch is zero ahead — it deletes the gate while looking like a fix. Verified three ways in a throwaway repo (cut-and-silent, cut-with-`main`-advancing-and-silent, merged-with-work-and-fires) plus a unit test. Known gap stated in the code: a fast-forward merge that keeps the branch reads as having landed nothing |
| F-003 | Nothing verified the shas `site/src/design-system/VENDORED.md` records, so a directory saying "do not edit" could be edited and its own provenance line would not say so | fixed | [`site/scripts/check-vendored.mjs`](../../site/scripts/check-vendored.mjs) re-hashes all 33 listed files; registered as the `site-vendored-unedited` command gate, placed outside every managed block so `upgrade` cannot rewrite it. The hash function is duplicated from the generator rather than imported — a checker sharing the producer's hashing cannot catch the producer hashing wrongly, which is the mistake WI-042 was opened for. All 33 currently match |
| F-006 | Gate self-tests are declared and never executed. `gateMeta` string-matches the table to confirm both `expect` blocks exist; nothing runs a fixture | promoted | [WI-045](items/WI-045-run-gate-self-tests.md), 2026-08-16. Not fixed here because it is two problems: 27 fixtures are runnable text, and the rest are ~8 bespoke structured shapes (`{workflows, similarity}`, `{worktrees}`, `{values}`, `{matching_files}`) each needing its own synthesizer. A runner covering only the text half would report a passing self-test suite while most fixtures stayed unrun — this finding again, one level down |
| F-007 | `backticked_paths` was named in `link_integrity.check` and implemented nowhere, so `gates-paths-exist` silently ran the same markdown-link scan as `gates-links-resolve` and reported every finding twice | fixed | Implemented, **not** collapsed. This row called the collapse "smaller and honest"; the collapse would also have deleted `gates-paths-exist`'s distinct provenance — hexguard's instruction files naming paths across 105 packages — which the link scan does not cover. First run produced **ten findings on this repo, all ten false** (slash commands, `WI-###` placeholders, illustrative directories, bare filenames); narrowed to the incident's shape — contains `/`, has a file extension, resolved against both repo root and the citing file's directory — which takes it to zero while still catching a real stale path. It fired immediately on real content: F-003's own gate description, in the same branch, cited `src/design-system/VENDORED.md` for a file at `site/src/design-system/VENDORED.md`. The table is now one entry per gate id, so the double-reporting is gone at source |
| F-011 | The `Console` component renders `real output · <command>` for text nothing verifies. Two of the three landing-page blocks were fabricated | promoted | [WI-046](items/WI-046-console-provenance.md), 2026-08-16. The interim this row proposed — rename `source` — turns out not to be available: `site/src/design-system/` is vendored, says "do not edit", is now sha-gated by F-003's own fix, and its export is gitignored and absent from this checkout. So any fix is a re-vendor or a call-site mechanism, which is a design decision rather than a rename |
| F-012 | README and ADR-0005 Tier B say `doctor` quotes a never-fired gate's incident; the implementation printed it from `check` | fixed | Moved to `doctor`. The ADR does not merely name the command, it gives the reason — *"They must be pull (`doctor`), never push; no output during normal runs"* — and `check` **is** the normal run, so Tier B was pushing inside the feature that forbade pushing. Verified: `check` output contains no `Ledger questions`, `doctor` output does. The README's example also named `check-findings-register`, which is not a gate id here; now `audit-output-is-rows`, which is |
| F-013 | `astro dev` served no stylesheet on Windows — 49 consecutive 403s on one page load, so the site was unstyled and could not be reviewed locally | fixed | `fileURLToPath(new URL("../", import.meta.url))` replaces `.pathname`, which on Windows returns `/C:/…` and resolved to `C:/C:/…`. Verified in the browser after the change: 3 stylesheets load, `h1` computes to Barlow 46px on the themed background, 0 console errors |

## Closed — earlier

| Id | What | Disposition | Reason |
| --- | --- | --- | --- |
| F-014 | [ADR-0004](../decisions/ADR-0004-adoption-detection.md) state 5 — *"`add` prints the comparison and stops"* — had no implementation. `paradigm` was read by `doctor` and by nothing else, so `add` wrote straight over a repo that solves the problem another way. Not new to WI-039: the `milestones` paradigm had the same hole since the CLI shipped, so **no paradigm had ever stopped an install** | promoted | [WI-043](archive/WI-043-add-honours-paradigm.md), 2026-08-16, merged the same day. It took the whole mechanism — refuse by default with the note and `compare` printed, `--confirm-paradigm` to override, refusal propagating along dependency edges (`audit → findings → backlog`), and the refusal applying under `--dry-run`, which `--confirm-threshold` beside it does not do. It did **not** take that threshold asymmetry: `--confirm-threshold` still installs under `--dry-run`, which looks like the same bug and is unexamined |
| F-008 | F-004 was marked fixed on `main`, but its site-schema fix existed only on the unmerged `feature/site-logo-and-icons` branch, so builds from `main` still rejected backlog lifecycle statuses | fixed | Commit `655eacb` cherry-picked the existing fix `4acb73d` onto `main` on 2026-08-15. `npm run build && npm run check` then built 53 routes and checked 469 internal links with 0 broken on `main`; after WI-010 rebased, the same commands built 55 routes and checked 497 internal links with 0 broken. F-004's disposition is now true in git. |
| F-002 | `npm test` pointed at a missing test directory and could not verify the CLI | fixed | WI-029 added focused tests for substitution, parameter resolution, managed blocks, marker syntax, and the module manifest audit under `test/core.test.js`, and changed the script to execute `test/*.test.js`; `npm test` now passes 5/5. |
| F-005 | A markdown file containing any `{{token}}` had *every* link exempted from `gates-links-resolve` and `gates-paths-exist` — 16 non-excluded files, eight of which ship to consumer repos | promoted | [WI-008](archive/WI-008-link-gate-checks-every-file.md), 2026-08-15. The item took the full mechanism — move the token test from the file to the individual link, and stop matching links quoted inside code spans, which the file-level skip had been masking. It did **not** take the two things the investigation surfaced alongside: self-tests being declared but never run (F-006) and `backticked_paths` being configured but unimplemented (F-007) |
| F-004 | The wiki's content schema accepted only the four ADR statuses, so the first backlog item to reach `status: done` failed the whole site build — `astro build` aborted on `WI-001` with *"Invalid enum value … received 'done'"* (2026-08-15). Backlog items joined the wiki after the enum was written; marking one done was enough | fixed | `site/src/content.config.ts` now enumerates the union of both vocabularies — the ADR statuses plus the lifecycle declared in `docs/backlog/TEMPLATE.md` (`deferred`, `planned`, `in_progress`, `review`, `done`). Left as an enum rather than `z.string()` so a typo'd status still fails the build. Found while re-vendoring the design system, on a build that was already broken at `a006b5c` |
| F-009 | The site lock resolved Astro and transitive Sharp/esbuild versions covered by three advisories | fixed | WI-034 upgraded Astro to `7.2.2` with compatible `@astrojs/markdown-remark`, `@astrojs/react`, and `@astrojs/check` integrations, refreshed the lock, ran `npm audit fix`, and verified `npm audit` reports 0 vulnerabilities plus a passing build/check. |
| F-010 | Astro's content loader warned that duplicate collection ids were being overwritten | fixed | WI-034 moved the wiki to Astro 7's unified markdown processor and made the source-map root resolve from the site package cwd so bundled builds read the repository corpus. The current build emits no duplicate-id warnings; `npm run check` reports 0 diagnostics and 1,203 links with 0 broken. |

---

## Recording one

Use `/record-finding`, or add a row directly. Required:

- **Sev** — `high` (wrong output, data loss, security) · `medium` (wrong behaviour, contained) ·
  `low` (cost, clarity, tidiness)
- **Pri** — `now` · `next` · `someday`. Severity is about the problem; priority is about us.
- **Evidence** — a path, a command, a count. **A finding with no evidence is a hunch**, and the
  next reader cannot tell the difference. If you cannot produce evidence, say so in the row.
- **When to act** — the trigger, not a date. *"Before the next release"*, *"if this recurs"*.
- **How to fix** — enough that someone else could, or an explicit "unknown".

## Closing one

Every finding leaves the Open table by one of three dispositions, and **each carries a written
reason**:

| Disposition | Means | Reason must say |
| --- | --- | --- |
| **promoted** | It became a work item | Which item, and what scope it took |
| **fixed** | It was resolved directly | What changed, and where |
| **dismissed** | It is not a problem, or not one worth solving | *Why not* — this is the one people skip, and it is the one that stops the same observation being recorded again next month |

`rungs check` refuses a closed finding with no reason.

## What this register does not do

- It does not prioritise. A `now` priority is a claim by whoever typed it.
- It does not prove anything is fixed. `fixed` means someone said so.
- It counts what was **recorded**, not what was noticed. A quiet register and an unobserved repo
  look identical from here.
