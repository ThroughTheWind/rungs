# Findings

Things noticed while doing something else. **A finding is the observation; a work item is the
decision.** Recording one must cost almost nothing, or it will not happen — so a finding is a
**row**, not a file. Items are files; findings are rows. The asymmetry is deliberate.

<!-- NEXT-ID: F-009 -->

## Open

| Id | Sev | Pri | What | Evidence | When to act | How to fix |
| --- | --- | --- | --- | --- | --- | --- |
| F-008 | medium | now | F-004 is marked fixed on `main`, but the site schema fix exists only on the unmerged `feature/site-logo-and-icons` branch, so every site build from `main` still fails on backlog lifecycle statuses | On 2026-08-15 from `feature/WI-010-framework-extraction-template`, which is based on `main`, `npm run build` in `site/` aborts on WI-001: *"Expected 'accepted' …, received 'done'"*. `git merge-base --is-ancestor 4acb73d main` is false; the same command against `feature/site-logo-and-icons` is true. `git show main:site/src/content.config.ts` contains only the four ADR statuses | Now — it blocks WI-010's required site-build verification and any release built from `main` | Land commit `4acb73d` (or its exact schema union) on `main`, run the site build there, and only then describe F-004/F-008 as fixed |
| F-001 | medium | next | `backlog-merged-status` fires on a branch that has been cut but carries no commits yet. Its tip is still `main`'s tip, so it is trivially an ancestor and reads as merged | Reproduced 2026-08-15 during WI-001: `git switch -c feature/WI-001-… main`, set status `in_progress`, `rungs check` → `19 pass · 1 fail`, *"branch … is merged but status is 'in_progress'"*. Cleared on the first commit | Now — every item worked through `/work-item` hits it between `git switch -c` and the first commit, and a gate that cries wolf on the happy path is one people learn to ignore | Treat a branch with **zero commits ahead of `main`** as not-yet-started rather than merged: the merged test should be "is an ancestor **and** has at least one commit of its own" |
| F-003 | medium | next | Nothing verifies the shas `site/src/design-system/VENDORED.md` records, so the tracked design-system copy can be hand-edited and its own provenance line will not say so | Found 2026-08-15 re-vendoring the new export: `npm run vendor` changed exactly one tracked file, `components/core/Console.d.ts` (`npx @rungs/cli check` → `npx rungs check`). `VENDORED.md` at `a006b5c` already listed that file as `703ccb58f7e1` — the sha of the *new* text — while the committed file hashed to `8c3fddb45c14`. The tracked copy had been edited after generation, and the record that disproved it sat in the same commit, unread | Next time `scripts/vendor-design-system.mjs` is touched, or before the first outside contributor — the directory says "do not edit" and nothing enforces it | A gate that re-hashes every file listed in `VENDORED.md` and fails on mismatch. The shas are already written; nobody re-reads a sha by hand, which is the whole argument for the gate |
| F-006 | medium | next | Gate self-tests are **declared but never executed**. `gateMeta` checks only that a `[[self_test]]` block exists for each direction; nothing runs the `input` fixture against the engine | [`src/engines.ts:200-226`](../../src/engines.ts) is the only code that reads `self_test`, and it does string matching on the table to confirm `expect = "pass"` and `expect = "fail"` blocks exist. Grepping the whole of `src/` for `self_test` returns that one site. So `gates-links-resolve`'s fixture `See [the plan](./does-not-exist.md).` has never been run — and had it been, it would have caught F-005 in 2026-08 | Next. It is the reason WI-008's self-test is a declaration rather than an assertion, and every gate in the repo has the same hole | A fixture runner: write each `input` to a temp file, run the named engine over it, assert the finding count matches `expect`. The fixtures already exist and are already in the right shape |
| F-007 | low | next | `backticked_paths` is listed in `link_integrity.check` and is not implemented. `gates-paths-exist` runs the identical markdown-link scan as `gates-links-resolve` | `grep -c "backticked" src/engines.ts src/engines2.ts` → 0 and 0, 2026-08-15. Both gates reported the same finding, on the same file, in the WI-008 experiment. The `path_hint` list in `structural.toml` configures a check nothing reads | Next, or when someone relies on a stale backticked path being caught. Two gate ids for one check also inflates the registry count | Either implement the check the table already configures, or collapse the two ids into one and delete `path_hint`. The second is smaller and honest; the first is what the table promises |
| F-002 | low | next | `npm test` fails: `package.json` declares `node --test test/` and no `test/` directory exists | `npm test` → *"Could not find 'test/'"*, 2026-08-15. Nine commands and ~2,900 lines of `src/` have no JS test suite; verification rests on gate self-tests | Before the next release, or the first contributor PR — a declared script that cannot run tells a contributor their environment is broken | Either add `test/` with cases for `substitute`/`resolveParams`/`mergeBlock`, or point the script at what actually verifies this repo (`node src/cli.ts check`) and say so |

## Closed

| Id | What | Disposition | Reason |
| --- | --- | --- | --- |
| F-005 | A markdown file containing any `{{token}}` had *every* link exempted from `gates-links-resolve` and `gates-paths-exist` — 16 non-excluded files, eight of which ship to consumer repos | promoted | [WI-008](items/WI-008-link-gate-checks-every-file.md), 2026-08-15. The item took the full mechanism — move the token test from the file to the individual link, and stop matching links quoted inside code spans, which the file-level skip had been masking. It did **not** take the two things the investigation surfaced alongside: self-tests being declared but never run (F-006) and `backticked_paths` being configured but unimplemented (F-007) |
| F-004 | The wiki's content schema accepted only the four ADR statuses, so the first backlog item to reach `status: done` failed the whole site build — `astro build` aborted on `WI-001` with *"Invalid enum value … received 'done'"* (2026-08-15). Backlog items joined the wiki after the enum was written; marking one done was enough | fixed | `site/src/content.config.ts` now enumerates the union of both vocabularies — the ADR statuses plus the lifecycle declared in `docs/backlog/TEMPLATE.md` (`deferred`, `planned`, `in_progress`, `review`, `done`). Left as an enum rather than `z.string()` so a typo'd status still fails the build. Found while re-vendoring the design system, on a build that was already broken at `a006b5c` |

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
