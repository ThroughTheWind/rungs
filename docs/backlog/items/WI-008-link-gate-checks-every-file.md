---
id: WI-008
title: Stop a template token switching off link checking for a whole file
type: chore
status: proposed
branch:
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

*Not started.*

## Review

*Not started.*
