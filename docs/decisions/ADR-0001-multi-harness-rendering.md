# ADR-0001 — Multi-harness rendering: render only what is fragmented

- **Status:** accepted
- **Date:** 2026-08-14
- **Phase:** 3 (product definition)
- **Evidence:** [harness-landscape.md](../research/harness-landscape.md) (measured 2026-08-14)

---

## Context

rungs generates agentic configuration for repositories whose owners use different coding agents —
the four source repos alone span Claude Code, GitHub Copilot, and the `AGENTS.md` ecosystem.
[synthesis §3.1](../research/synthesis.md) recorded the working hypothesis: *author once in a
neutral source, emit every requested rendering, gate that they agree.*

Measuring the actual formats before building that showed the hypothesis was **too broad**. Agentic
configuration is not one thing — it is four primitives (P1–P4 in
[harness-landscape §1](../research/harness-landscape.md)) with very different portability, and
since the source repos were built, two of the four stopped needing rendering at all:

- **P3 (procedures)** — Agent Skills is now an open standard with 45+ adopting clients. A
  spec-compliant `SKILL.md` already runs everywhere.
- **P1 (always-on context)** — `AGENTS.md` is the de facto standard; the one harness that does not
  read it (Claude Code) documents a **one-line import bridge**.
- **P2 (path-scoped context)** — genuinely fragmented: three incompatible frontmatter dialects for
  the same concept.
- **P4 (hooks)** — no standard, no equivalent outside Claude Code.

A universal intermediate representation across all four would therefore impose a build step, a
second format to learn, and a staleness risk on three primitives that do not need it, to solve a
problem that exists in one.

## Decision

**Render only P2. Everything else is authored in its portable native form.**

The policy, in precedence order — *portable-first, bridge second, render last, degrade loudly:*

### Tier 1 — Author native where a standard exists (P3, P1)

**Skills are authored as spec-compliant `SKILL.md` and emitted once.** No source format, no build
step, no generated copy. The authored file *is* the artifact every client reads.

- Frontmatter is restricted to the **six Agent Skills spec fields**. This is the default and it is
  enforced by a gate.
- Claude Code extensions (`disable-model-invocation`, `user-invocable`, `context`, …) are
  **opt-in per skill**, via an `extensions:` block in the module definition. Opting in emits the
  fields *and* records in the render report that this skill no longer packages for claude.ai
  uploads or the Skills API, which reject unknown keys with a hard error.
- `disable-model-invocation: true` is the common legitimate case — a side-effectful workflow like
  `/cut-release` that a model should never trigger on its own. The CLI recommends it for skills a
  module marks `side-effects: true`, and states the portability cost at the point of the choice.

**Always-on context is authored as `AGENTS.md`.** It is the format with the widest native reach and
no vendor owns it.

### Tier 2 — Bridge, don't copy (P1 → Claude Code)

Claude Code does not read `AGENTS.md`. The generated `CLAUDE.md` is a **bridge, not a copy**:

```markdown
@AGENTS.md

## Claude Code
<!-- Claude-specific content, if any -->
```

Chosen over a symlink because **on Windows a symlink requires Administrator or Developer Mode**,
and the primary operator is on Windows. The import is documented by the vendor and works
everywhere.

This is [`agents-md-bridge`](../research/pattern-catalog.md) inverted relative to `rift-forge`,
which made `CLAUDE.md` canonical and `AGENTS.md` the bridge. The direction is reversed because
`AGENTS.md` is the standard and `CLAUDE.md` is the vendor file — **the bridge should always point
from the vendor file to the standard, never the other way.** The rationale `rift-forge` states —
*"keeping two large copies would let Codex and Claude silently drift"* — is preserved and
strengthened: with an import there is no second copy at all.

`.github/copilot-instructions.md` is not generated. Copilot reads `AGENTS.md` directly.

### Tier 3 — Render, for P2 only

Path-scoped rules are authored once in **`.ai/rules/*.md`** — vendor-neutral, superset
frontmatter — and rendered into each selected harness's dialect:

| Neutral field | → Claude Code<br>`.claude/rules/<n>.md` | → Copilot<br>`.github/instructions/<n>.instructions.md` | → Cursor<br>`.cursor/rules/<n>.mdc` |
| --- | --- | --- | --- |
| `description` | *(dropped — no field)* | `description` | `description` |
| `paths: [globs]` | `paths:` (list) | `applyTo:` (comma-joined) | `globs:` |
| `always: true` | omit `paths` | `applyTo: '**/*'` | `alwaysApply: true` |
| `exclude-agents: []` | *(no field — see degradation)* | `excludeAgent` | *(no field)* |

**Bodies are rendered in full, not by pointer.** A wrapper that references a shared file relies on
the harness following the reference, and only some do. A rule that does not load is worth nothing,
so reliability beats DRY here. The duplication is managed as a generated artifact, per Tier 4.

### Tier 4 — Generated output is treated as generated

Every rendered P2 file carries a do-not-edit header naming its source and the regenerate command,
and is covered by a `check:` gate — the [`generate-derivable`](../research/pattern-catalog.md)
pattern, with `rift-forge`'s standing rule attached: **a green check means "not yet regenerated",
never "current".** Rendered files are committed (agents must find them without a build step) and
are declared to the `generated` merge driver where the `concurrency` module is installed, so a
textual merge of two renderings is refused rather than silently interleaved.

### Degradation is explicit and reported

When a target cannot express a source construct, rungs **degrades and says so**. It never drops
silently, and it never refuses the whole render for one unmappable field.

