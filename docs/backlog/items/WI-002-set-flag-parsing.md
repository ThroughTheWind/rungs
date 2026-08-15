---
id: WI-002
title: Accept --set k=v, and refuse an unparsed positional instead of silently retargeting
type: chore
status: done
branch: feature/WI-002-set-flag-parsing
created: 2026-08-15
updated: 2026-08-15
related: [WI-001, WI-004, WI-006]
epic:
children: []
---

## Proposal (rationale)

`--set` is the only way to place a module anywhere but its default path, and the only way to fix
the blank `project_name` (WI-001). It parses **one** form. The other form fails silently and
corrupts an unrelated argument. *(As opened, this sentence also claimed the failure exits 0 — see
the correction below.)*

`cmdAdd` reads overrides with `rest.filter((r) => r.startsWith('--set='))`
([`src/cli.ts:154`](../../../src/cli.ts)), so `--set` and its value separated by a space is never
an override. `--into` then compounds it: it is not a flag-with-value but a marker meaning *the last
positional is the target* ([`src/cli.ts:405`](../../../src/cli.ts)), so the orphaned `k=v` becomes
the last positional and is taken as the destination, while the real destination is read as a module
name.

Measured 2026-08-15:

```console
$ node src/cli.ts add backlog --into ./repo --set backlog.root=mywork --dry-run
  unknown module(s): ./repo
```

The user is told their **path** is an unknown module, having named no such module. Nothing mentions
`--set`. The working form gives no hint it is the only one:

```console
$ node src/cli.ts add backlog --into ./repo --set=backlog.root=mywork --dry-run
  set backlog.root = mywork
```

Two defects meet here, which is why the failure is so opaque: a flag that accepts one of two
conventional spellings, and a positional-marker flag that silently absorbs whatever lands last.

> **Corrected 2026-08-15, before planning.** This item was opened claiming a third defect — that the
> failure exits 0 — and the commit that opened it repeats the claim. **It is false.** `cmdAdd`
> returns 1 and `process.exit` carries it; measured `1`. The original reading came from
> `node … | head -8; echo $?`, where `$?` is the exit status of `head`, not of `node`.
>
> Kept rather than quietly deleted, because the way it was wrong is the same failure
> [ADR-0006](../../decisions/ADR-0006-the-name.md) records: a command was named, it ran, it returned
> a clean result, and it answered a question nobody had asked. `echo $?` after a pipeline tests the
> **last stage of the pipeline**, not the program. Evidence must test the property the claim is
> about — measure an exit code with the process unpiped.

Found while assessing first-user documentation completeness on 2026-08-15.

## Decision

`accepted` — 2026-08-15, with the scope reduced to two defects by the correction above. Both
survive: the flag still parses one spelling of two, and `--into` still absorbs whatever lands last.

## Plan

### Requirements

- `--set k=v` and `--set=k=v` both register the override.
- A `k=v`-shaped positional that reached `args` because a flag did not consume it is **refused with
  a message naming it**, never silently treated as a path or a module.
- `--into` resolves the same target whether or not `--set` is present.
- The refusal exits non-zero.
- No existing invocation changes meaning — `--set=k=v`, bare `add <mod>`, and `add <mod> --into p`
  behave exactly as before.

### Impacts

- [`src/cli.ts`](../../../src/cli.ts) — the top-level `flags`/`args` split at 363–365, and the
  override loop plus `--into` resolution inside `cmdAdd`.
- No module, manifest or emitted file changes. Nothing in a scaffolded repo moves.
- **No ADR.** This is not a CLI surface change: it widens what an existing flag accepts and turns a
  silent misread into an error. Criterion 1 of the admission rule fails — it describes current
  intent rather than constraining future work.

### Approach

Parse value-carrying flags **once, at the top level**, instead of having `cmdAdd` re-scan `rest` for
a `--set=` prefix. A `VALUE_FLAGS` set — `--set` alone today — drives one pass that pairs each such
flag with its value, from `=` when attached and otherwise from the next token, and removes **both**
from the positionals. `cmdAdd` reads resolved values rather than re-deriving them.

**`--into` is not touched.** The first draft of this plan made it a flag-with-value in the same
change, which contradicted this item's own Out of scope. Re-tested and unnecessary: `--into`
misbehaves only because `--set` leaves an orphan for it to absorb. Once the orphan cannot exist,
last-positional resolution is correct as written and as the README documents it. The smaller change
is also the one that keeps the boundary.

A `k=v`-shaped positional that survives the pass is then unambiguously a mistake — no flag claimed
it — so `cmdAdd` refuses it by name instead of treating it as a module or a path.

