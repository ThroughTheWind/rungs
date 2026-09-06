---
id: ADR-0010
title: "A hook is dispatched through the consumer's pinned launcher to a central engine"
status: accepted
date: 2026-09-06
---

# ADR-0010 — A hook is dispatched through the consumer's pinned launcher to a central engine

- **Status:** accepted
- **Date:** 2026-09-06
- **Phase:** post-7, from [WI-086](../backlog/archive/WI-086-consumer-hook-delivery.md) under
  [WI-085](../backlog/items/WI-085-existing-promises-remediation.md)
- Extends [ADR-0001](ADR-0001-multi-harness-rendering.md) (P4 hooks are Claude-only and degrade
  loudly) and [ADR-0002](ADR-0002-stack-and-runtime-footprint.md) (no gate scripts in a
  scaffolded repo; engines live in the CLI).

---

## Context

[`modules/README.md`](../../modules/README.md) says a hook "is a gate with a lifecycle trigger
instead of a runner trigger", emitted into harnesses that support it and reported as degraded for
those that do not. The `instructions` module declares one — `instructions-shell-backticks`,
`trigger = "pre-tool-use"`, a `[shell_safety]` table with refuse patterns and four fixtures — and
[F-054](../backlog/FINDINGS.md) found that no consumer receives anything but the registry entry: no
engine, no harness configuration, no degradation row.

Delivering it forces a decision ADR-0002 did not make. A harness runs a hook as a **command** on
every matching tool call. There is no runner process to host an engine, so the command must either
be a script written into the consumer — which ADR-0002 (b) forbids for gates, and for the stated
reason: an engine fix would need re-rendering across every repo — or an invocation of something the
consumer already has.

This repository's own `.claude/hooks/no-inline-interpreter-scripts.mjs` is a private script with a
different rule and a wider scope. Copying it into consumers would make the module ship a script
after all, and a script the module's table does not describe.

## Decision

**A hook's command is the consumer's pinned launcher invoking a central engine:
`node .ai/rungs.mjs hook <gate-id>`.** The engine (`shell-safety`) lives in the CLI like every
other engine; the table lives in the module; the consumer's harness configuration names only the
launcher and the gate id.

- **Claude Code** is the one harness with a hook mechanism (ADR-0001). Installing or upgrading a
  module that declares a hook merges one `PreToolUse` entry into `.claude/settings.json`, keyed by
  its exact command string, preserving every existing key and entry and adding nothing on a repeat.
- **Every other harness** gets a row in `.ai/render-report.md` stating that the hook is not
  emitted there and the protection is Claude-only — ADR-0001's degradation table, applied.
- **Exit codes follow the harness contract**: 2 blocks with the table's message; 0 permits; 1 is
  "the hook itself could not run" and never blocks, because a guard that fails closed on its own
  misconfiguration blocks every tool call and is disabled within the hour.
- **Ejection keeps the hook working.** The ejected launcher's retained surface is `check` and
  `hook`, both served by the bundled runner from the frozen table (WI-077). An adapter that pointed
  at a command ejection removed would block every tool call in an ejected repo.

## Consequences

**Good**

- No script enters the consumer; engine fixes still arrive with a CLI version, through the same
  pinned launcher every instruction and workflow already call.
- The hook is pinned to the exact CLI version the repository reviewed, like every other command.
- The declared protection is real: the motivating command is refused, the safe forms are accepted,
  and both are asserted by the module's own fixtures executing.

**Costs and risks**

- **Latency on every matching tool call.** The launcher resolves the pinned package through
  `npm exec`; measured in WI-086's review rather than assumed here. A hook that takes seconds is a
  hook people learn to resent, and this record does not pretend otherwise.
- **`npm exec` must be able to resolve the pinned version** — from its cache offline, or from the
  registry. When it cannot, the launcher exits non-zero and the hook reports 1 (broken, not
  blocking), so an offline session loses the guard rather than its shell.
- `.claude/settings.json` is a consumer-owned JSON file with no room for managed-block markers; the
  merge identifies its entry by command string, which is a weaker claim of ownership than a marker.

## Alternatives considered

**Emit a generated hook script with the table's patterns inlined.** Fast (Node startup only) and
works offline and after ejection. Rejected: it is exactly the script ADR-0002 refuses to write —
a fix to the engine would need re-rendering into every consumer, and a polyglot repo would gain a
`.mjs` it did not ask for. Revisit trigger 1 keeps the door open on measurement.

**Copy this repository's private hook.** Rejected: different rule, different scope, undescribed by
the module's table; the module would ship a script its declaration does not match.

**Declare the hook and ship nothing, documenting that dispatch is the consumer's job.** Rejected:
it is the current state, and F-054 is what it looks like from a consumer.

**Fail closed when the hook cannot run.** Rejected on the same ground `gates` uses for the runner in
reverse: an unknown blocks a *merge*, but an unknown that blocks *every shell command* is turned
off, and a disabled guard protects nothing.

## Revisit triggers

1. **Measured launcher latency exceeds what a per-tool-call hook can carry** (an order of one
   second, sustained, on a warm cache) → reconsider the inlined-script alternative as an explicit,
   consumer-chosen mode, with ADR-0002 amended to name it.
2. **A second harness gains a hook mechanism** → it joins ADR-0001's matrix and this dispatch
   applies to it unchanged.
3. **A hook needs consumer-specific data the table cannot carry** → that is a parameter, not a
   script; the module format decides it.

## Admission check

Against [the rule](README.md): (1) constrains every future hook-shipping module ✅ · (2) an inlined
script and copying the private hook were both real alternatives, rejected for stated reasons ✅ ·
(3) reversing after consumers carry the settings entry means editing every consumer's harness
configuration ✅ · (4) not owned by a module doc — it resolves a gap between two ADRs ✅ · (5) not an
implementation detail; the exit-code and ejection rules are promises to consumers ✅.