| Case | Behaviour |
| --- | --- |
| Target has no path-scoping (AGENTS.md-only harnesses) | If every glob shares a directory prefix → emit a nested `AGENTS.md` there. Otherwise → emit a routing line in root `AGENTS.md` (*"When editing `src/api/**`, read `.ai/rules/api.md` first"*) and mark the rule **degraded: routing-only** |
| Target lacks a field (`description` for Claude rules, `exclude-agents` for Claude/Cursor) | Drop the field, record it in the render report |
| Target lacks P4 hooks | Skip, and warn once per harness that this repo's enforcement is Claude-only |
| Skill uses opted-in extensions | Emit them, record the packaging-path restriction |

Every degradation lands in `.ai/render-report.md` — a generated artifact listing, per harness, what
was emitted, what was degraded, and why. This is the [`no-silent-caps`](../research/pattern-catalog.md)
discipline applied to the CLI's own output: a render that quietly dropped a rule reads identically
to one that had nothing to drop.

### Skills directory

There is **no directory all three major clients read that is not vendor-named**
([harness-landscape §2](../research/harness-landscape.md)). So the location is chosen by the
selected harness set, with one canonical directory and no mirroring:

- **`claude` in the set → `.claude/skills/`.** Read by Claude Code, Copilot, and Cursor today.
  Vendor-named, and zero duplication.
- **`claude` not in the set → `.agents/skills/`.** The neutral direction.
- Overridable. If the ecosystem converges — most likely Cursor retiring its `.claude/` legacy
  support, or Claude Code adding `.agents/` — relocation is a `git mv` plus a config change,
  because the file contents are spec-pure either way. That relocation is `rungs upgrade`'s job.

**Mirroring into a second directory is explicitly rejected** for now: it doubles the review surface
for every skill, and on Windows it cannot be a symlink.

## Consequences

**Good**

- No build step for the two primitives people edit most (skills, always-on context). What you open
  is what the agent loads.
- The only generated artifacts are P2 renderings and the render report — a small, gateable surface.
- Skills written here are portable to 45+ clients by construction, and the gate keeps them that way.
- Adding a harness means writing one P2 mapping and one bridge, not a new backend for everything.
- Degradation is visible, so a repo can see what its harness choice costs it.

**Costs and risks**

- **P2 content is duplicated across renderings.** Mitigated by the do-not-edit header, the
  freshness gate, and the merge driver — the same treatment `rift-forge` gives its datasets. It is
  a real cost, accepted for load-reliability.
- **The decision is dated.** It rests on a format landscape measured 2026-08-14 that is moving
  fast. See revisit triggers.
- **Claude-only enforcement.** Repos targeting only Copilot or Cursor get rules and skills but no
  P4 hook, so the `gates` module's top rung is unavailable to them. Stated at install time rather
  than discovered later.
- **`.ai/rules/` is a fifth directory** in repos that also carry `.claude/`, `.github/`, `.cursor/`.
  Accepted: it is the only one a human edits.

## Alternatives considered

**A universal neutral IR for all four primitives** — the [synthesis §3.1](../research/synthesis.md)
hypothesis. Rejected: it imposes a build step and a second format on P3 and P1, which are already
portable, to solve a P2 problem. It would also make every skill a generated artifact, which is
strictly worse than a spec-compliant file that every client already reads. *This ADR is the
correction to that hypothesis, and synthesis §3.1 has been amended rather than left to be cited.*

**Author skills in Claude Code's extended dialect and down-render to spec** — rejected: it makes
the portable form the derived one, which inverts the dependency and guarantees the portable output
lags the source.

**Make `CLAUDE.md` canonical and bridge to `AGENTS.md`** (`rift-forge`'s direction) — rejected: it
makes a vendor file the authority for content the whole ecosystem consumes, and it costs a real
second copy where the import costs none.

**Pointer bodies for P2 instead of full rendering** — rejected: not every harness follows
references from a rules file, and a rule that does not load is worth nothing.

**Mirror skills into both `.claude/skills/` and `.agents/skills/`** — rejected for now: duplication
without present benefit, and not symlinkable on Windows without elevation. Revisit on trigger 2.

**Emit `.github/copilot-instructions.md`** — rejected: Copilot reads `AGENTS.md`; a second
always-on file is a second thing to keep true for no reach.

## Revisit triggers

Each is a fact about the world, not a schedule — this ADR is reopened when one becomes true:

1. **Claude Code reads `AGENTS.md` natively** → Tier 2 disappears; delete the bridge.
2. **Claude Code reads `.agents/skills/`, or Cursor retires `.claude/skills/`** → re-decide the
   canonical skills directory; `upgrade` relocates existing repos.
3. **A path-scoped-rules standard emerges** (an `AGENTS.md` v1.1 with globs, or a shared rules
   spec) → Tier 3 collapses into Tier 1 and `.ai/rules/` becomes the emitted form, not the source.
4. **A cross-vendor hook standard emerges** → P4 joins the render matrix.
5. **A fourth dialect appears that the neutral frontmatter cannot express** → the superset needs a
   version, and this ADR needs a successor rather than an edit.

## Admission check

Against [the rule](README.md): (1) constrains all future module output ✅ · (2) a real alternative —
the universal IR — was rejected with a stated reason ✅ · (3) reversing later means rewriting config
in every scaffolded repo ✅ · (4) not owned by an existing spec or module doc ✅ · (5) not an
implementation detail the code would state better ✅.