Considered and rejected: **accepting `--set k=v` inside `cmdAdd` only.** Three lines, but it leaves
the top-level splitter producing a stray positional for the next value-carrying flag anyone adds —
the same trap, re-armed one flag along.

### Acceptance criteria / tests

1. `add backlog --into <tmp> --set backlog.root=mywork --dry-run` reports `set backlog.root = mywork`
   and targets `<tmp>`.
2. `add backlog --into <tmp> --set=backlog.root=mywork --dry-run` behaves identically to 1.
3. `add backlog --into <tmp> --set --dry-run` (value missing) exits non-zero naming `--set`.
4. A stray `k=v` positional that no flag claimed exits non-zero and names the token.
5. `add instructions --into <tmp>` with no `--set` still installs to `<tmp>`.
6. `rungs init <tmp> tracked` and `rungs check` are unaffected — 20 pass, 0 fail.
7. Exit codes measured **unpiped**, per the correction above.

### Out of scope

- **Documenting what the parameters are** — that is WI-006. This item is about the flag parsing
  accepting what a user reasonably types and failing loudly when it cannot.
- **Listing `--set` in `--help`** — that is WI-004, which covers the whole help/README divergence
  rather than this one flag.
- **Whether `--into` should become a conventional flag-with-value.** Worth considering during the
  plan, but changing it is a CLI surface change; if it is taken up it needs its own item and
  probably an ADR, since the README documents the current form.

## Execution

Branch `feature/WI-002-set-flag-parsing`, cut from `main` 2026-08-15. All in
[`src/cli.ts`](../../../src/cli.ts); no other file changed.

- `VALUE_FLAGS` plus a single left-to-right pass replacing the two `startsWith('--')` filters. A
  value-carrying flag takes its value from `=` when attached, otherwise from the next token — and
  **not** if that token is itself a flag, so `--set --dry-run` is a missing value rather than a
  value of `--dry-run`.
- `flags` now stores the bare name, so `--copilot=yes` answers `flags.has('--copilot')`. Previously
  the raw token went in and an attached value made the flag invisible.
- `strayOverride` refuses a leftover positional matching `module.param=`. Both refusals run before
  dispatch: either one means the argv the user typed is not the argv any command would act on.
- `cmdAdd` reads `flagValues['--set']` instead of re-scanning `rest`.

**Deviation from the plan, resolved in the plan rather than in the code:** the first draft made
`--into` a flag-with-value in the same change, which this item's own Out of scope had reserved for a
separate item. Re-tested and found unnecessary — `--into` misbehaves only because `--set` left an
orphan for it to absorb — so `--into` is untouched and the plan was rewritten before any code was
written. Recorded because the plan is what the next reader audits.

**Scope taken deliberately, beyond the two defects:** a malformed `--set` key (`--set root=x`, no
module prefix) was previously `continue`d in silence, so the install proceeded on defaults and
looked successful. It is now refused. This is the same failure class as the item — an override the
user asked for and did not get, without being told — and fixing it separately would have meant
touching the same eight lines twice.

**F-001 recurred**, as predicted: 19 pass · 1 fail between `git switch -c` and the first commit,
`backlog-merged-status` on a branch whose tip was still `main`'s. Second occurrence in two items.
Not fixed here; the finding stands and now has two data points.

## Review

Each acceptance criterion, checked 2026-08-15. Exit codes measured **unpiped**, redirecting to a
file — the mistake the Proposal's correction records.

1. **Pass.** `--set backlog.root=mywork` reports `set backlog.root = mywork` and targets `…/a`. The
   path is no longer read as a module name.
2. **Pass.** `--set=backlog.root=mywork` produces identical output against `…/b`.
3. **Pass.** `--set` with no value → exit 1, *"--set expects a value — --set module.param=value"*.
4. **Pass.** A bare `backlog.root=mywork` positional → exit 1, naming the token and suggesting
   `--set backlog.root=mywork`.
5. **Pass.** `add instructions --into …/c` with no `--set` → exit 0, `AGENTS.md` written, heading
   `# AGENTS.md — c` (WI-001's derivation still working through the new parser).
6. **Pass.** `init …/d tracked` → exit 0, 25 files. `rungs check` → 20 pass, 0 fail once the branch
   carried a commit; 19/1 before it, which was F-001 and is recorded above rather than assumed away.
7. **Pass.** Every exit code above was captured without a pipeline.

Additionally verified beyond the criteria: `--set root=x` → exit 1 rather than a silent default.
