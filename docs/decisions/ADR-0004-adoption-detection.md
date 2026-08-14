---
id: ADR-0004
title: "Adoption detection: map what exists, never migrate it"
status: accepted
date: 2026-08-14
---

# ADR-0004 — Adoption detection: map what exists, never migrate it

- **Status:** accepted
- **Date:** 2026-08-14
- **Phase:** 3 (product definition) — **closes Phase 3**
- **Builds on:** [ADR-0003](ADR-0003-module-definition-format.md) (the manifest this adds a block
  to), [ADR-0002](ADR-0002-stack-and-runtime-footprint.md) (`command` gates, which turn out to be
  most of the adoption surface)

---

## Context

[The brief §6](../design/product-brief.md) states the requirement: *"`add` must adopt, not
overwrite. A CLI that clobbers `docs/backlog/README.md` because it wants to install its own is
useless to exactly the repos it was extracted from."*

The four source repos show four genuinely different starting states for one module (`backlog`):

| Repo | What exists | The right answer |
| --- | --- | --- |
| `rift-forge` | `docs/backlog/` with a 481-line methodology, `WI-###`, 102 live + 543 archived items, sprints, a board, `check-ids.mjs` | **Superset.** Adopt everything, install nothing |
| `axiom-mesh` | `M##-T#` milestones, `AD-###` defects, `DF-###` design flaws — a different paradigm serving the same function | **Paradigm difference.** Report it, act on nothing |
| `hexguard` | `docs/.ai/backlog/` with briefs; no ids, no lifecycle, no status | **Partial.** Adopt the location, offer the lifecycle |
| `hexguard-templates` | 20 `plan-*.md` docs and spec story ids; no work-item object at all | **Absent but adjacent.** Create, and say what it does *not* replace |

A detector that gets any of these wrong does real damage. And the temptation — infer conventions,
auto-configure, merge intelligently — is the confidently-wrong probe this repo keeps warning about,
applied to somebody's actual files.

## Decision

**Adoption is a mapping, not a migration. `add` records where a repo's equivalent lives; it never
moves, rewrites, or converts the user's files.**

Three parts: what a module declares, what detection may conclude, and what `add` does with each
outcome.

### 1. Modules declare a `[detect]` block

Added to the ADR-0003 manifest:

```toml
[detect]
# Presence is decided by these, and only these.
paths   = ["docs/*/items/**", "docs/*/BACKLOG.md", "docs/*/TEMPLATE.md"]
markers = ["rungs:begin backlog"]

# A different system serving the same function. Never auto-adopted.
[[detect.paradigm]]
id      = "milestones"
paths   = ["docs/**/milestones/index.md"]
compare = "../research/synthesis.md#33-unit-of-work"

# Params this module can PROPOSE from the repo. Never concludes presence.
[[detect.infer]]
param   = "id_prefix"
pattern = "\\b([A-Z]{1,6})-\\d{1,4}\\b"
min     = 20                 # below this, propose nothing
scope   = ["docs/**/*.md"]
```

### 2. Presence and parameters are decided by different evidence

**This separation is the core of the decision, and it is measured.** Counting id patterns across
the corpus on 2026-08-14:

| Repo | Pattern | Matches in `docs/` |
| --- | --- | --- |
| `rift-forge` | `WI-###` | **28,305** |
| `rift-forge` | `F-###` | 4,540 |
| `axiom-mesh` | `M##-T#` / `AD-###` | 224 / 100 |
| `hexguard` | `WI-###` | 0 |
| **`hexguard-templates`** | **`FOUND-US-###`** | **207** |

The last row is the reason for the rule. `FOUND-US-###` is dense, well-formed, and **is not a
backlog** — it is a spec story id belonging to the `specs` module. A detector that concluded
"backlog present" from id density would be confidently wrong on a real repo, in the corpus, today.

So:

- **Presence** is decided by `paths` and `markers` only — file-existence facts.
- **Parameters** are *proposed* by `infer`, and only once presence is already established. A
  proposal is always shown before use, never silently applied.

### 3. Six outcomes, and only two are safe unattended

Evaluated **per artifact**, not per module — `rift-forge` is a superset on the board and absent on
the ledger, and a module-level verdict would be wrong for both.

| # | State | How it is recognized | `add` does |
| --- | --- | --- | --- |
| 1 | **Absent** | No `paths`, no `markers`, no paradigm match | **Create.** Safe, unattended |
| 2 | **Ours, current** | `rungs.toml` records it; content hash matches | **Upgrade or no-op.** Safe, unattended |
| 3 | **Ours, diverged** | Recorded; hash differs | **Report and leave alone.** Divergence is a decision ([brief §7](../design/product-brief.md)) |
| 4 | **Theirs, equivalent** | `paths` matched, possibly at other locations/params | **Adopt**: record their paths and params in `rungs.toml` as overrides; install only the genuinely missing parts |
| 5 | **Theirs, different paradigm** | `detect.paradigm` matched | **Refuse to act.** Print the comparison from the research and the three real options |
| 6 | **Unknown** | Something at the target path matching nothing | **Stop and ask.** Never write |

**There is no `--force`.** A flag that overwrites someone's considered system is a flag that gets
used at 2am; the escape is to move the file yourself and re-run, which is visible in git.

