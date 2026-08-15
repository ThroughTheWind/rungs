---
id: WI-001
title: Infer project_name from the repo directory, as its own default already promises
type: chore
status: done
branch: feature/WI-001-infer-project-name
created: 2026-08-15
updated: 2026-08-15
related: [WI-002, WI-003]
epic:
children: []
---

## Proposal (rationale)

**The first line of the first file every scaffold writes is visibly broken.** `AGENTS.md` opens
with a dangling em-dash and nothing after it:

```console
$ node src/cli.ts init ./my-cool-app minimal
$ head -1 my-cool-app/AGENTS.md
# AGENTS.md —
```

`instructions.project_name` defaults to `""`, and the comment beside that default at
[`modules/instructions/module.toml:17`](../../../modules/instructions/module.toml) says
`# inferred from the repo directory when blank`. **It is not.** Measured 2026-08-15 by scaffolding
into a directory named `my-cool-app`, which is exactly the case the comment describes.

Why it matters more than a cosmetic defect:

1. It is the **first impression of the output**, in the one file the tool tells every session to
   read in full. A tool whose own scaffold ships a broken heading is arguing against itself.
2. The only fix available today is `--set=instructions.project_name=…`, which is documented
   nowhere (WI-002) and only works **at install time** — `rungs render` will not re-emit `AGENTS.md`
   afterwards (WI-003). So a user who notices has no supported way to correct it short of editing
   the file by hand, which then reports as diverged.
3. It is an instance of the failure this repo exists to argue against: a comment stating a
   behaviour that no longer runs, sitting next to the code that would have to implement it. The
   comment is evidence for a property nobody tested.

Found while assessing first-user documentation completeness on 2026-08-15.

## Decision

`accepted` — 2026-08-15. Accepted together with WI-002..007 as the first-user path. The defect is
already written down as intended behaviour in the manifest, so this is closing a gap between a
stated default and a running one, not a new feature.

## Plan

### Requirements

- With no override, `project_name` resolves to the target repository's directory name.
- An explicit `--set=instructions.project_name=…` still wins.
- The **resolved** name is what `.ai/rungs.toml` records, so every later command reads a real value
  rather than re-deriving one.
- A repo already recording `project_name = ""` is **not** renamed retroactively by `upgrade`.
- No `{{repo.` token reaches an emitted file under any call path.

### Impacts

- [`src/substitute.ts`](../../../src/substitute.ts) — `resolveParams` gains the reserved namespace.
- [`src/cli.ts`](../../../src/cli.ts), [`src/check.ts`](../../../src/check.ts),
  [`src/lifecycle.ts`](../../../src/lifecycle.ts) — the six `resolveParams` call sites pass the repo
  root they already hold.
- [`modules/instructions/module.toml`](../../../modules/instructions/module.toml) — the default, and
  the comment that lied.
- [`modules/README.md`](../../../modules/README.md) rule 9b — owns parameter referencing and must
  state the reserved namespace, or the next module author reads `{{repo.dirname}}` as the
  undeclared-coupling that rule forbids.
- **No ADR.** Tested against the admission rule in
  [`docs/decisions/README.md`](../../../docs/decisions/README.md): criterion 4 fails — parameter
  referencing is already owned by a module doc — so the rule sends this to `modules/README.md`.

### Approach

