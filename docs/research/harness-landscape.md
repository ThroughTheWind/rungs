# Harness landscape — format snapshot

> **Measured 2026-08-14** from vendor documentation. This is a fast-moving surface; every claim
> below is dated and sourced. **Authoritative for:** what each harness reads and which frontmatter
> fields it accepts. **Not authoritative for:** what ai-cli does about it — that is
> [ADR-0001](../decisions/ADR-0001-multi-harness-rendering.md).

The four source repos in [`repos/`](repos/) were built between 2026-03 and 2026-08 and **do not
reflect the current landscape**. Two things changed underneath them, and both shrink the problem
they were solving:

1. **Agent Skills became an open standard** (agentskills.io, from Anthropic, adopted by 45+
   clients). Procedures are now portable by default.
2. **Every major harness gained path-scoped rules** — including Claude Code, via `.claude/rules/`
   with `paths:` frontmatter. `rift-forge`'s 1513-line `CLAUDE.md` now has a native fix.

---

## 1. The four primitives

Agentic configuration is not one thing. It is four, with very different portability:

| Primitive | What it is | Loads when | Portability (2026-08-14) |
| --- | --- | --- | --- |
| **P1 — Always-on context** | Project facts, conventions, routing | Every session | **Near-portable.** `AGENTS.md` is the de facto standard; Claude Code needs a one-line bridge |
| **P2 — Path-scoped context** | Rules for one area of the tree | A matching file is read | **Fragmented.** Three incompatible frontmatter dialects |
| **P3 — Procedures** | Multi-step workflows, invoked by name or intent | Invoked, or matched by description | **Standardized.** Agent Skills, 45+ clients |
| **P4 — Enforcement hooks** | Shell commands at lifecycle events | A tool call fires | **Not portable.** Vendor-specific, no standard |

---

## 2. P3 — Agent Skills (the standardized one)

**Format:** a folder containing `SKILL.md` (YAML frontmatter + markdown body), optionally with
`scripts/`, `references/`, `assets/`. Loaded by progressive disclosure — name + description at
startup (~30–50 tokens per skill), full body on activation, referenced files on demand.

**Spec frontmatter fields — the portable set (6):**

| Field | Notes |
| --- | --- |
| `name` | Required by the spec. Lowercase, numbers, hyphens |
| `description` | Required by the spec. **The routing surface** — third person, leads with the use case, lists the phrases users actually say |
| `license` | |
| `compatibility` | Environment requirements, ≤500 chars |
| `metadata` | Free-form map for your own tooling |
| `allowed-tools` | Tools pre-approved for the invoking turn |

**Claude Code extensions — non-spec:** `disable-model-invocation`, `user-invocable`,
`disallowed-tools`, `context`, `arguments`, and others. Claude Code accepts all of them. Outside
Claude Code, claude.ai skill uploads / the Skills API / `package_skill.py` accept **only the six
spec fields** and fail with a hard error on anything else:

> `Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name`

Cursor documents its own optional `paths` (globs limiting availability) and
`disable-model-invocation` — overlapping but not identical to Claude Code's extension set.

**Discovery directories** — this is the part that still differs:

| Directory | Claude Code | GitHub Copilot | Cursor |
| --- | --- | --- | --- |
| `.claude/skills/` | ✅ | ✅ | ✅ *(documented as legacy compatibility)* |
| `.agents/skills/` | ❌ | ✅ | ✅ |
| `.github/skills/` | ❌ | ✅ | ❌ |
| `.cursor/skills/` | ❌ | ❌ | ✅ |
| `~/.claude/skills/` · `~/.copilot/skills/` · `~/.agents/skills/` · `~/.cursor/skills/` | personal scope, per vendor | | |

**Consequences:**

- `.claude/skills/` has the **widest coverage today (3/3)** but is vendor-named and Cursor labels
  its support *legacy*.
- `.agents/skills/` is the **neutral direction (2/3)** and Claude Code does not read it.
- **There is no directory all three read that is not vendor-named.**
- Claude Code also loads nested `.claude/skills/` below the working directory, on demand — a
  monorepo package can carry its own.

## 3. P1 — Always-on context

| Harness | Reads | Notes |
| --- | --- | --- |
| **Claude Code** | `CLAUDE.md`, `./.claude/CLAUDE.md`, `CLAUDE.local.md`, `~/.claude/CLAUDE.md`, managed-policy paths | **Does not read `AGENTS.md`.** Walks up the tree, concatenating; subdirectory files load on demand |
| **GitHub Copilot** | `.github/copilot-instructions.md`, `AGENTS.md` | |
| **Codex / most others** | `AGENTS.md` | Nested files cascade global → project → folder, concatenated not replaced |
| **Cursor** | `.cursor/rules/*.mdc` with `alwaysApply: true`, `.cursorrules` (legacy) | |

