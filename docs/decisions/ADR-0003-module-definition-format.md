# ADR-0003 — Module definition format: a directory that looks like what it emits

- **Status:** accepted
- **Date:** 2026-08-14
- **Phase:** 3 (product definition) — **unblocks Phase 4**
- **Builds on:** [ADR-0001](ADR-0001-multi-harness-rendering.md) (what gets rendered),
  [ADR-0002](ADR-0002-stack-and-runtime-footprint.md) (no new runtime in a scaffolded repo),
  [ADR-0005](ADR-0005-self-instrumentation.md) (gates are registered, not scattered)

---

## Context

Phase 4 turns ~80 extracted patterns into a module set. The format those modules are written in is
the constraint on everything Phase 4 produces, and it has one dominating requirement, from
[the brief §9](../design/product-brief.md):

> **Must be authorable by hand, since the module set is the product.**

The CLI's code is a few thousand lines of file manipulation. **The modules are the extracted
research** — the patterns, the rules, the templates, the incidents. If authoring a module means
writing a program, then the corpus can only be transcribed by someone fluent in that program, and
worse, a module can no longer be *read as the files it will become*.

Second requirement, from the corpus: **the same module must fit repos that disagree.** A `backlog`
module has to serve `rift-forge`'s `WI-###` under `docs/backlog/`, `axiom-mesh`'s `AD-###` under
`docs/governance/`, and a fresh repo with no opinion. A format with no parameters produces a module
only one repo can install.

Third: **installing a module is not copying files.** It contributes a section to `AGENTS.md`, lines
to `.gitignore`, and entries to the gate registry ADR-0005 requires. Shared files need owners and
defined merge semantics or two modules will fight over them.

## Decision

**A module is a directory that looks like what it emits, plus a TOML manifest. Disposition is
determined by which subdirectory a file is in — never by per-file configuration.**

```text
modules/backlog/
  module.toml            # manifest
  files/                 # → CREATE   verbatim-with-substitution into the repo
    docs/{{root}}/README.md
    docs/{{root}}/TEMPLATE.md
    docs/{{root}}/BACKLOG.md
  rules/                 # → RENDER   P2 sources, through the ADR-0001 pipeline
    work-items.md
  skills/                # → COPY     spec-pure SKILL.md, byte-for-byte
    work-item/SKILL.md
    record-finding/SKILL.md
  fragments/             # → MERGE    managed blocks in files another module owns
    AGENTS.md
    gitignore
  gates/                 # → DECLARE  registry entries + engine tables
    ids.toml
  docs/                  # → CREATE   the authority doc the rules cite
    delivery-methodology.md
```

Five dispositions, one per directory. A contributor adding to a module picks a directory and that
is the whole decision — there is no per-file metadata to get wrong, and the tree reads as a preview
of the installed repo.

### The manifest

```toml
[module]
name    = "backlog"
version = "1.0.0"
rung    = 1                       # maturity ladder — `add` states this before installing
summary = "Work items with ids, an 8-status lifecycle, and a board."

[requires]
modules = ["instructions"]

[conflicts]
modules = []

[params.id_prefix]
description = "Prefix for work-item ids"
default     = "WI"
pattern     = "^[A-Z]{1,6}$"

[params.root]
description = "Directory under docs/"
default     = "backlog"

[cost]
install  = "~15 files, one authority doc to read once"
ongoing  = "one item file per unit of work; a status field to keep true"

[[gates]]
id      = "backlog-ids"
kind    = "declared"              # engine + table, no script in the repo (ADR-0002)
engine  = "id-integrity"
table   = "gates/ids.toml"
tier    = "fast"

[provenance]                      # REQUIRED — see below
sources  = ["rift-forge"]
patterns = ["work-item-lifecycle", "item-template-required-fields", "scope-discipline"]
incident = """
hexguard ran a good audit prompt 268 times and produced 268 documents, because no work-item
object existed for a finding to become. hexguard-templates cannot say what is in flight.
"""
```

**`[provenance]` is required and validated.** [ADR-0005](ADR-0005-self-instrumentation.md) Tier B
has `doctor` ask *"this gate has never fired; it exists because ⟨incident⟩ — is that still a risk
here?"*, and it cannot ask that without the incident. This makes the research a **load-bearing
field**, not a comment: a module with no traceable source or no incident behind it is one somebody
invented, which is the thing [CLAUDE.md](../../CLAUDE.md)'s evidence rule exists to prevent. A
module that fails provenance validation does not ship.

### Templating: substitution only. No logic.

`{{param}}` in file contents and in path segments. No conditionals, no loops, no expressions.

**A module that needs a conditional is two modules, or a module with a variant.** The moment a
template language gets branching it becomes a badly-designed programming language, authorable only
by people who learn it — which forfeits the requirement this whole ADR is built on. The constraint
is load-bearing, not minimalism for its own sake.

### Merge: managed blocks with owners

Shared files are owned by exactly one module (`AGENTS.md` by `instructions`, the registry by
`gates`). Others contribute fragments into marked blocks:

