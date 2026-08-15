---
id: WI-005
title: End doctor with a recommended next command
type: feature
status: done
branch: feature/WI-005-doctor-next-step
created: 2026-08-15
updated: 2026-08-15
related: [WI-007]
epic:
children: []
---

## Proposal (rationale)

`npx @rungs/cli doctor` is the **advertised entry point** — it is the entire Install section of
[`README.md`](../../../README.md) and the first command a reader meets. On a repo that has none of
the modules it prints fifteen `absent` lines, a `0 present · 0 different paradigm · 15 absent`
tally, and a caveat about under-detection. Then it stops.

Measured 2026-08-15 against a bare repo (a `package.json` and one source file):

```console
  0 present · 0 different paradigm · 15 absent

  This reports presence, never quality. …
```

Nothing names `rungs init`, a profile, or `rungs add`. The first-run experience of a retrofit-first
tool is a wall of absences and no offered next move — and the maturity ladder, the one thing that
decides what a repo at this stage should install, is not consulted at the only moment it is most
useful.

The recommendation must be **rung-aware, not maximal**. `doctor` already knows what is present;
what it should say to a repo with nothing is `rungs init . tracked`, not a list of fifteen things
it could install. Selling rung 5 to a rung-1 repo is stated in the product brief as the most likely
way this tool does harm, so the suggestion is a design question, not a print statement — which is
why this is `feature` rather than `docs`.

There is a second case worth covering in the same item because it is the same missing sentence: a
repo where `doctor` finds modules present but **not installed by rungs** (adopted-by-hand), where
the useful next command is `rungs add <module>` and the reassurance is that nothing is overwritten.

Found while assessing first-user documentation completeness on 2026-08-15.

## Decision

`accepted` — 2026-08-15, as part of the first-user path.

## Plan

### Requirements

- `doctor` ends with a `Next` section naming **one** command.
- The command differs by what was detected, and is never the maximal install.
- A repo with nothing is pointed at `tracked`, with the reason a higher profile is not offered.
- A repo with hand-built structure is pointed at `add`, and told nothing is overwritten.
- A rungs repo is pointed at `upgrade --apply` when anything is stale or missing, `check` otherwise.
- The ADR-0005 caveat still prints. A recommendation must not displace the statement of what
  detection cannot see.

### Impacts

- [`src/cli.ts`](../../../src/cli.ts) `cmdDoctor` — appended after the caveat; nothing above changes.
- Read-only. `doctor` still writes nothing and still exits 0.
- **No ADR.** Criterion 5: which command to suggest is decided by the detection states the code
  already computes, and prose would state it less precisely.

### Approach

Four branches off the counts `cmdDoctor` already has — `ours`, `theirs`, stale/missing, and nothing
— each printing one cyan command and a short reason.

**The rung reasoning is the substance, not the printing.** Brief §4 names selling rung 5 to a rung-1
repo as the most likely way this tool does harm, so the empty-repo branch offers `tracked` and then
says *why not more*: higher profiles cost more than they return until the problem they answer
exists. A recommendation that listed everything installable would be the harm the maturity ladder
exists to prevent, delivered by the command meant to introduce the tool.

For hand-built repos the useful sentence is the reassurance, not the command — `add` on an existing
structure is the case people fear. So that branch spends two of its three lines on *nothing is
overwritten*.

Rejected: **offering to run it.** A read-only command that starts writing is a different contract,
and `doctor` is the one command a stranger runs against a repo they have not read.

### Acceptance criteria / tests

1. A repo with nothing detected → `rungs init . tracked`, with the rung reasoning.
2. A repo with hand-built structure and no install → `rungs add <those modules>`, with the
   never-overwritten reassurance.
3. A rungs repo, everything current → `rungs check`.
4. A rungs repo with a missing or stale file → `rungs upgrade --apply`.
5. The ADR-0005 caveat still prints in all four.
6. `rungs check` → 20 pass, 0 fail.

### Out of scope

- **Changing detection itself.** Signatures under-detect on purpose (ADR-0004); this item reads
  what detection already returns and adds a closing recommendation.
- **Making `doctor` interactive or offering to run the command.** A read-only command that starts
  writing is a different contract; if wanted, that is its own item.
- **The prose walkthrough a new user reads outside the terminal** — WI-007.

## Execution

Branch `feature/WI-005-doctor-next-step`, cut from `main` 2026-08-15. One addition to `cmdDoctor`
in [`src/cli.ts`](../../../src/cli.ts), after the ADR-0005 caveat. No other file changed.

The `theirs` branch names up to three detected modules rather than all of them, for the same reason
the empty branch offers one profile: a recommendation long enough to skim past is not a
recommendation.

**F-001 did not fire on this item, and the reason is diagnostic.** The gate reads `branch:` from the
item's frontmatter; this item was still `proposed` with an empty `branch:` while the code was
written, so there was nothing to compare. That confirms the mechanism recorded in F-001 — it is the
combination of a set `branch:`, a pre-review status, and a branch with no commits, not the branch
alone.

## Review

Checked 2026-08-15 against four fabricated repos.

1. **Pass.** A repo with `package.json` and one source file → `rungs init . tracked`, followed by
   the reasoning for not offering more.
2. **Pass.** A repo with a hand-written `docs/decisions/ADR-0001-x.md` and its README, never
   installed → `rungs add adr`, with the two reassurance lines. Detection classified it `theirs`
   without help.
3. **Pass.** This repo → `rungs check`.
4. **Pass.** A `tracked` install with `docs/backlog/TEMPLATE.md` deleted → `rungs upgrade --apply`.
5. **Pass.** The caveat prints above `Next` in all four; the recommendation is appended, not
   substituted.
6. **Pass.** `rungs check` → 20 pass, 0 fail.
