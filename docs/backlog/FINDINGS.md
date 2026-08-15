# Findings

Things noticed while doing something else. **A finding is the observation; a work item is the
decision.** Recording one must cost almost nothing, or it will not happen — so a finding is a
**row**, not a file. Items are files; findings are rows. The asymmetry is deliberate.

<!-- NEXT-ID: F-003 -->

## Open

| Id | Sev | Pri | What | Evidence | When to act | How to fix |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 | medium | next | `backlog-merged-status` fires on a branch that has been cut but carries no commits yet. Its tip is still `main`'s tip, so it is trivially an ancestor and reads as merged | Reproduced 2026-08-15 during WI-001: `git switch -c feature/WI-001-… main`, set status `in_progress`, `rungs check` → `19 pass · 1 fail`, *"branch … is merged but status is 'in_progress'"*. Cleared on the first commit | Now — every item worked through `/work-item` hits it between `git switch -c` and the first commit, and a gate that cries wolf on the happy path is one people learn to ignore | Treat a branch with **zero commits ahead of `main`** as not-yet-started rather than merged: the merged test should be "is an ancestor **and** has at least one commit of its own" |
| F-002 | low | next | `npm test` fails: `package.json` declares `node --test test/` and no `test/` directory exists | `npm test` → *"Could not find 'test/'"*, 2026-08-15. Nine commands and ~2,900 lines of `src/` have no JS test suite; verification rests on gate self-tests | Before the next release, or the first contributor PR — a declared script that cannot run tells a contributor their environment is broken | Either add `test/` with cases for `substitute`/`resolveParams`/`mergeBlock`, or point the script at what actually verifies this repo (`node src/cli.ts check`) and say so |

## Closed

| Id | What | Disposition | Reason |
| --- | --- | --- | --- |
| — | | | |

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