```markdown
<!-- ai-cli:begin backlog@1.0.0 -->
Work is tracked as **work items** (`WI-###`) under `docs/backlog/`…
<!-- ai-cli:end backlog -->
```

- Content **inside** a block is generated: `upgrade` replaces it, `doctor` reports hand-edits in it
  as divergence with the module version that wrote it.
- Content **outside** every block is the user's and is never touched.
- Structured targets (the gate registry, `.gitignore`, `.ai/ai-cli.toml`) merge by key or line
  rather than by marker, same ownership rule.

This is what makes [the brief §7](../design/product-brief.md)'s upgrade story mechanical: the
authored surface stays small and the generated surface is bounded by markers.

### Gates: two kinds, and an honest boundary

Sampling `rift-forge`'s 6,060 lines of `check-*` scripts shows they are **engine + table** —
`check-working-rules` has `RULES`, `check-terms` has `FORBIDDEN`, `check-ids` has `FORWARD_CLAIM`
and `CITATION_ROOTS`. That is the shape the declarative kind captures.

But `check-boundary-claims` exports `CLAIMS` whose entries each carry a
`measure: (d) => …` **function** over the project's own dataset. No table can express that, and
pretending otherwise would produce a template language by the back door.

So:

| Kind | Shape | Lives where | Example |
| --- | --- | --- | --- |
| **`declared`** | CLI-provided engine + module-supplied table | Table in the module; **no script in the repo** | id integrity · link resolution · required sections · rule propagation · generated-file freshness |
| **`command`** | Arbitrary shell string | The repo owns the script, in any language | `dotnet build` · `pwsh ./scripts/validate-doc-links.ps1` · `node .github/scripts/check-boundary-claims.mjs` |

**The boundary is stated, not fudged: anything needing project-domain knowledge is a `command`
gate, and the CLI's contribution there is the registry entry, the runner, the ledger, and the
pattern documentation — not the script.** Under-promising here is deliberate. A CLI claiming to
generate `check-boundary-claims` would generate something confidently wrong, which is the exact
failure the pattern it implements was written about.

`command` is also the **adoption surface**: `axiom-mesh`'s 8 PowerShell validators become registry
entries without being rewritten, which is most of what [ADR-0004](README.md) will need.

### Distribution

Modules ship **bundled in the CLI package** for now. The format is a plain directory precisely so a
third-party or private module registry is possible later (Phase 7) without a format change.

## Consequences

**Good**

- A module is readable by anyone who can read the repo it produces. The Phase 4 work becomes
  transcription with parameters, not programming.
- Disposition-by-directory means no per-file config, so there is nothing to keep in sync.
- Provenance is enforced, which keeps the CLI honest about which of its content was actually paid
  for by a real repo.
- Params make one module fit repos with incompatible conventions — the difference between a tool
  four repos could adopt and one only a greenfield repo could.

**Costs and risks**

- **Substitution-only will feel too weak at some point.** That pressure is the design working:
  the answer is a variant or a second module, and the revisit trigger below names what would
  actually justify changing it.
- **Managed blocks are a contract users can break** by editing inside one. `doctor` reports it;
  `upgrade` refuses to clobber it silently. Divergence is a decision, not an error
  ([brief §7](../design/product-brief.md)).
- **Two gate kinds means two mental models.** Accepted: the alternative is one kind that lies about
  what it can do.
- **Bundled modules couple the module set to CLI releases.** Correct for now — the content is not
  stable enough for independent versioning, and pinning gate behaviour to a CLI version is the
  behaviour ADR-0002 already chose.

## Alternatives considered

**A programmatic API** — modules as TypeScript exporting an install function. Maximum power, and
rejected on the dominating requirement: it makes the product's content authorable only by
TypeScript developers and unreadable as a preview of its output. It would also make every module a
place bugs can live.

**A full template language with conditionals and loops** (Handlebars/Jinja) — rejected for the same
reason one step later. Branching templates are programs whose failures surface as malformed
markdown in someone else's repo.

**A single manifest describing every file with per-file disposition** — rejected: it is a second
place to keep true, and it decouples the module tree from the shape it emits, which is the property
that makes the tree readable.

**One gate kind (`command` only), CLI emits scripts** — rejected by
[ADR-0002](ADR-0002-stack-and-runtime-footprint.md): it forces a runtime on every repo and scatters
engine code so a fix must be re-rendered everywhere.

**One gate kind (`declared` only)** — rejected as dishonest. `check-boundary-claims`'s `measure`
functions are the counter-example, and a format that cannot admit them would push project-specific
logic into a table language that cannot hold it.

**JSON or YAML manifest instead of TOML** — TOML for comment support (provenance carries prose),
unambiguous strings, and readability by non-programmers. Weakly held.

## Revisit triggers

1. **Three or more modules need the same conditional**, and the variant/second-module answer
   produces near-duplicate trees → the format needs a bounded conditional, designed deliberately,
   not a template language adopted wholesale.
2. **A third-party module ecosystem appears** → distribution and versioning need their own ADR;
   the directory format should survive it.
3. **A declared-gate table starts growing an expression syntax** → that is a `command` gate wearing
   a disguise. Stop and reclassify rather than extending the table language.

## Admission check

Against [the rule](README.md): (1) constrains every module Phase 4 writes ✅ · (2) the programmatic
API was a real alternative, rejected for a stated reason ✅ · (3) reversing after the module set is
written means rewriting all of it ✅ · (4) not owned by an existing doc ✅ · (5) not an
implementation detail — it determines who can author the product ✅.
