**Authoritative for:** what to do in the hour after installing, and which of the new files matter.
**Not authoritative for:** how any of it works. Every section here ends by handing you to the
document that owns the topic — this page routes, it does not re-explain.

# Your first hour

You ran `rungs init` and got twenty-five files. This is which four you read, what the five new
skills are for, and what to do when a gate goes red.

If you have not installed yet, start with `npx @rungs/cli doctor` — it reports what your repo
already has and ends by naming one command to run next.

## 1 · The four files that matter

The other twenty-one are templates, indexes and per-harness renderings. These four are the system:

| File | What it is | Who reads it |
| --- | --- | --- |
| `AGENTS.md` | The always-on agent policy. Everything a session needs on **every** task | Every agent session, in full |
| `.ai/rules/` | Path-scoped rules — loaded only when a matching file is edited | An agent, when it touches that path |
| `.ai/gates.toml` | Every check this repo runs, and which module registered it | `rungs check` |
| `docs/backlog/BACKLOG.md` | The board. One row per live work item | You |

`CLAUDE.md` is a one-line bridge to `AGENTS.md`, not a second copy. `.ai/rungs.toml` records what
was installed and with which parameter values; it is a record, not a control panel
([parameters](design/parameters.md)).

## 2 · Fill in the three blanks

`AGENTS.md` ships with deliberate gaps, because the tool cannot know these and a plausible guess
would be worse than an obvious hole:

- **`## What this is`** — one paragraph: what the project does, for whom, and the one property that
  must not break.
- **The validation matrix** — one row per change surface, naming the narrowest command that covers
  it. The `anything → rungs check` row is already there.
- **The repo map** — where things live.

The file has a line budget that `rungs check` enforces, so it stays the always-on document rather
than becoming the place everything accumulates. Anything path-specific belongs in `.ai/rules/`;
anything multi-step belongs in a skill. Both load only when relevant.

## 3 · The five skills are the day-2 interface

`init` installed these into `.claude/skills/`. They are how work actually moves — invoke one by
name:

| Skill | Use when |
| --- | --- |
| `/work-item` | Executing a tracked piece of work, start to finish: branch, plan, build, test, review, merge |
| `/record-finding` | You noticed something real that is **not** this task. It becomes a row, not a detour |
| `/backlog-summary` | Deciding what to do next, or checking whether the board still tells the truth |
| `/close-session` | Ending a working session: archive note, handoff reset, constraints recorded |
| `/harden-rule` | Something went wrong that an instruction could have prevented |

The split between the first two is the one worth internalising: **an item is a decision, a finding
is an observation.** Recording a finding must cost almost nothing or it will not happen, which is
why findings are rows in `docs/backlog/FINDINGS.md` and items are files.

The reasoning behind the lifecycle — the eight statuses, the branch convention, the definition of
done — is [`docs/backlog/README.md`](backlog/README.md), and it is worth one read before your first
item.

## 4 · Your first work item

```bash
npx @rungs/cli check
```

Then take something small you were going to do anyway and run it through `/work-item`. The point of
the first one is not the change; it is finding out where the process argues with how you already
work, while the stakes are low.

Claim an id from the `NEXT-ID` marker in `BACKLOG.md` and bump it on your own branch. Ids are
permanent and never reused.

## 5 · When a gate goes red

A failing gate is the system working. Read the message — every gate states what it refuses and why,
because the reason is the extracted incident that justified it.

Three things worth knowing before you meet them:

- **Some gates take an exemption, and every exemption must state a reason.** `branch-merged-ok:
  <why>`, `owner-ok: <why>`. A marker with no reason is ignored on purpose: an escape hatch nobody
  has to justify is an off switch.
- **`concurrency-no-integration-checkout` is red by design** on any repo with its integration branch
  checked out. It stays red until a repo genuinely adopts worktrees. If you installed `concurrency`
  below five concurrent sessions, you probably should not have.
- **A gate that has never fired gets questioned, not celebrated.** `rungs check` reports these with
  the incident that motivated them and asks whether the risk is still real here. Deleting a gate
  that does not apply to you is a valid answer.

## 6 · What this does not do

- **It does not check quality.** `doctor` reports that files are where a module's files would be —
  never whether what is in them is any good. Signatures under-detect on purpose.
- **It does not measure your workflow.** The gate ledger records whether a gate ran and whether it
  fired. It never scores you ([ADR-0005](decisions/ADR-0005-self-instrumentation.md)).
- **It does not own your files.** Anything you edit is reported as diverged and left alone, forever.
  `rungs eject` materialises the engines into your repo if you want to stop depending on the tool.

## Where to go next

| | |
| --- | --- |
| [`docs/backlog/README.md`](backlog/README.md) | The delivery lifecycle, in full |
| [`docs/design/parameters.md`](design/parameters.md) | Changing where things live |
| `rungs modules --params` | Every module parameter and its default |
| [`modules/README.md`](../modules/README.md) | Writing a module of your own |
| [`docs/research/synthesis.md`](research/synthesis.md) | The eight failure modes all of this answers |
