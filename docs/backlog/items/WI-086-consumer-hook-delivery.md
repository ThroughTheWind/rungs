---
id: WI-086
title: Deliver the declared shell-safety hook to consumers, or report that a harness cannot carry it
type: feature
status: planned
branch:
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

`accepted` — 2026-09-06 under [WI-085](WI-085-existing-promises-remediation.md). Implement the
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

Not started.

## Review

Not started.
