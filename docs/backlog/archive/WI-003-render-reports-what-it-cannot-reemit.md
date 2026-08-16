---
id: WI-003
title: Stop .ai/rungs.toml instructing a fix that rungs render cannot perform
type: chore
status: done
branch: feature/WI-003-render-honest
created: 2026-08-15
updated: 2026-08-15
related: [WI-001, WI-002]
epic:
children: []
---

## Proposal (rationale)

Every scaffolded repo receives a config file whose first line is an instruction that does not work
for most of what it governs. `.ai/rungs.toml` opens:

> `# Installed by rungs. Edit parameters here and re-run rungs render.`

`render` re-emits **path-scoped rules only** (ADR-0001's fragmented surface). Parameters consumed by
`files/`-disposition content — which is most of them — are substituted at install and never again.
Measured 2026-08-15 on a `minimal` install:

```console
$ sed -i 's/project_name = ""/project_name = "Renamed App"/' .ai/rungs.toml
$ node src/cli.ts render .
  0 rendering(s) → .ai/render-report.md
$ head -1 AGENTS.md
# AGENTS.md —
```

`0 rendering(s)` is reported as an ordinary result. The user followed the file's own written
instruction, the tool reported success, and nothing changed — the worst of the three possible
outcomes, because it teaches them the parameter does not work rather than that the command does not
cover it.

This is the same class as WI-001: a sentence describing a behaviour nobody tested, shipped into
every repo the tool scaffolds. It is worse than WI-001 in reach, because it is written into the
consumer's repo rather than into ours, so it propagates with every install and cannot be corrected
retroactively.

The fix is a choice between two honest options, to be settled during planning: make `render`
re-emit what it can and **report what it deliberately left alone**, or narrow the instruction in
the header to the parameters it actually governs and say where the others are fixed. Either is
acceptable; the current state — a confident instruction and a silent no-op — is not.

Found while assessing first-user documentation completeness on 2026-08-15.

## Decision

`accepted` — 2026-08-15. Investigation during planning **widened what is wrong** and narrowed the
fix. The instruction is not merely incomplete; no command performs it at all.

## Plan

### Requirements

- `.ai/rungs.toml`'s header states only what some command actually does.
- It says where a parameter change *can* still be applied, and where it cannot.
- `render` emitting nothing reads as "nothing to do", not as a completed edit.
- No change to what any command writes. This item corrects claims, not behaviour.

### Impacts

- [`src/add.ts`](../../../src/add.ts) `writeRecord` — the three header lines.
- [`src/cli.ts`](../../../src/cli.ts) `cmdRender` — the zero case.
- Every repo scaffolded from here on. Existing repos keep the old header until re-installed, which
  is acceptable: the header is wrong but inert, and rewriting a user's file to fix our sentence is
  the overwrite this tool promises never to do.
- **No ADR.** Criterion 5: the code states the boundary more precisely than prose can — `SHARED` in
  `add.ts` already carries the reasoning.

### Approach

**What was measured on 2026-08-15**, which is more than the item was opened with:

| Command | Re-substitutes a changed parameter? |
| --- | --- |
| `rungs render` | **No.** `readRules` reads `.ai/rules/*.md` off disk, already substituted at install. It re-emits rules per harness; it never revisits parameters |
| `rungs upgrade --apply` | **No, for the entry document.** `emittedFiles` skips the `SHARED` set — `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `.gitattributes`, `.ai/gates.toml` — because they are co-owned and only their managed *blocks* are upgraded. `project_name` lands in the `H1`, outside every block |

So the header is not describing a partial mechanism. `render` was never the command for this, and for
`SHARED` files no command is. `upgrade` reported `0 to update · 0 diverged` after a parameter change
— correct behaviour, wholly undiscoverable from the instruction.

The fix is therefore **(b) from the proposal — narrow the instruction** — and (a) is now rejected on
evidence rather than taste: making `render` re-emit `SHARED` files would clobber the managed blocks
`SHARED` exists to protect, which is the one thing this tool promises not to do.

Rejected: **deleting the sentence.** A config file whose parameters visibly do nothing invites the
same experiment. Saying where they still apply is what stops it.

### Acceptance criteria / tests

1. A fresh install's `.ai/rungs.toml` header makes no claim that editing a parameter and running
   `render` changes a written file.
2. The header names the co-owned files by the reason they are excluded, not by listing behaviour a
   reader must test.
3. `rungs render` with nothing to emit says so in words that do not read as a completed edit.
4. `rungs check` → 20 pass, 0 fail; `render` on this repo still emits its 3 rules.
5. The measurement table above is reproducible: change `project_name`, run `render` then
   `upgrade --apply`, observe the entry document unchanged by both.

### Out of scope

- **Making `rungs upgrade` re-substitute parameters into diverged files.** `upgrade` has its own
  never-touch-what-you-edited contract; changing it is a separate item and likely an ADR.
- **The `installed` date and hash bookkeeping in the same file** — correct as far as measured, and
  not part of this defect.
- **Inferring `project_name`** — WI-001. This item does not depend on it: the instruction is wrong
  for every `files/` parameter, not just that one.

## Execution

Branch `feature/WI-003-render-honest`, cut from `main` 2026-08-15.

- [`src/add.ts`](../../../src/add.ts) `writeRecord` — the header now says the file is a record of
  what was written, not a control panel; names `render` and `upgrade --apply` with what each does;
  and states that the five co-owned files are updated block-by-block only, so anything outside a
  block — including the entry document's title — is the user's to edit directly.
- [`src/cli.ts`](../../../src/cli.ts) `cmdRender` — the zero case says what it did **not** do. That
  is the exact output a user gets after following the old instruction, so a bare
  `0 rendering(s)` was the sentence completing the deception.

No behaviour changed. Nothing new is written, moved, or overwritten.

**F-001 recurred**, third occurrence in three items: 19 pass · 1 fail on
`backlog-merged-status` before the branch carried a commit. The finding now has three data points
and is unambiguously systematic rather than incidental.

## Review

Checked 2026-08-15.

1. **Pass.** A fresh `minimal` install's header makes no claim that editing a parameter and running
   `render` changes anything; it states the opposite in its second line.
2. **Pass.** The five files are named together with the reason — shared between modules, so only
   their `rungs:begin`/`rungs:end` blocks are updated — rather than as a list to be taken on trust.
3. **Pass.** `render` on a repo with no rules prints *"Nothing to render."* and two lines saying it
   does not re-substitute parameters. Verified against the exact reproduction from the Proposal:
   change `project_name`, run `render`, and the output now explains the unchanged file.
4. **Pass with a corrected number.** `rungs check` → 20 pass, 0 fail once the branch carried a
   commit. `render` on this repo emits **4** renderings, not the 3 this criterion predicted — the
   figure was written from memory rather than measured, and the criterion is recorded here as
   failed-as-written and passed-as-measured rather than quietly adjusted. Nothing regressed; 4 is
   what it emitted before this change too.
5. **Pass.** The Approach's table reproduces: after changing `project_name`, `render` emits nothing
   and `upgrade --apply` reports `0 to update · 0 diverged`, with the entry document unchanged by
   both — which is now what the tool says will happen.
