# Existing promises — evidence matrix, 2026-09-06

**Authoritative for:** the executable evidence behind each consumer promise
[WI-085](../backlog/archive/WI-085-existing-promises-remediation.md) completes, and the baseline it
started from.
**Not authoritative for:** product behaviour (the code and its tests), decisions (ADRs), or the
assessment's proposals ([`tool-evaluation-2026-09-05.md`](tool-evaluation-2026-09-05.md)).

Every row names what was run and what it proved. A command is evidence only for the property it
tests, so where a check measures something adjacent to the claim, the gap is stated in the row.

## Baseline — reconciled 2026-09-06 before any implementation

| Fact | Value | How it was read |
| --- | --- | --- |
| Starting commit | `bb0bf2bbac5eac0c3fb4893a4d2f242f95817291` on `main` | `git rev-parse HEAD`, `git branch --show-current` |
| Remote state | `main` 2 commits ahead of `origin/main`, nothing pushed | `git status -sb` |
| Dirty state | one unrelated uncommitted edit: an F-058 row in `docs/backlog/FINDINGS.md` dated 2026-09-06, added outside this task; stashed as `stash@{0}` during the programme's commits and restored after, never committed by it | `git diff`, `git stash list` |
| Runtime | Node `v22.22.3`, npm `10.9.8`, Windows 11 (`win32`) | `node --version`, `npm --version` |
| Execution boundary | this checkout only; no push, tag, publish, or write to Arena Lab (`C:\Development\Repositories\arena-lab`, HEAD `e927d5feb845c9e678e914fed6e4563d4cb8bd96`, branch `feature/NEXT-002-unity-fixture-playback`, clean, launcher pinned `@rungs/cli@0.4.0`) | read-only `git` in that checkout |
| Gates | 30 pass · 0 fail · 0 unimplemented · 0 error; 45 fixtures unrun (10.5 s) | `node src/cli.ts check` |
| Module audit | 15 modules, audit clean | `node src/cli.ts modules` |
| F-029 attribution | 1 selected test, 1 pass | `node --test --test-name-pattern 'land distinguishes an inherited failure' test/core.test.js` — proves the inherited/introduced/unattributable regression passes; it does not re-verify `land` end to end |
| Fixture inventory, all fifteen modules | 147 fixtures: 71 ok · 69 unrun · 7 mismatch | `node .scratch/fixture-inventory.mjs` (scratch, gitignored); the 7 mismatches sit in modules this repo does not install and are invisible to its meta-gate |

## Promises

Status vocabulary: **implemented** (code merged), **verified** (the named command ran here with the
stated result), **released** (on npm — nothing in this programme is). A row is not verified until
its command column names an actual run.

