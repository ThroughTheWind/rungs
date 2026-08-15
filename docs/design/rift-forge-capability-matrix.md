# Rift Forge capability matrix

> Decision record for WI-031. Evidence is pinned to the refreshed local candidate
> (`candidate/0.1.0` at `4a51848cfc9a2acbcdeddcd028418572406e2950`, refreshed 2026-08-15).
> Source paths below describe the candidate checkout only; they are not paths that a consumer repo
> must provide. A row marked **adopt** is implemented through a rungs module or engine contract;
> **defer** and **reject** are deliberate portability decisions, not missing work.

## Candidate decisions

| Candidate evidence (path / commit) | Portable rungs surface | Running cost | Decision | Reason and boundary |
| --- | --- | --- | --- | --- |
| `.github/scripts/land.mjs`, `lib/item-status.mjs` / `f9f26580` | `backlog`'s `git-status-reconcile` remains the one-directional branch/status check | A git branch read per check; a hypothetical merge requires a land operation | **defer** | The shared predicate is valuable only when a tool owns merge preparation and a scratch ref. Rungs has no land service or compare-and-swap contract, so adding a preflight flag would imply an integration protocol it cannot execute. A future adapter may call the same predicate at its boundary. |
| `.github/scripts/check-finding-closure.mjs` / `f9f26580` | `findings` module v1.1.0; `self-declared-closure` engine and gate | One markdown scan; no code or network access | **adopt** | The question is repository-agnostic: does an open finding's own detail section declare itself fixed? The engine accepts headings, id shape, verdict phrases, and a reasoned `closure-ok:` exception, so it does not copy Rift Forge's file layout or `F-###` assumptions into the CLI. |
| `.github/scripts/gen-dataset-coverage.mjs` / `8107be2d` | No current module; candidate-specific generator adapter | Requires a generated dataset schema plus live work-item status lookup on each generation | **defer** | “Owner is a live work item or durable channel” is a good source rule, but rungs does not own generated triage rows or a channel registry. Representing it as a generic id gate would silently overclaim what is checked. |
| `PROJECT-STATE.md` and `CLAUDE.md` / `2eddf18f` | `instructions` core-size budget and path-scoped `.ai/rules/` | A second record to maintain and a read when historical context is needed | **defer** | On-demand history is a useful operating convention, not a universal file contract. Rungs already supplies a size budget and scoped rules; a future history module can add a named record once a stable format and migration boundary exist. |
| `docs/engineering/gates.md` / `f9f26580` | `.ai/gates.toml` registry plus `rungs check` output | A generated index adds a producer, freshness gate, and merge-driver policy | **defer** | The registry is already the machine-readable source and the CLI reports every gate. Adding a second generated catalogue now would duplicate authority. Revisit when a consumer-facing index has a distinct query need and a declared generator boundary. |
| `.github/scripts/worktrees.mjs` / `10549f2a` | `concurrency` module's `git-state` gate and worktree report contract | Read-only worktree enumeration; escalation policy needs owners and a threshold | **defer** | Reporting age and dirty state is portable; automatically nagging or pruning is not. Rungs deliberately never removes another owner's checkout, and it has no owner directory or notification channel. Keep the operational guidance in the concurrency module until that boundary exists. |

## Adopted contract

`findings-self-declared-closure` is intentionally narrower than a “finding is fixed” detector:

- it reads the Open, Closed, and Detail regions of the configured findings register;
- it checks only an open finding's own detail section for configured, verdict-shaped fixed phrases;
- a verdict about another finding is ignored;
- `<!-- closure-ok: <reason> -->` permits a partial mitigation while the observation remains open;
- it never runs product code, resolves work-item status, or decides whether the claimed fix is true.

The engine has positive, negative, partial-fix, and cross-citation coverage in
[`test/core.test.js`](../../test/core.test.js). The module gate also carries both-direction
self-test fixtures in [`modules/findings/gates/findings.toml`](../../modules/findings/gates/findings.toml).

## Deferred adapter boundary

The deferred rows are not promises that rungs will grow a Rift Forge-shaped land script, dataset
generator, or notification system. If a future module adds one, it must first define the external
adapter contract (inputs, owned state, failure attribution, and cost), then add a new work item and
tests. Until then, the current modules describe only the facts they can observe locally.
