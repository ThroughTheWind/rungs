---
id: WI-095
title: Make the large-value assertion rule mechanical and cap the test heap
type: chore
status: done
branch: feature/WI-095-guarded-large-assertions
created: 2026-09-06
updated: 2026-09-06
related: [WI-077, WI-085]
epic:
children: []
---

## Proposal (rationale)

F-059: on 2026-09-06 one `assert.equal` on a 186 KB artefact — a Buffer against a string — made the
test process build a character-level diff for 221 s and then throw `RangeError: Array buffer
allocation failed`; the host went down three times before the cause was read from the log. The
repair compared digests and left a comment at the two sites. CLAUDE.md's rule for a rule that was
read and broken anyway is *do not restate it — make it mechanical*, and nothing mechanical prevented
the next test from doing the same.

## Decision

`accepted` — 2026-09-06, at the user's request to tackle F-059 to F-063. Two mechanics, both cheap:
a guarded assert every test file must import, and a heap cap on the test script.

## Plan

### Requirements

- `test/assert.js` re-exports strict assert with equality methods that fail immediately, with a
  short message naming the digest form, when both operands are large (over 32 KB) and differ; equal
  operands of any size and small operands behave exactly as before.
- Every `test/*.test.js` imports assert from `./assert.js`; a gate refuses a direct `node:assert`
  import and a test script without `--max-old-space-size`.
- `npm test` runs with a heap cap and serial files, the form the host survived.

### Impacts

- `test/assert.js` (new), the four test files' import line, `scripts/check-test-assert-guard.mjs`
  (new), `.ai/gates.toml` (one adopted command gate), `package.json` (`test` script), README gate
  count, site claims snapshot, `test/core.test.js` (a test of the guard).

### Approach

Wrap, do not lint: a regex over test sources cannot know a value's size, and a rule that flags every
`readFileSync` comparison would push fifty small, readable assertions to digests for no gain. The
guard fires only on the failing large case — the one that cost the machine. Alternative: a
`--test-concurrency` and heap cap alone — rejected, that bounds the damage but still lets one test
run for minutes.

### Acceptance criteria / tests

1. A core test proves the guard: two differing 64 KB strings fail in under a second with a message
   naming digests; two equal 64 KB strings pass; a small mismatch still reports the ordinary diff.
2. `node scripts/check-test-assert-guard.mjs` passes on the tree and fails when a test file imports
   `node:assert` or the heap cap is removed (asserted in the same core test against copies).
3. The heap cap reaches the test worker processes, measured by a child printing its heap limit.
4. Serial suite and `rungs check` (now 32 gates) pass.

### Out of scope

- Refactoring existing small assertions to digests; nothing else deferred.

## Execution

Branch `feature/WI-095-guarded-large-assertions` from `78051584`, 2026-09-06. One deviation from the
plan's wording: the guard covers only the four positive equality forms. The first draft also wrapped
`notEqual` and friends, and its own test caught it — a negative assertion *fails* when the operands
are equal, which is the cheap case, and refusing differing operands there would have broken a
correct `assert.notEqual` on two large values. Heap-cap inheritance was measured before relying on
it: a child test file printed a 4,144 MB limit by default and 2,096 MB under
`node --max-old-space-size=2048 --test`.

## Review

1. `node --test --test-name-pattern '^the guarded assert fails fast' test/core.test.js`: 1/1
   (2026-09-06) — two differing 64 KB strings refuse in under a second naming digests and F-059, a
   Buffer against a string names the type pair, equal 64 KB strings and buffers pass, a small
   mismatch keeps the ordinary diff, `notEqual` on differing large values passes.
2. The same test copies `scripts/check-test-assert-guard.mjs` beside a fixture tree: clean passes
   naming 1 file; a `node:assert/strict` import fails by file; a test script without the cap fails.
3. Heap cap inheritance: a scratch test file printed `HEAP_LIMIT_MB 4144` under `node --test` and
   `2096` under `node --max-old-space-size=2048 --test` (2026-09-06).
4. `npm test` (now `node --max-old-space-size=2048 --test --test-concurrency=1 test/*.test.js`):
   155 tests, 152 pass, 0 fail, 3 skipped, 158 s. `node src/cli.ts check`: 32 pass; claims snapshot
   regenerated with 32 gates.