| Promise | Authoritative claim | Implementation | Verification | Owning item | Status · remaining limitation |
| --- | --- | --- | --- | --- | --- |
| Ejected checks run without rungs | README § Design commitments: "`eject` is a promise, not a courtesy"; ADR-0002 § lock-in escape hatch | `src/lifecycle.ts` `eject` copies the esbuild bundle `dist/ejected-runner.mjs` (built by `scripts/build.mjs`, `src/ejected-runner.ts`), frozen JSON tables and raw module metadata into `.rungs/`, rewrites the registry block-wise, replaces `.ai/rungs.mjs` with a `process.execPath` forwarder; `src/check.ts` runs converted gates in-process in ejected mode; `src/ejected.ts` holds the roots | 2026-09-06 on the WI-077 branch: `node --test --test-concurrency=1 test/*.test.js` 144 tests · 141 pass · 0 fail · 3 skipped — includes the core regression (production vs ejected agreement gate by gate, tiers, ledger fields, idempotence, two refusals) and the packed journey (prefix renamed away, empty offline cache, direct exit 0, `check full` exit 0 with the meta-gate examining a non-zero count); `npm pack --dry-run --json` lists `dist/ejected-runner.mjs`; `node src/cli.ts check` 30 pass | [WI-077](../backlog/archive/WI-077-standalone-ejected-checks.md) | **implemented, verified locally** — not released; the exact-SHA CI matrix is pending because nothing was pushed; Node stays on `PATH` because repository command gates need it; the retained surface is `check` until WI-086 adds `hook` |
| Shell-safety hook reaches consumers | `modules/README.md` § Anatomy: emitted into supporting harnesses, degraded for the rest; `modules/instructions/module.toml` gate `instructions-shell-backticks`; ADR-0010 | `src/hook-engine.ts` (`shell-safety`), `src/hooks.ts` (`hookVerdict`, `registerHooks`, `preflightHooks`, `hookRenderEntries`), `rungs hook` in `src/cli.ts`, hook phase in `add`/`upgrade`, report rows in `add`/`render`, `hook` retained by the ejected launcher and runner | 2026-09-06 on the WI-086 branch: serial suite 146 tests · 142 pass · 1 stale-exclusion failure fixed and re-run green · 3 skipped; packed journey asserts the settings entry and dispatch verdicts 2/0/0 through the installed CLI and again through the ejected forwarder with the prefix removed; core regression covers preservation, idempotence, malformed-settings refusal, degradation rows, exit codes 2/0/1; `rungs check` 41 unrun (was 45); launcher latency 1,077 / 1,056 / 1,235 ms per call via `npm exec`, 93 / 98 / 87 ms for the CLI directly | [WI-086](../backlog/archive/WI-086-consumer-hook-delivery.md) | **implemented, verified locally** — not released; CI matrix pending (unpushed); the pinned path costs about one second per matching tool call, recorded in ADR-0010 as revisit trigger 1 |
| Self-tests execute in both directions | `gates` module gate `gates-self-tests-both-directions`; `modules/README.md` rule 5 | `src/selftest.ts` builders for every shipped shape, `error` outcome, named unsupported rules; the table rules they assert implemented in `src/engines.ts`, `src/engines2.ts`, `src/engines3.ts`; `renderDerivedBlocks` in `src/render.ts`; fixture context declared in five module tables | 2026-09-06 on the WI-087 branch: inventory 148 fixtures · 146 ok · 2 unrun (both `design-mirror-not-edited`, reason named) · 0 mismatch · 0 error, held by a producer test with an explicit allowlist; seeded fail-then-pass runs through production `runGates` for `when`, `required_subsections`, `field_shape`, `exempt_marker`, register-row ids, the closure row pattern and `file-index` (fixed by `render`); `doctor --explain` on hexguard-templates `d24cf0aa`, rift-forge `846cfa06` and axiom-mesh `3e1508a8` byte-identical before and after; hexguard `51b25dac` differs only by the vanished "29 fixtures did not run" line and the workflow-proliferation count 99 → 97 (two structurally different workflows now excluded by the similarity rule); `rungs check` here 30 pass with no unrun fixtures | [WI-087](../backlog/archive/WI-087-executable-self-test-coverage.md) | **implemented, verified locally** — not released; CI matrix pending (unpushed); `design-sync`'s gate remains unsupported (F-062); `warn_at` remains unimplemented by decision |
| Imperative and stale-command detection | roadmap § "The detector three readers already assume exists"; WI-061 accepted 2026-08-17; ADR-0011 | `src/instruction-engines.ts` (`imperative-census`, `command-reference`); `surface = "explain"` through `src/types.ts`, `src/check.ts` (`runnerGate`), `src/add.ts`, `src/lifecycle.ts`; two gates in `modules/instructions` (1.4.0); the claims derivation counts explain-only detectors apart | 2026-09-06 on the WI-061 branch: oracle written first ([`imperative-oracle-2026-09-06.md`](imperative-oracle-2026-09-06.md)); measured against it per repository — 0% false positives on hexguard, hexguard-templates, ai-cli and rewind, 15.6% (5 of 32) on rift-forge-candidate, recall 74 of 103 rules; command detector 0 findings on all seven; 13 fixtures execute; `doctor --explain` on the four source repos shows only added rows against the pre-change captures; a CLI run on a registry-less fixture repo contains no "unenforced" or synonym | [WI-061](../backlog/archive/WI-061-imperative-staleness-detection.md) | **implemented, verified locally** — not released; CI matrix pending (unpushed); the census asserts nothing about enforcement by decision (R2 narrowed); two of the corpus's four review categories stay deferred as the item's Out of scope says |
| `fast_budget_ms` compared with observed durations | `modules/gates/module.toml` param description; ADR-0005 Tier A | `appendLedger` writes `run` and `tier`; `ledgerBudget` in `src/check.ts` groups the first tier's rows per run over the last ten runs; `reportBudget` in `src/cli.ts` prints median, maximum and runs over budget from `doctor` only; `ledgerQuestions` tolerates malformed rows | 2026-09-06 on the WI-088 branch: `test/core.test.js` "doctor reports observed fast-tier wall-clock…" drives the CLI over fixture ledgers — 10 runs at 50–140 ms against a 100 ms budget report `median 95 ms · max 140 ms · 4 over budget`, the same ledger against 1,000 ms reports `0 over budget`, two unreadable rows are counted and named, two runs are "too short", `ledger = false` is named, and `check` prints none of it; the eject regression asserts the new row keys and one shared `run` id per run | [WI-088](../backlog/archive/WI-088-observed-fast-budget-reporting.md) | **implemented, verified locally** — not released; CI matrix pending (unpushed); this repository's own ledger predates the fields, so its `doctor` reports the history as unreadable until enough new runs accrue |
| Worktree state is truthful | `rungs worktrees` output labels; ADR-0009 "never destroy, only refuse" | `src/concurrency.ts` `WorktreeRow.state` (`clean` / `dirty` / `unknown`) with `reason`; `cmdWorktrees` in `src/cli.ts` prints `status UNKNOWN`, counts "could not be inspected", and derives the prunable count from `clean` only | 2026-09-06 on the WI-089 branch: `test/core.test.js` "worktrees keeps a failed status read unknown…" removes a linked worktree's directory (Git still lists it) and asserts `state === 'unknown'` with a non-empty reason through the function and, through the CLI, `merged · status UNKNOWN`, the reason line, "1 worktree(s) could not be inspected" and no `prunable`; the existing merged-and-dirty regression passes on the new field; `grep` finds no other consumer of the removed boolean | [WI-089](../backlog/archive/WI-089-truthful-worktree-state.md) | **implemented, verified locally** — not released; CI matrix pending (unpushed); the dangling worktree entry itself is left for the operator, as the command never removes anything |
| Failure attribution distinguishes inherited from introduced | concurrency module docs; F-029 closed 2026-09-05 | `src/concurrency.ts` `land` with detached exact-integration control (WI-081) | 2026-09-06: the selected regression passed (1/1) | — (preserved, not changed) | **verified** — regression only; no `land` was run against this repo's branches |
| Integrated candidate passes the consumer lifecycle | WI-064 approach; README § Status | `test/package.test.js` packed journey (doctor → init → check → upgrade → eject → prefix removed → direct and aggregate ejected checks → ejected hook), plus the disposable Arena Lab canary script in the session scratchpad | 2026-09-06: the journey passes on the integrated tree; a disposable canary on a throwaway clone of Arena Lab at `f4ede793` failed 1 of 24 gates at producer `675780c7` (fixed by WI-091, summary wording by WI-092) and passed every step at `22edbe3`: 23 pass before upgrade, 24 pass after, `check . full` 24, hook 2/0, eject, ejected `check`/`check full` 24 pass and ejected hook 2/0 with the package prefix removed; final producer numbers in the log below | [WI-090](../backlog/archive/WI-090-integrated-consumer-verification.md) | **verified locally** — not released; CI matrix pending (unpushed); the canary is a synthetic disposable clone, not adoption; the release and pin steps are WI-064's and were not authorized here |

