---
id: WI-001
title: Infer project_name from the repo directory, as its own default already promises
type: chore
status: proposed
branch:
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

*Empty until decided.*

## Plan

> Filled once `accepted`.

### Requirements

*Filled once `accepted`.*

### Impacts

*Filled once `accepted`.*

### Approach

*Filled once `accepted`.*

### Acceptance criteria / tests

*Filled once `accepted`.*

### Out of scope

- **The `--set` parsing trap and its documentation** — that is WI-002. This item is only about the
  default resolving correctly when nothing is passed.
- **Re-emitting `AGENTS.md` after install** — that is WI-003. Fixing inference helps only fresh
  installs; existing scaffolds stay wrong until that item lands.
- **The rest of the generated `AGENTS.md`**, whose `<!-- One paragraph: … -->` placeholders are a
  deliberate fill-in template, not a defect.

## Execution

*Not started.*

## Review

*Not started.*
