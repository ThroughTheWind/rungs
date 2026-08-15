---
id: WI-003
title: Stop .ai/rungs.toml instructing a fix that rungs render cannot perform
type: chore
status: proposed
branch:
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

- **Making `rungs upgrade` re-substitute parameters into diverged files.** `upgrade` has its own
  never-touch-what-you-edited contract; changing it is a separate item and likely an ADR.
- **The `installed` date and hash bookkeeping in the same file** — correct as far as measured, and
  not part of this defect.
- **Inferring `project_name`** — WI-001. This item does not depend on it: the instruction is wrong
  for every `files/` parameter, not just that one.

## Execution

*Not started.*

## Review

*Not started.*
