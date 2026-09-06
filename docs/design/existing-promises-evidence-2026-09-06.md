# Existing promises — evidence matrix, 2026-09-06

**Authoritative for:** the executable evidence behind each consumer promise
[WI-085](../backlog/items/WI-085-existing-promises-remediation.md) completes, and the baseline it
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
| Self-tests execute in both directions | `gates` module gate `gates-self-tests-both-directions`; `modules/README.md` rule 5 | `src/selftest.ts` builders for every shipped shape, `error` outcome, named unsupported rules; the table rules they assert implemented in `src/engines.ts`, `src/engines2.ts`, `src/engines3.ts`; `renderDerivedBlocks` in `src/render.ts`; fixture context declared in five module tables | 2026-09-06 on the WI-087 branch: inventory 148 fixtures · 146 ok · 2 unrun (both `design-mirror-not-edited`, reason named) · 0 mismatch · 0 error, held by a producer test with an explicit allowlist; seeded fail-then-pass runs through production `runGates` for `when`, `required_subsections`, `field_shape`, `exempt_marker`, register-row ids, the closure row pattern and `file-index` (fixed by `render`); `doctor --explain` on hexguard-templates `d24cf0aa`, rift-forge `846cfa06` and axiom-mesh `3e1508a8` byte-identical before and after; hexguard `51b25dac` differs only by the vanished "29 fixtures did not run" line and the workflow-proliferation count 99 → 97 (two structurally different workflows now excluded by the similarity rule); `rungs check` here 30 pass with no unrun fixtures | [WI-087](../backlog/items/WI-087-executable-self-test-coverage.md) | **implemented, verified locally** — not released; CI matrix pending (unpushed); `design-sync`'s gate remains unsupported (F-062); `warn_at` remains unimplemented by decision |
| Imperative and stale-command detection | roadmap § "The detector three readers already assume exists"; WI-061 accepted 2026-08-17 | no engine; corpus only ([`imperative-corpus-2026-08-17.md`](imperative-corpus-2026-08-17.md)) | none possible | [WI-061](../backlog/items/WI-061-imperative-staleness-detection.md) | **open** — oracle and R7 decision precede any matcher |
| `fast_budget_ms` compared with observed durations | `modules/gates/module.toml` param description; ADR-0005 Tier A | no reader of the parameter; ledger rows lack `tier` and a run id | `grep -rn fast_budget src/` → only the registry template | [WI-088](../backlog/items/WI-088-observed-fast-budget-reporting.md) | **open** |
| Worktree state is truthful | `rungs worktrees` output labels; ADR-0009 "never destroy, only refuse" | `src/concurrency.ts` `worktrees()` catch sets `dirty = false` | not reproduced at runtime before WI-089 | [WI-089](../backlog/items/WI-089-truthful-worktree-state.md) | **open** |
| Failure attribution distinguishes inherited from introduced | concurrency module docs; F-029 closed 2026-09-05 | `src/concurrency.ts` `land` with detached exact-integration control (WI-081) | 2026-09-06: the selected regression passed (1/1) | — (preserved, not changed) | **verified** — regression only; no `land` was run against this repo's branches |
| Integrated candidate passes the consumer lifecycle | WI-064 approach; README § Status | `test/package.test.js` packed journey | baseline: `npm test` 139 pass · 3 skipped (2026-09-05, WI-084) | [WI-090](../backlog/items/WI-090-integrated-consumer-verification.md) | **open** |

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