### 4. Adoption writes one thing: the mapping

```toml
[modules.backlog]
version  = "1.0.0"
state    = "adopted"
adopted  = 2026-08-14
managed  = false                       # their files, not ours — upgrade never touches them
root     = "docs/backlog"
params   = { id_prefix = "WI" }
installed = ["gates/backlog-ids", "skills/record-finding"]   # only the missing parts
```

`managed = false` is what makes this safe: `upgrade` and `render` skip adopted artifacts entirely.
The CLI learns where things are; it does not acquire them.

### 5. One detection engine, three consumers

- **`add`** — decide the six states above.
- **`doctor`** — run detection on a repo that never installed anything, and report against the
  research. On `rift-forge` that is: *82 gates and no ledger; `CLAUDE.md` is 1513 lines against a
  200-line vendor guideline; `findings` present and healthy.*
- **Phase 6 dogfood** — diff what the modules would produce against what each source repo built by
  hand. **A module whose `[detect]` block misclassifies any of the four is not finished**, which is
  a concrete, checkable acceptance criterion rather than a hope.

`doctor` on an uninstalled repo is likely the highest-value entry point in the whole tool: it
carries the corpus's findings to a repo that has installed nothing.

### 6. Signatures are biased toward false negatives

**A false negative creates something next to what exists — visible, in git, reversible. A false
positive makes the CLI believe wrong things about a repo and act on that belief later.** The two
errors are not symmetric, so signatures are written to under-detect.

This is [`read-the-negation`](../research/pattern-catalog.md) generalized: `rift-forge` learned it
by shipping a guard that was wrong in both directions and one that refused its own fix. The rule
here is the same shape — **when a signature is uncertain, it must fail to match.**

### Pins — what detection does not tell you

- **Nothing about quality.** Detection reports presence, never that a system is good, complete, or
  working. `doctor`'s findings are questions, per [ADR-0005](ADR-0005-self-instrumentation.md).
- **Nothing about semantics.** A matched `paths` glob means files are where a backlog's files
  would be. It does not mean the lifecycle, statuses, or discipline match.
- **Adopted artifacts are unverified by construction** — `managed = false` means the CLI has
  never read them for correctness and never will.

## Consequences

**Good**

- The dangerous operation is removed rather than guarded: `add` cannot overwrite a considered
  system because it never writes to one.
- Every source repo gets something real. `rift-forge` — which has more backlog machinery than the
  module ships — gains the ADR-0005 ledger by registering its 82 existing gates as `command` gates,
  while nothing it built is touched. **That is the clearest demonstration that adoption beats
  scaffolding.**
- `doctor` becomes useful before any install, which is the realistic first contact.
- Phase 6 gets a pass/fail criterion.

**Costs and risks**

- **`add` is chattier than a scaffolder.** Accepted — the alternative is a tool nobody runs twice.
- **Partial installs produce mixed-ownership repos**, some artifacts managed and some adopted.
  `rungs.toml` is the record and `doctor` prints the split.
- **Signature maintenance.** Each module carries a `[detect]` block that must stay true as
  conventions drift; the corpus test set is what keeps it honest.
- **Under-detection is chosen, so some adoptable structures will be missed** and a near-duplicate
  created beside them. Visible and reversible, and the trade is deliberate.

## Alternatives considered

**Content-based inference** — read the repo, infer conventions, configure automatically. Rejected:
`hexguard-templates`'s 207 `FOUND-US-###` matches are the measured counter-example, and a wrong
inference is silently wrong. Kept in the narrow, supervised form of `detect.infer`.

**Ask the user everything** — no detection, prompt for every path and param. Rejected: it makes
`add` unusable on a repo with 15 modules and pushes the corpus knowledge back onto the user, which
is the thing the CLI exists to avoid.

**Overwrite with a backup** (`--force` plus `.bak`) — rejected. A backup file is not a decision
procedure, and the destructive path existing at all guarantees it is taken.

**Migrate on adopt** — convert `M##-T#` to `WI-###`, rewrite `docs/.ai/backlog/` into
`docs/backlog/`. Rejected outright: it is a repo-wide rewrite of somebody's working system,
justified by a signature match. Even offered interactively it would be the most dangerous thing the
tool could do.

**Module-level verdicts instead of per-artifact** — rejected: `rift-forge` is simultaneously a
superset and a gap for the same module, so a single verdict is wrong in one direction or the other.

## Revisit triggers

1. **A source repo is misclassified** during Phase 6 → fix the signature, and add the case to the
   test set rather than loosening the rule.
2. **Under-detection produces duplicates in practice**, repeatedly, on structures a human calls
   obvious → the bias may need per-module tuning; it does not get inverted.
3. **Users start hand-editing `rungs.toml` mappings** → the adopt flow is not expressive enough;
   extend the mapping schema, not the automation.

## Admission check

Against [the rule](README.md): (1) constrains every module's `[detect]` block and the whole `add`
flow ✅ · (2) content-based inference and migrate-on-adopt were real alternatives, rejected with
measured reasons ✅ · (3) a wrong choice here damages users' repos, which is worse than costly ✅ ·
(4) not owned elsewhere ✅ · (5) not an implementation detail — it is a safety promise ✅.