**The Claude bridge, from the vendor's own docs:** a `CLAUDE.md` whose first line is `@AGENTS.md`
(an import, expanded at launch), with Claude-specific content appended below. A symlink also
works, but **on Windows a symlink needs Administrator or Developer Mode**, so the import is the
portable form.

**Vendor size guidance:** *"target under 200 lines per CLAUDE.md file. Longer files consume more
context and reduce adherence."* This is direct vendor confirmation of the `core-size-budget`
pattern that [`repos/rift-forge.md`](repos/rift-forge.md) derives from a 1513-line counter-example.

`@path` imports load at launch — they organize, they do **not** reduce context.

## 4. P2 — Path-scoped context (the fragmented one)

Same idea in every harness, three incompatible dialects:

| Harness | Location | Frontmatter | Scoping granularity |
| --- | --- | --- | --- |
| **Claude Code** | `.claude/rules/*.md` (recursive) | `paths:` — YAML list of globs | Glob. No `paths` ⇒ loads every session at `.claude/CLAUDE.md` priority |
| **GitHub Copilot** | `.github/instructions/*.instructions.md` | `applyTo:` glob(s), `description:`, `excludeAgent:` | Glob |
| **Cursor** | `.cursor/rules/*.mdc` | `description:`, `globs:`, `alwaysApply:` | Glob, plus description-based agent-requested activation and manual `@rule-name` |
| **AGENTS.md ecosystem** | nested `AGENTS.md` | none | **Directory only** — no globs |

Notes that matter for rendering:

- Cursor requires the `.mdc` extension; a plain `.md` in `.cursor/rules/` is ignored.
- Claude Code path-scoped rules trigger when Claude **reads a matching file**, not on every tool
  use, and are **not re-injected after `/compact`** — they reload on the next matching read.
- Claude Code's `paths` brace expansion is budgeted (1,000 expanded patterns / 4 MiB per rule).
- Cursor has four activation modes (always / auto-attached by glob / agent-requested by
  description / manual); Claude Code's rules have two (always / path-matched) and push
  intent-based activation into skills instead.

## 5. P4 — Enforcement hooks

Claude Code: `.claude/settings.json` with `PreToolUse` (and other lifecycle events) running shell
commands, plus `permissions.deny` for hard blocks. The vendor states the distinction ai-cli's
[`enforcement-declaration`](pattern-catalog.md) pattern depends on:

> *"Claude treats them as context, not enforced configuration. To block an action regardless of
> what Claude decides, use a PreToolUse hook instead."*

No cross-vendor equivalent is documented. `rift-forge`'s shell-backtick guard is Claude-only.

## 6. Migration surfaces already shipped by vendors

Relevant because they set expectations for what ai-cli's own retrofit path should look like:

- Claude Code `/init` reads `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`;
  with `CLAUDE_CODE_NEW_INIT=1` also `AGENTS.md`, `.devin/rules/`, `.windsurf/rules/`,
  `.windsurfrules`, `.clinerules`.
- Claude Code `/import` copies another agent's config in, including MCP servers, commands,
  subagents, and skills.
- Cursor converts eligible dynamic rules to skills.

**Every vendor is building a one-shot importer.** None of them maintains a repo across harnesses
over time, which is the gap [ADR-0001](../decisions/ADR-0001-multi-harness-rendering.md) targets.

## 7. What this changes about the Phase 2 findings

| Phase 2 claim | Status after this snapshot |
| --- | --- |
| [synthesis §3.1](synthesis.md) — "author once, emit every rendering" for all agentic config | **Overstated.** Only P2 needs rendering. P3 is standardized; P1 needs a one-line bridge. Corrected in place |
| `core-size-budget` — derived from `rift-forge`'s 1513-line file | **Confirmed by the vendor** at <200 lines |
| `rift-forge`'s unscoped instruction file | The native fix (`.claude/rules/` + `paths:`) now exists. The improvement in [`repos/rift-forge.md §5.1`](repos/rift-forge.md) is cheaper than it was when written |
| `skill-neighbours` (routing at ~13 skills) | Unaffected — a description-quality problem, not a format problem |
| `prompt-library` (`axiom-mesh`'s 21 uninvocable playbooks) | The migration target is now a **standard**, not a Claude-specific format. Portability objection to converting them is gone |
