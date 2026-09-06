---
id: WI-091
title: Stop the derived-index freshness rule counting the template's placeholder row as a record
type: chore
status: done
branch: feature/WI-091-index-placeholder-rows
created: 2026-09-06
updated: 2026-09-06
related: [WI-090, WI-087, WI-064]
epic: WI-085
children: []
---

## Proposal (rationale)

The disposable Arena Lab canary run by [WI-090](WI-090-integrated-consumer-verification.md) on
2026-09-06 (producer `675780c7`, consumer `f4ede793`) failed one gate on an untouched, freshly
scaffolded consumer: `adr-index-current` reported that `docs/adr/README.md` "lists 1 row(s) for 0
source file(s)". The one row is `| — | *none yet* | | |`, the placeholder the `adr` module's own
template ships. The `file-index` rule [WI-087](WI-087-executable-self-test-coverage.md)
implemented counts every pipe line that is not a separator as a data row, so every consumer with the
module installed and no decision yet fails its first `check`, through the installed CLI and after
ejection alike. The producer never saw it: its own repository has eleven decision records, and the
fresh-scaffold test asserts only the findings gate.

## Decision

`accepted` — 2026-09-06 under WI-085, as work discovered by WI-090's canary rather than a widening of
WI-090. A candidate that fails a fresh consumer's untouched scaffold cannot be handed to the release
flow; the fix is small and bounded.

## Plan

### Requirements

- A `file-index` block whose only row is the `—` placeholder counts zero rows.
- `render` on zero sources emits the placeholder row rather than a header alone, so an untouched
  scaffold and its first render agree byte for byte, and a second render changes nothing.
- The shipped `adr` template block is exactly what `render` writes for zero sources.
- A self-test fixture covers the placeholder-only, zero-source pass direction.

### Impacts

- `src/engines2.ts` (`renderFreshness`), `src/render.ts` (`renderDerivedBlocks`), `src/selftest.ts`
  (index builder), `modules/adr/files/{{path}}/README.md`, `modules/adr/gates/adr.toml`,
  `modules/adr/module.toml` (1.2.0 → 1.2.1), `test/core.test.js`, the site claims snapshot if it
  records module versions.

### Approach

Exclude rows whose first cell is `—` from the count; emit that row from `render` when there are no
sources; make the template match. Alternatives: teach the template to ship an empty table (loses the
readable "none yet" line every consumer sees first) or special-case `*none yet*` text (fragile; the
first-cell dash is the convention the board and findings register already use).

### Acceptance criteria / tests

1. The engine test seeds a placeholder-only index beside zero records and asserts `pass`; a
   placeholder beside one record still fails; `render` on zero sources writes the placeholder and a
   second render writes nothing.
2. The new `adr-index-current` fixture (`placeholder = true, source_files = 0`, expect `pass`)
   executes in the inventory with no unrun or error outcome.
3. A fresh `init tracked` scaffold passes `check` with no `render` in between.
4. The serial suite, `rungs check`, and the site claims check pass.

### Out of scope

- Any other gate the canary exercised; the eject summary wording that still says only `check`
  survives ejection is WI-092, opened separately from the same canary.
- Re-running the canary; WI-090 does that against the tree that includes this fix.

## Execution

Branch `feature/WI-091-index-placeholder-rows` from `675780c7`, 2026-09-06. One commit. As planned,
with one addition forced by the repository's own gate: `module-commands-exist` refused the template
block once it carried `render`'s generated comment, because that comment named bare `rungs render`
inside a module file. Rather than exempt it, `render` now names the consumer's own command
(`node .ai/rungs.mjs render`) in the comment it writes, and this repository's
`docs/decisions/README.md` was re-rendered so its comment matches. Also found on the way and recorded
as a finding, not fixed here: `check full` means tier `full` through the ejected launcher and path
`full` through the CLI (F-063).

## Review

1. Engine test: `node --test --test-name-pattern '^the table rules the fixtures exposed' test/core.test.js`
   passes (1/1, 2026-09-06). It seeds the real template with `{{path}}`/`{{id_prefix}}` substituted,
   asserts `pass` beside zero records, asserts `renderDerivedBlocks` writes nothing, adds one record
   and asserts the fail message `lists 0 row(s) for 1 source file(s)`, renders, asserts `pass`, removes
   the record, and asserts the rendered index is the template again.
2. Inventory (`node .scratch/fixture-inventory.mjs`, 2026-09-06): 163 fixtures, 161 ok, 2 unrun (the
   two named `design-mirror-not-edited` fixtures, F-062), 0 mismatch, 0 error — the two new fixtures
   execute.
3. Fresh scaffold: `git init` + `node src/cli.ts init <dir> tracked` + `node src/cli.ts check <dir>` with
   no render in between reports `pass adr-index-current · 1 examined` (2026-09-06). The scaffold's one
   failure was `backlog-merged-status` because that scratch repository had no `main` yet — the
   producer's fresh-scaffold test commits first and is unchanged.
4. Serial suite `NODE_OPTIONS=--max-old-space-size=2048 node --test --test-concurrency=1 test/*.test.js`:
   152 tests, 149 pass, 0 fail, 3 skipped, 179 s (2026-09-06). `node src/cli.ts check`: 31 pass.
   Claims snapshot regenerated: 31 gates (+1 hook), run 31 pass 0 fail.
