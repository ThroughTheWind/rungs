# Product brief

> Phase 3. Written 2026-08-14. **Authoritative for:** what ai-cli is, its scaffold model, module
> boundary, output contract, CLI surface, and upgrade story. **Not authoritative for:** individual
> module contents (`module-catalog.md`, Phase 4 — not yet written) or the rendering policy
> ([ADR-0001](../decisions/ADR-0001-multi-harness-rendering.md)).

---

## 1. What it is

**ai-cli installs and maintains a repository's agentic development system.** Not a project
template — a composable set of modules (backlog, findings, ADRs, skills, gates, concurrency,
release…) that can be added to a repo, checked, and upgraded over time, and that render into
whichever coding agents the repo's owners use.

The content is extracted from four repositories that each solved part of this by hand
([`docs/research/`](../research/README.md)). The CLI's claim is not "here is a good way to work" —
it is "here is what four repos paid to learn, packaged so the fifth doesn't pay again."

## 2. Who it is for

The primary user is **a developer or small team running agents against a real repo that already
exists**, who has hit one of the failure modes in
[synthesis §4](../research/synthesis.md#4-failure-modes-all-four-hit) and wants the fix without
inventing it. Secondary: someone starting a new repo who wants a working setup on day one.

**Retrofit is the primary case, not `init`.** All four source repos already existed when their
workflows were built, and each is missing a specific, identifiable rung. A CLI that only scaffolds
new repos would not have helped any of them.

## 3. Scaffold model — compose, not template

Four repos, four topologies (monorepo package factory · reference apps consuming a sibling repo ·
.NET service platform · full-stack product), four workflow shapes. **No single golden template
fits any of them**, and a template that tried would be rejected wholesale rather than adopted
partly.

So: **modules with declared dependencies, conflicts, and costs.** A repo installs the ones it
needs, at the rung it is actually at.

Three constraints follow, each from a measured failure:

| Constraint | Why |
| --- | --- |
| **Modules declare dependencies and the CLI refuses to violate them** | `audit → findings → backlog`: `hexguard` ran a good audit prompt 268 times and produced 268 documents with no register and no work-item object to close anything into |
| **A procedure module ships its invocation surface in the same install** | `hexguard-templates` has the best decision procedure in the corpus and an `AGENTS.md` that reads *"No custom prompts or agents defined yet… placeholder for future additions"* |
| **A rule module ships its checker, or marks itself review-only** | Unanimous. All four repos wrote rules they could not check, and all four show decay — including inside the file that states the rule |

The third is the sharpest and deserves its name: **`enforcement-declaration`**. Every generated
rule is tagged `gated` or `review-only`. There is no silent third category, because a silent third
category is what all four repos actually had.

## 4. Module boundary

**A module is a coherent capability that can be installed, checked, and removed as a unit.** It
owns files, and it owns the rules about those files.

A module ships up to six things — and **which of the six it ships is the module's contract**:

1. **Structure** — directories, templates, registers (`docs/backlog/items/`, `TEMPLATE.md`)
2. **Rules** — always-on (P1) or path-scoped (P2) instruction content
3. **Procedures** — skills (P3), each with its invocation surface
4. **Gates** — `check:` scripts, their self-tests, and a **registry entry declaring each to the
   runner** ([ADR-0005](../decisions/ADR-0005-self-instrumentation.md)). Gates stay dumb: exit 0
   or 1, no logging. The `gates` module owns the runner; every other module registers with it
5. **Hooks** — P4, where the harness supports them
6. **Docs** — the authority doc explaining the *why*, which the rules cite

Each of the six maps to one subdirectory of the module, whose name determines what happens to the
files in it — [ADR-0003](../decisions/ADR-0003-module-definition-format.md) is the authority.

**Not a module:** anything that is one file with no rules attached (that is a template), anything
requiring a runtime service, and anything specific to one language or framework. The corpus is
Angular + .NET + Node, and everything extracted from it was workflow, not stack — the modules stay
that way.

**Modules carry a rung and a cost**, from
[the maturity ladder](../research/synthesis.md#5-the-maturity-ladder). `ai-cli add concurrency` on
a repo with one active session states the threshold (~5+ concurrent sessions) and asks for
confirmation. Selling rung 5 to a rung 1 repo is the most likely way this tool does harm.

## 5. Output contract

Settled by [ADR-0001](../decisions/ADR-0001-multi-harness-rendering.md). A repo with
`instructions`, `backlog`, `findings`, `skills`, and `gates` installed, targeting Claude Code +
Copilot:

```text
AGENTS.md                       # P1 canonical — the standard, authored
CLAUDE.md                       # bridge: "@AGENTS.md" + Claude-only additions
.ai/
  ai-cli.toml                   # installed modules, versions, harnesses, overrides
  rules/                        # P2 source — authored, vendor-neutral frontmatter
    backend.md
    frontend.md
  render-report.md              # generated — what was emitted, degraded, and why
.claude/
  skills/                       # P3 — authored SKILL.md, spec-pure. Read by Claude+Copilot+Cursor
    work-item/SKILL.md
    record-finding/SKILL.md
  rules/                        # generated from .ai/rules/
  settings.json                 # P4 hooks — Claude only
.github/
  instructions/                 # generated from .ai/rules/
  scripts/check-*.mjs           # gates
docs/
  backlog/                      # module structure: README, BACKLOG.md, items/, TEMPLATE.md
  findings/FINDINGS.md
  decisions/
```

**Authored vs. generated is visible from the path.** `AGENTS.md`, `.ai/rules/`, and
`.claude/skills/` are hand-edited. `.claude/rules/`, `.github/instructions/`, and
`render-report.md` are generated, carry a do-not-edit header, and are covered by a freshness gate.
Nothing else is generated — which is the point of ADR-0001.

## 6. CLI surface

| Command | Does |
| --- | --- |
| `ai-cli init` | New repo: pick harnesses, pick modules by rung, write everything |
| `ai-cli add <module>` | **The primary command.** Install one module into an existing repo, resolving dependencies and refusing unmet ones. Detects what is already there by hand and adopts rather than overwrites |
| `ai-cli doctor` | Audit a repo against the modules it claims: missing files, stale renderings, rules tagged `gated` with no gate, dependency violations, unreached procedures, containers past their archive threshold |
| `ai-cli render` | Re-emit P2 renderings + the render report. What the freshness gate calls |
| `ai-cli upgrade` | Move a repo to newer module versions (§7) |

`doctor` is the command that carries the research. Every check in it is one of the eight failure
modes made detectable — *"you have an audit skill and no findings register"*, *"this rule says
MANDATORY and has no gate"*, *"14 near-identical release workflows"*.

**`add` must adopt, not overwrite.** All four source repos have hand-built equivalents of these
modules. A CLI that clobbers `docs/backlog/README.md` because it wants to install its own is
useless to exactly the repos it was extracted from. `add` on an existing structure reports the
delta and offers to converge.

## 7. Upgrade story

A repo scaffolded at v1 must be able to take v2's modules. Three mechanisms:

1. **`.ai/ai-cli.toml` records installed modules and their versions**, plus every override, so
   `upgrade` knows what it is upgrading from and what it must not clobber.
2. **Generated files upgrade freely; authored files are proposed as a diff.** ADR-0001 keeps the
   authored surface deliberately small — `AGENTS.md`, `.ai/rules/`, `.claude/skills/` — which is
   what makes upgrades tractable. Everything else can be re-emitted.
3. **ADR-0001's revisit triggers are upgrade paths.** If Claude Code starts reading `AGENTS.md`,
   `upgrade` deletes the bridge. If the skills directory convention moves, `upgrade` does the
   `git mv` — which is cheap precisely because skills are stored spec-pure.

**Divergence is expected and not an error.** A repo that hand-edits a generated file has made a
decision; `doctor` reports it as a divergence with the module's version, and `upgrade` leaves it
alone unless told otherwise. `rift-forge`'s design-sync rule is the model: route every delta
somewhere — never silent divergence, and never forced convergence either.

## 8. Non-goals

- **Not a project scaffolder.** It does not create Angular workspaces or .NET solutions. It
  installs the workflow around whatever is there.
- **Not a runtime.** It generates files and checks files. Nothing daemonizes.
- **Not opinionated about the product.** Modules encode how work is tracked and verified, never
  what to build.
- **Not a skills marketplace.** Modules ship skills; discovering third-party skills belongs to the
  Agent Skills ecosystem, not here.
- **No telemetry to us.** §9's instrumentation question is about a repo measuring *itself*.

## 9. Decisions

**Phase 3 is closed.** All five decisions are accepted.

| # | Decision | Outcome |
| --- | --- | --- |
| [0001](../decisions/ADR-0001-multi-harness-rendering.md) | Multi-harness rendering | Render only path-scoped rules; skills and `AGENTS.md` are authored native; `CLAUDE.md` is an import bridge; degradation is reported |
| [0002](../decisions/ADR-0002-stack-and-runtime-footprint.md) | Stack + runtime footprint | CLI is TypeScript on Node via `npx`. **A scaffolded repo acquires no new language runtime** — no emitted gate scripts. `ai-cli eject` is the promised exit |
| [0003](../decisions/ADR-0003-module-definition-format.md) | Module definition format | A directory that looks like what it emits + a TOML manifest. Disposition by subdirectory; substitution-only templating; managed merge blocks; `[provenance]` required |
| [0004](../decisions/ADR-0004-adoption-detection.md) | Adoption detection | **Adoption is a mapping, not a migration** — `add` records where a repo's equivalent lives and never rewrites it. Six per-artifact states, two safe unattended, no `--force`. Presence decided by paths; params only *proposed* by id inference. Signatures biased toward false negatives |
| [0005](../decisions/ADR-0005-self-instrumentation.md) | Self-instrumentation | Runner records exit status and wall-clock per gate; `doctor` asks two questions with provenance attached; rework rate, attribution, aggregation and any health score refused permanently |

**They were decided out of numeric order**, each because it blocked the next: 0005 set the
gate-shipping contract, 0002 set what a scaffolded repo may depend on, and 0003 is largely 0002's
consequence. 0004 came last because `command` gates and the module manifest — both settled above —
turned out to be most of what it needed.

Two Phase 2 claims were found wrong while arguing these and have been **amended in place** rather
than left to be cited: [synthesis §3.1](../research/synthesis.md) overstated the rendering problem,
and [§6](../research/synthesis.md) bundled one tractable measurement problem with two unknowable
ones. The real gap there is **persistence**, not measurement.
