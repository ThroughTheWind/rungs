# AGENTS.md — rungs

Entry point for agents that read the open `AGENTS.md` standard (Codex and others).

## Repo map

<!-- rungs:begin repo-map -->
<!-- Generated. Run `rungs render` after moving directories. -->
<!-- rungs:end repo-map -->

## Canonical instructions

[`CLAUDE.md`](CLAUDE.md) is the canonical, shared agent policy for this repository. It holds
the project context, the evidence rule, extraction discipline, and repo conventions.

Before starting work:

1. Read [`CLAUDE.md`](CLAUDE.md) in full. Do not substitute a summary or read only the section
   that looks relevant.
2. Read [`README.md`](README.md) for the current phase — this repo is sequenced, and work that
   belongs to a later phase should be recorded rather than done.
3. Treat every mandatory rule in `CLAUDE.md` as applying to this task.

This bridge deliberately does not duplicate `CLAUDE.md`; two large copies would let the two
harnesses silently drift. If they appear to disagree, `CLAUDE.md` is the source of truth.
System, developer, and user instructions still take precedence over repository guidance.

> Note: this two-file bridge is itself pattern `agents-md-bridge` in the
> [pattern catalog](docs/research/pattern-catalog.md), extracted from `rift-forge`. The
> single-source-with-thin-bridge shape is what the CLI should generate, rather than emitting
> two full copies.

<!-- rungs:begin gates@1.0.0 -->
## Gates

`rungs check` runs everything in [`.ai/gates.toml`](.ai/gates.toml) — fast tier constantly, full
tier at a boundary. **Never weaken a gate to make a change pass**; if a gate is wrong that is its
own work. Every rule you add declares `gated` or `review-only` — there is no third option. Broke a
rule that already existed? Do not restate it, make it mechanical: **`/harden-rule`**.
<!-- rungs:end gates -->

<!-- rungs:begin backlog@1.0.0 -->
## Work tracking

Non-trivial work is a **work item** (`WI-###`) under
[`docs/backlog/`](docs/backlog/README.md) — that file is the methodology and is mandatory reading
before your first item. Branch `feature/WI-###-slug` off
`main`; claim ids from `NEXT-ID` on your own branch; never scope-creep an item.
Status must agree with git, and `rungs check` enforces it. Execute one with **`/work-item`**.
<!-- rungs:end backlog -->

<!-- rungs:begin findings@1.0.0 -->
## Findings

Noticed something out of scope? Record it in [`docs/backlog/FINDINGS.md`](docs/backlog/FINDINGS.md) via **`/record-finding`** —
rows, not files, because recording one must cost almost nothing. A finding is the observation; a
work item is the decision. Closing one always carries a written reason, dismissals included.
<!-- rungs:end findings -->

<!-- rungs:begin adr@1.0.0 -->
## Decisions

Significant decisions are `ADR-####` records in [`docs/decisions/`](docs/decisions/README.md).
**Check the admission rule before writing one** — five criteria, all must hold, or the content
belongs in the document that already owns the topic. Records are immutable: supersede, never edit,
never delete.
<!-- rungs:end adr -->

<!-- rungs:begin session@1.0.0 -->
## Session state

Read [`.ai/session.md`](.ai/session.md) first. Treat **Active constraints — do not reopen** as binding:
settled decisions, not suggestions. Close a session with **`/close-session`**.
<!-- rungs:end session -->

<!-- rungs:begin skills@1.0.0 -->
## Skills

Multi-step procedures live in [`.claude/skills/`](.claude/skills/) and load only when used. Authoring rules are
in [`.ai/rules/`](.ai/rules/README.md): six spec frontmatter fields and no more, a description that
lists the phrases people actually say, and **every skill names its neighbours** — the failure past a
dozen skills is the wrong one firing and running to completion.
<!-- rungs:end skills -->

<!-- rungs:begin instructions@1.1.0 -->
## Repo map

<!-- rungs:begin repo-map -->
<!-- Generated. Run `rungs render` after moving directories. -->
<!-- rungs:end repo-map -->
## Execution boundary

Before an agent command runs, name the execution unit, what filesystem/environment/credential/network
surfaces cross into it, and which controls are absent. This repository guidance declares boundaries;
it does not install a sandbox, transport, rollback, or least-privilege runtime.
<!-- rungs:end instructions -->