## Verification log

Appended as items land; each entry names the commit it was run against.

- 2026-09-06 · `bb0bf2b` · baseline rows above.
- 2026-09-06 · `feature/WI-077-standalone-ejected-checks` (tip recorded in the item on landing) · serial
  suite 144/141/0/3 in 165 s; `node src/cli.ts check` 30 pass; `npm pack --dry-run --json` 118
  entries including the runner; `git diff --check` clean. Baseline reproduction before the change:
  built `eject` exited 1 resolving `dist/glob.ts`; source `eject` exited 0 and the direct gate
  exited 1 with `ERR_MODULE_NOT_FOUND` for `smol-toml`.
- 2026-09-06 · `feature/WI-086-consumer-hook-delivery` from `f7db44e` · serial suite 146/142/1/3
  (the failure a stale test exclusion, fixed, re-run green); `rungs check` 30 pass, 41 unrun;
  claims snapshot regenerated (`instructions` 1.3.0); hook latency measured as recorded in the row.
  Found on the way: F-061 (`add` after `init` rewrites the install record), recorded, not fixed here.
- 2026-09-06 · `feature/WI-087-executable-self-test-coverage` from `1670d1f` · inventory 148/146/0/0
  with 2 named unrun; serial suite 149/146/0/3 in 244 s; `rungs check` 30 pass, no unrun fixtures;
  `doctor --explain` diffs against the pre-change captures: three source repos byte-identical,
  hexguard two lines (fixtures now run; workflow count 99 → 97 under the similarity rule). Ownership
  now ignores managed-block bodies (`ownershipHash`), which the packed journey forced when `render`
  began filling the ADR index. Found on the way: F-062 (`design-sync` gate cannot function).
