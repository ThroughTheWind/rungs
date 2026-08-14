# AGENTS.md — rungs

Entry point for agents that read the open `AGENTS.md` standard (Codex and others).

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