Reuse the substitution machinery that already exists rather than special-casing one parameter.
`resolveParams` already resolves `{{<module>.<param>}}` one level deep (that is how `findings`
places its register beside `backlog`'s root). Add a **reserved pseudo-module `repo`**, holding
`dirname`, and set the manifest default to `{{repo.dirname}}`.

The comment that made this a defect becomes the declaration that runs: the manifest states the
inference in the same place a reader looks for the default.

Considered and rejected: **hard-coding `basename(root)` for `instructions.project_name` in
`cmdAdd`.** Fewer lines, but it puts one module's knowledge inside generic installer code, and it
is invisible to the manifest reader — leaving the same comment-versus-behaviour gap that produced
this item, just relocated.

Open and deliberately not resolved here: whether `repo` should also expose `git_remote` or
`branch`. Nothing needs them; adding an unused key would be rule 9e's knob wired to nothing.

### Acceptance criteria / tests

1. `rungs init <tmp>/my-cool-app minimal` → first line is `# AGENTS.md — my-cool-app`.
2. `rungs add instructions --into <tmp>/x --set=instructions.project_name=Chosen` → `# AGENTS.md — Chosen`.
3. That repo's `.ai/rungs.toml` records `project_name = "my-cool-app"` — literal, not a token.
4. A record already holding `project_name = ""` still holds it after `rungs upgrade --apply`.
5. `grep -r '{{repo\.' ` over a full `fleet` install returns nothing.
6. `rungs check` → 20 pass, 0 fail.
7. `modules/README.md` 9b names the reserved namespace and why it is not an undeclared coupling.

### Out of scope

- **The `--set` parsing trap and its documentation** — that is WI-002. This item is only about the
  default resolving correctly when nothing is passed.
- **Re-emitting `AGENTS.md` after install** — that is WI-003. Fixing inference helps only fresh
  installs; existing scaffolds stay wrong until that item lands.
- **The rest of the generated `AGENTS.md`**, whose `<!-- One paragraph: … -->` placeholders are a
  deliberate fill-in template, not a defect.

## Execution

Branch `feature/WI-001-infer-project-name`, cut from `main` 2026-08-15.

- `src/substitute.ts` — `repoFacts()` plus an optional third argument to `resolveParams`, seeding
  the params map with `repo` before manifest defaults are read.
- The five other `resolveParams` call sites in `src/check.ts`, `src/cli.ts` and `src/lifecycle.ts`
  now pass the root each already held. None needed a signature change of its own.
- `modules/instructions/module.toml` — default is `{{repo.dirname}}`; the comment that asserted the
  inference now explains why the default states it instead.
- `modules/README.md` — rule **9b-i**, the reserved namespace and its exemption from 9b.

**Deviation from the plan:** the plan said `resolveParams` "gains the reserved namespace" without
saying what happens when a caller has no root. Made it optional, returning `{}`, so an unresolved
`{{repo.dirname}}` stays visible rather than collapsing to `""` — the same bias `substitute`
already applies to every other unresolved reference, and the opposite of the silent blank that
produced this item. No call site actually exercises that path today; it is a guard, not a feature.

**Found mid-flight, not fixed here** (scope discipline, §6): `backlog-merged-status` fires on a
branch that has been cut but carries no commits yet, because its tip is still `main`'s tip and so
is trivially an ancestor. Every item worked with this skill will hit it between `git switch -c` and
the first commit. Recorded as a finding rather than widened into this item.

## Review

Each acceptance criterion, checked 2026-08-15 on this branch.

1. **Pass.** `init <tmp>/my-cool-app minimal` → `# AGENTS.md — my-cool-app`.
2. **Pass.** `add instructions --set=instructions.project_name=Chosen` → `# AGENTS.md — Chosen`;
   the override still beats the derived default.
3. **Pass.** That repo's `.ai/rungs.toml` records `project_name = "my-cool-app"` — the resolved
   literal, not the token, so every later command reads a real value.
4. **Pass.** A record hand-set to `project_name = ""` still reads `""` after `upgrade --apply`, and
   `AGENTS.md` was not renamed. Persisted params override the default, and `""` contains no `{{`,
   so the substitution pass leaves it alone.
5. **Pass.** `grep -rn '{{repo\.'` over a fifteen-module `fleet` install returns nothing.
6. **Pass.** `rungs check` → 20 pass, 0 fail. It reported 19/1 before the first commit on this
   branch; the failure was the merged-status false positive recorded above, and it cleared once the
   branch carried a commit — verified, not assumed.
7. **Pass.** `modules/README.md` rule 9b-i states the namespace, its exemption, and the incident.
