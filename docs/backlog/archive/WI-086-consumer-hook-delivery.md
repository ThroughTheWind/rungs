---
id: WI-086
title: Deliver the declared shell-safety hook to consumers, or report that a harness cannot carry it
type: feature
status: done
branch: feature/WI-086-consumer-hook-delivery
created: 2026-09-06
updated: 2026-09-06
related: [WI-085, WI-077, F-054, ADR-0001, ADR-0002, ADR-0010]
epic: WI-085
children: []
---

## Proposal (rationale)

The `instructions` module registers `instructions-shell-backticks` as a gate with
`trigger = "pre-tool-use"` and `matcher = "Bash|PowerShell"`, and its table declares refuse patterns
with self-tests in both directions. [F-054](../FINDINGS.md): a fresh tracked consumer receives the
registry entry and nothing else — no Claude hook configuration, no engine behind the `shell-safety`
name, and no degradation row for a harness that cannot run hooks. The README's
`modules/README.md` says a hook "is emitted into harnesses that support it and reported as degraded
for those that do not"; neither half happens. The protection rift-forge paid for nine times is a
declaration nobody dispatches.

## Decision

`accepted` — 2026-09-06 under [WI-085](../items/WI-085-existing-promises-remediation.md). Implement the
engine centrally and dispatch it through the consumer's pinned launcher; record the dispatch
contract as ADR-0010 (written with the implementation, on this item's branch) so that ADR-0002's
no-scripts boundary is resolved rather than quietly crossed.

## Plan

### Requirements

- A `shell-safety` engine evaluates a command string against the table's `refuse` patterns; its four
  shipped fixtures execute under `gates-self-tests-both-directions`.
- A `rungs hook <gate-id>` command reads the harness payload from stdin, evaluates the named hook
  gate, exits 2 with the table's message when a pattern matches, 0 otherwise, and never blocks on
  its own failure to read input or on an unknown tool.
- Installing or upgrading `instructions` into a repo whose harness matrix includes `claude` merges
  one `PreToolUse` entry into `.claude/settings.json` whose command is the pinned launcher
  (`node .ai/rungs.mjs hook instructions-shell-backticks`), preserving every existing key and hook,
  and adding nothing on a repeat.
- A harness that cannot express hooks (`copilot`, `cursor`, `agents-md`) gets a row in
  `.ai/render-report.md` saying the protection is Claude-only, per ADR-0001's degradation table.
- The ejected runner keeps `hook <gate-id>` working from its frozen table, so the settings entry
  does not point at a command ejection removed (WI-077's retained surface widens to `check` and
  `hook`, recorded there).

### Impacts

- `src/engines.ts` (engine map), a new hook engine module, `src/cli.ts` (`hook` command and the
  install/upgrade phase), `src/help.ts` (command count moves 14 → 15, gated by
  `docs-version-claims` and `module-commands-exist`), `src/render.ts` (report rows), `src/selftest.ts`
  (hook fixtures execute), `src/lifecycle.ts` (upgrade registers hooks; eject keeps `hook`),
  `modules/instructions/module.toml` (version 1.2.0 → 1.3.0), the site claims snapshot.
- Cost: one launcher invocation per matching tool call. The launcher runs the pinned package
  through `npm exec`, which is slower than a local script; measured and recorded in Review rather
  than assumed.

### Approach

Engine and CLI first, then the settings merge, then the render-report row, then eject. The settings
merge identifies its own entry by the exact command string, because JSON has no comment markers for
a managed block. The consumer's file is never rewritten wholesale: parse, add the missing entry,
serialise with the file's indentation. A malformed `settings.json` is refused with a message, not
overwritten.

### Acceptance criteria / tests

1. `runSelfTests` on the four `instructions-shell-backticks` fixtures reports `ok, ok, ok, ok`, and
   `rungs check` here no longer lists them among the unrun.
2. A fresh tracked consumer built from the packed candidate carries the settings entry; piping the
   motivating payload (`node -e "…\`…\`"`) into the installed hook command exits 2 with the table's
   message; `node scripts/edit.mjs`, `cat <<'EOF' > a.md` and a non-Bash tool exit 0.
3. Re-running `init`/`add`/`upgrade --apply` leaves `.claude/settings.json` byte-identical, and a
   pre-existing unrelated hook in that file survives the first install.
4. With `--copilot` or a non-Claude matrix, the render report names the hook as not emitted for
   that harness; nothing is written under `.claude/`.
5. After `eject`, `node .ai/rungs.mjs hook instructions-shell-backticks` still rejects the
   motivating command and accepts the safe forms, with the package prefix removed.
6. Focused tests, full `npm test`, all registered gates, `rungs modules`, and the site build pass.

### Out of scope

- Copying this repository's private `.claude/hooks/no-inline-interpreter-scripts.mjs` into
  consumers; it is a different rule with a different scope and stays local.
- Hook support for harnesses that have no hook mechanism; a new dispatch target is a change to
  ADR-0001's matrix.
- Timing optimisation of the launcher path beyond measuring and recording it.

## Execution

Executed 2026-09-06 on `feature/WI-086-consumer-hook-delivery`, cut from `main` `f7db44e` (WI-077
landed). [ADR-0010](../../decisions/ADR-0010-hooks-dispatch-through-the-launcher.md) records the
dispatch contract first; the code follows it.

- `src/hook-engine.ts` — `evaluateShellSafety(table, command)` over the table's `refuse` patterns;
  a pattern that does not compile is a finding, not a skip. `ENGINES['shell-safety']` exists so the
  name is implemented, and answers a file scan with a finding rather than examining nothing.
- `src/hooks.ts` — `hookVerdict` (2 blocks, 0 permits, 1 never blocks; the payload is read only
  after the gate is known to be a runnable hook), `registerHooks` (merge into
  `.claude/settings.json` keyed by the exact command, preserving indentation and newline
  convention, adding nothing on a repeat), `preflightHooks` (a malformed settings file refuses the
  whole install before any write), `hookRenderEntries` (one report row per hook per harness,
  degraded where the harness has no hook mechanism).
- `src/cli.ts` — the `hook` command; a third install phase after gates; the render report in
  `add`, `render` and the hook registration in `upgrade --apply`. `src/help.ts` gains the command,
  so the count is fifteen and `docs/roadmap.md` says so.
- `src/selftest.ts` — a hook engine's fixture is its input command; the four shipped fixtures now
  execute (`rungs check` here: 45 unrun → 41).
- `src/lifecycle.ts`, `src/ejected-runner.ts` — the ejected launcher retains `hook`, the runner
  evaluates it from the frozen table, and the direct gate path refuses a hook with exit 2.
- `modules/instructions` 1.2.0 → 1.3.0; the site claims snapshot regenerated.

**Deviations, with reasons.**

1. The plan measured the launcher's latency in Review; it is recorded there from actual runs.
2. A harness matrix without Claude is reachable from the CLI only through an install record
   (`--copilot` adds Copilot beside Claude), so the degradation-only path is proven through
   `registerHooks`/`hookRenderEntries` with an explicit matrix rather than through a CLI flag.

**Found on the way, recorded rather than folded in.** The smoke run ejected *after* a
`rungs add instructions` on the initialised consumer and was refused with "launcher edited". The
cause is not the hook: `add` after `init` rewrites `.ai/rungs.toml` with only that run's modules
and drops every existing hash — [F-061](../FINDINGS.md), high, pre-existing, out of this item's
scope.

## Review

Against each acceptance criterion, 2026-09-06, Windows 11, Node `v22.22.3`, npm `10.9.8`:

1. **Fixtures execute.** `runSelfTests` on the four `instructions-shell-backticks` fixtures reports
   `ok, ok, ok, ok` (`test/core.test.js`, "the shell-safety hook engine…"); `node src/cli.ts check`
   here reports 41 unrun fixtures where it reported 45.
2. **Consumer dispatch.** The packed journey asserts the settings entry
   `{ matcher: "Bash|PowerShell", hooks: [{ type: "command", command: "node .ai/rungs.mjs hook
   instructions-shell-backticks" }] }` after a tracked init, then dispatches through the installed
   CLI: the motivating command exits 2 with "Blocked by instructions-shell-backticks", the quoted
   heredoc and a script file exit 0. The core regression adds a non-Bash tool (0), unreadable input
   (0), an unknown gate (1) and a runner gate (1).
3. **Idempotence and preservation.** A consumer settings file with its own permission and its own
   `Edit` hook, indented with four spaces, keeps both, keeps its indentation, gains one entry, and is
   byte-identical after a repeat `registerHooks`, a dry run, and (in the smoke run) `upgrade --apply`.
4. **Degradation.** The render report carries `hook … | agents-md | **not emitted** | hook not
   emitted: agents-md has no hook mechanism…`; a `copilot, agents-md` matrix yields two degradation
   rows, no target, and writes nothing under `.claude/`. A matrix without Claude is reachable from the
   CLI only via an install record, so this is proven through the functions with an explicit matrix.
5. **After ejection.** Through the ejected forwarder, with the package prefix renamed away: motivating
   command 2, safe forms 0; the direct runner refuses the hook gate with exit 2; the registry keeps
   `kind = "declared"` for it. Asserted in both the core regression and the packed journey.
6. **Suite and gates.** Serial `node --test --test-concurrency=1 test/*.test.js`: 146 tests, 142
   pass, 1 fail, 3 platform skips, 140 s. The one failure was a stale exclusion of `shell-safety`
   from the engine-map/selector equality, written when the engine did not exist; the exclusion is
   removed and that test passes alone. `node src/cli.ts check`: 30 pass. `node src/cli.ts modules`:
   audit clean, `instructions` 1.3.0. Site claims regenerated.

**Cost, measured** (`.scratch/hook-latency.mjs`, three runs each, warm machine): the pinned
launcher path — `npm exec` of the published `@rungs/cli@0.4.0` — takes **1,077 / 1,056 / 1,235 ms**
per tool call (that version has no `hook` command, so it exits 1; the time is the launcher's); the
CLI invoked directly takes 93 / 98 / 87 ms; the ejected forwarder 99 / 110 / 97 ms. So a consumer
pays roughly one second per matching tool call for the pinned path, which is ADR-0010's revisit
trigger 1 sitting close to its threshold. Recorded here, not hidden; an inlined-script mode remains
the named alternative if that second proves too much.

**Pending.** The exact-SHA OS/Node matrix has not run: the branch is not pushed.