- 2026-09-06 · `feature/WI-061-imperative-staleness-detection` from `6acfc39` · oracle classified before
  the matcher (209 candidate lines, 103 rules); census measured 0% / 0% / 0% / 0% / 15.6% false
  positives per repository against it (recall 74 of 103); command detector 0 findings on seven repos;
  serial suite 150/146/1/3 in 133 s (the failure an assertion predating explain-only detectors,
  widened, re-run green); `rungs check` 31 pass; site 169 pages, 2,631 links, 0 broken; `doctor
  --explain` on the four source repos: additions only against the pre-change captures.
- 2026-09-06 · `feature/WI-088-observed-fast-budget-reporting` from `eaf5fe1` · serial suite
  151/148/0/3 in 143 s; `rungs check` 31 pass; this repo's `doctor` reports its own ledger as too
  short (2 usable runs) with 13,352 pre-schema rows counted as unreadable. Found and fixed on the way:
  one malformed ledger line crashed `doctor` in `ledgerQuestions`.
- 2026-09-06 · `feature/WI-089-truthful-worktree-state` from `bc8cc32` · serial suite 152/149/0/3 in
  139 s after rebuild; `rungs check` 31 pass; the failing-read regression removes a real worktree
  directory and checks the row through the function and the CLI.
- 2026-09-06 · WI-090 first canary at `675780c7` (main after WI-089) · disposable Arena Lab clone at
  `f4ede793`: 1 of 24 gates failed on the untouched scaffold — `adr-index-current` counted the
  template's `— · none yet` row as a record — through the installed CLI, after `upgrade --apply`, and
  through the ejected runner; the eject summary said only `check` survived while the ejected hook
  then blocked (exit 2) as designed. Hook 2/0 on both surfaces; settings entry merged. Both defects
  became WI-091 and WI-092. Also my own error, now F-063: `rungs check full` through the CLI is path
  `full`, exit 1 "no gates registered".
- 2026-09-06 · `feature/WI-091-index-placeholder-rows` from `675780c7`, landed `0a50515f` · engine test
  1/1 from the real template; inventory 163/161/0/0 with the same 2 named unrun; fresh `init tracked`
  passes `adr-index-current` with no render; serial suite 152/149/0/3 in 179 s; `rungs check` 31
  pass; claims snapshot regenerated (`adr` 1.2.1, run 31 pass). A first `land` was refused on the
  merged tree (30 pass · 1 fail, `backlog-board-reconciled`: the archived item's board row was still
  under In progress) and landed on the second attempt after the row was dropped; the parked
  `integ/feature/WI-091-index-placeholder-rows` recovery ref is left for the operator.
- 2026-09-06 · `feature/WI-092-eject-summary-retained-commands` from `0a50515f`, landed `34f36243` ·
  packed journey 1/1 in 41 s with the new summary assertion; serial suite 152/149/0/3 in 158 s;
  `rungs check` 31 pass.
- 2026-09-06 · `feature/WI-090-integrated-consumer-verification` rebased onto `34f36243` · second
  canary at `22edbe3` (clean tree; tarball `rungs-cli-0.4.0.tgz` 121 entries,
  `sha512-T8t0Gkgx…36EzXA==`) on the throwaway Arena Lab clone at `f4ede793`: every step exit 0 or the
  expected hook code, 23 pass before upgrade and 24 after, on the installed and the ejected surface.
  Producer on the finished tree: serial suite 152/149/0/3 in 143 s (an earlier run failed 1 because a
  session note was written during it — recorded, re-run); `rungs check` 31 pass; `modules` 15;
  `npm pack --dry-run --json` 121 entries, `sha512-bhz8RMHM…PxQdeA==` after the README retype; site 171
  pages, 2,651 links, 0 broken. CI matrix for the exact SHA: pending, nothing pushed.
