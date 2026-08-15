# Findings

Things noticed while doing something else. **A finding is the observation; a work item is the
decision.** Recording one must cost almost nothing, or it will not happen — so a finding is a
**row**, not a file. Items are files; findings are rows. The asymmetry is deliberate.

<!-- NEXT-ID: F-006 -->

## Open

| Id | Sev | Pri | What | Evidence | When to act | How to fix |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 | medium | next | `backlog-merged-status` fires on a branch that has been cut but carries no commits yet. Its tip is still `main`'s tip, so it is trivially an ancestor and reads as merged | Reproduced 2026-08-15 during WI-001: `git switch -c feature/WI-001-… main`, set status `in_progress`, `rungs check` → `19 pass · 1 fail`, *"branch … is merged but status is 'in_progress'"*. Cleared on the first commit | Now — every item worked through `/work-item` hits it between `git switch -c` and the first commit, and a gate that cries wolf on the happy path is one people learn to ignore | Treat a branch with **zero commits ahead of `main`** as not-yet-started rather than merged: the merged test should be "is an ancestor **and** has at least one commit of its own" |
| F-003 | medium | next | Nothing verifies the shas `site/src/design-system/VENDORED.md` records, so the tracked design-system copy can be hand-edited and its own provenance line will not say so | Found 2026-08-15 re-vendoring the new export: `npm run vendor` changed exactly one tracked file, `components/core/Console.d.ts` (`npx @rungs/cli check` → `npx rungs check`). `VENDORED.md` at `a006b5c` already listed that file as `703ccb58f7e1` — the sha of the *new* text — while the committed file hashed to `8c3fddb45c14`. The tracked copy had been edited after generation, and the record that disproved it sat in the same commit, unread | Next time `scripts/vendor-design-system.mjs` is touched, or before the first outside contributor — the directory says "do not edit" and nothing enforces it | A gate that re-hashes every file listed in `VENDORED.md` and fails on mismatch. The shas are already written; nobody re-reads a sha by hand, which is the whole argument for the gate |
| F-005 | high | now | `gates-links-resolve` passes on a broken relative markdown link. The gate whose entire job is link integrity does not catch the most common way a link breaks — a wrong number of `../` | Reproduced 2026-08-15 during WI-006: pointed `docs/backlog/items/WI-006-….md` at `](../design/parameters.md)`, which resolves to the non-existent `docs/backlog/design/parameters.md`. `rungs check` → **20 pass · 0 fail**, `gates-links-resolve` green over 71 files. The site's independent `check:links` caught the same link immediately: *"→ /wiki/backlog/design/parameters/ (no such route)"*. Restored, then re-broken deliberately to confirm it was not a caching artefact | Now. This gate ships in the `gates` module to every scaffolded repo, so every consumer believes their links are checked and they are not — and it is one of the two gates that made `gates` a rung-1 module | Unknown without reading `link_integrity`'s `relative_markdown_links` check. Start by asserting the failing case in the gate's own self-test, which `gates-self-tests-both-directions` requires and which would have caught this at authoring time |
| F-002 | low | next | `npm test` fails: `package.json` declares `node --test test/` and no `test/` directory exists | `npm test` → *"Could not find 'test/'"*, 2026-08-15. Nine commands and ~2,900 lines of `src/` have no JS test suite; verification rests on gate self-tests | Before the next release, or the first contributor PR — a declared script that cannot run tells a contributor their environment is broken | Either add `test/` with cases for `substitute`/`resolveParams`/`mergeBlock`, or point the script at what actually verifies this repo (`node src/cli.ts check`) and say so |

## Closed

| Id | What | Disposition | Reason |
| --- | --- | --- | --- |
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
