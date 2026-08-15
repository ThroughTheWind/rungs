---
id: WI-008
title: Stop a template token switching off link checking for a whole file
type: chore
status: done
branch: feature/WI-008-link-gate-checks-every-file
created: 2026-08-15
updated: 2026-08-15
related: [WI-006, WI-007]
epic:
children: []
---

## Proposal (rationale)

Promoted from **F-005**. `linkIntegrity` abandons a file on its first `{{token}}`
([`src/engines.ts:155`](../../../src/engines.ts)):

```js
if (/\{\{[a-z_.]+\}\}/.test(text)) continue;
```

One token anywhere in a document exempts **every link in it** from both `gates-links-resolve` and
`gates-paths-exist`. The documents most likely to discuss file paths are the ones explaining
templating, so the exemption lands precisely where link checking is most needed.

**Measured 2026-08-15: 16 non-excluded files are currently exempt**, including
[`modules/README.md`](../../../modules/README.md),
[ADR-0003](../../decisions/ADR-0003-module-definition-format.md),
[`docs/design/parameters.md`](../../design/parameters.md), and eight skills and rules that ship into
consumer repos. The gate reports `72 examined` and green; with the exemption removed it examines
**88**.

The exemption is invisible. A skipped file and a clean file produce identical output, so the gate
reads as covering a corpus it is not.

**How it was found is the argument for fixing it.** Two items in the same directory carried
identically-shaped broken links. WI-007's was caught; WI-006's was not, because WI-006's item
discusses `{{repo.dirname}}`. It went further than that: editing WI-007's item to *describe* this
bug introduced the word `{{token}}` into it, which switched off its own link checking and hid a
second broken link that had been there all along. The bug concealed itself while being written up.

**The heuristic is probably unnecessary.** Its own comment says it exists because
`modules/*/fragments/AGENTS.md` was reported for `{{path}}/README.md` — but `link_integrity.exclude`
already excludes `modules/*/fragments/**` and `modules/*/files/**` **by path**. The case that
motivated it is covered twice.

## Decision

`accepted` — 2026-08-15. Severity high in the register, and it ships in the `gates` module, so every
scaffolded repo currently believes its links are checked.

## Plan

### Requirements

- A `{{token}}` suppresses **only the link that contains it**, never its neighbours or its file.
- A link written inside an inline code span is prose quoting a link, and is not checked.
- `gates-links-resolve` and `gates-paths-exist` examine every non-excluded markdown file.
- The two links currently hidden in the corpus are either fixed or shown to be false positives.
- `rungs check` → 20 pass, 0 fail, with `examined` up from 72 to 88.

### Impacts

- [`src/engines.ts`](../../../src/engines.ts) `linkIntegrity` — the file-level skip and the link loop.
- Every scaffolded repo, on upgrade. This makes a shipped gate stricter, so a consumer repo that was
  quietly passing may start failing — correctly, and that is the point.
- `modules/gates/gates/structural.toml` — a self-test for the newly covered case.
- **No ADR.** Criterion 5: the code states the rule more precisely than prose could.

### Approach

Move the token test from the file to the link, and strip inline code spans before scanning.

Both are needed together. Removing the file skip alone makes the gate fire on
`docs/backlog/items/WI-007-…`, which *quotes* a broken link inside backticks as an example — a
false positive, and F-001's lesson is that a gate crying wolf on the happy path is one people learn
to ignore. A code span is a quotation, not a link.

Rejected: **`path-ok:` on the affected files.** That exemption is file-level too, so it would trade
one blanket exemption for another, and it is meant for a deliberate stale path with a stated reason
— not for the checker mis-reading a code span.

Rejected: **deleting the token test entirely.** The redundancy argument is strong but not proven for
every file, and a per-link skip costs one line while removing the need to be sure.

### Acceptance criteria / tests

1. `examined` rises from 72 to 88 on this repo for both link gates.
2. A broken link in a file containing `{{token}}` is **caught** — verified by re-breaking the exact
   WI-006 link that F-005 was filed on.
3. A link inside backticks is **not** reported, so WI-007's quoted example stays clean.
4. A link whose own text contains `{{…}}` is not reported.
5. `rungs check` → 20 pass, 0 fail; the site's independent `check:links` still reports 0 broken.
6. `structural.toml` gains a self-test for the token case.

### Out of scope

- **Self-tests are declared but never executed.** `gateMeta` checks only that a `[[self_test]]`
  block exists for each direction; nothing runs the `input` fixtures. So criterion 6 adds a
  declaration, not an assertion — recorded as its own finding rather than fixed here, because
  building a fixture runner is a different piece of work.
- **`backticked_paths` is listed in the table's `check` array and is not implemented.**
  `gates-paths-exist` runs the same markdown-link scan as `gates-links-resolve`. A separate finding.
- **Fixing links this newly surfaces in consumer repos.** Not ours to fix.

## Execution

Branch `feature/WI-008-link-gate-checks-every-file`, cut from `main` 2026-08-15.

- [`src/engines.ts`](../../../src/engines.ts) `linkIntegrity` — the token test moved from the file
  to the individual link, and inline code spans are blanked before scanning. Blanked with spaces
  rather than removed, so every offset after a code span is unchanged and the reported link text
  still matches what the author sees.
- `modules/gates/gates/structural.toml` — two self-tests fixing the boundary: a broken link **is**
  caught with a token elsewhere in the file, and a link that is itself a template is not.

**The corpus contained exactly one hidden defect**, and it was not a broken path. `FINDINGS.md`
quoted `gates-links-resolve`'s own fixture — `See [the plan](./does-not-exist.md).` — in *italics*,
which is a real markdown link that does not resolve. Fixed by moving the quotation into a code span,
which is the correct authoring, rather than by widening the stripper to emphasis: a link inside
emphasis is an ordinary link and should stay checked.

**Deviation from the plan, in the numbers.** The Proposal predicted `examined` would go 72 → 88.
It is **89**, because WI-008's own item file was added to the corpus between measuring and fixing.
Recorded rather than amended: the prediction was made against a corpus that no longer exists, and
89 is what the check reports today.

**F-001 recurred**, fifth occurrence.

## Review

Checked 2026-08-15.

1. **Pass, with the count corrected.** Both link gates examine **89** files, up from 72 — 16 files
   were exempt, plus this item's own file. See the deviation above for why not 88.
2. **Pass, and this is the criterion that matters.** Re-breaking the exact link F-005 was filed on —
   `](../design/parameters.md)` in WI-006's item, a file dense with `{{tokens}}` — now fails both
   gates by name. It reported green before this change.
3. **Pass.** WI-007's item quotes a broken link inside backticks as an example and is not reported.
4. **Pass.** A probe link of `[readme]({{path}}/README.md)` beside a resolvable one was not
   reported; the probe was reverted with `git checkout`, verified by diff.
5. **Pass.** `rungs check` → 20 pass, 0 fail once the branch carried a commit. The site's
   independent checker → 44 routes, 491 links, 0 broken.
6. **Pass as a declaration, not as an assertion.** Two self-tests added and
   `gates-self-tests-both-directions` is green over 21 gates — but F-006 records that nothing
   executes a fixture, so these assert nothing until that lands. Stated plainly here because a
   self-test that reads as verification and is inert is the same failure this item is about.
