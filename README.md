# ai-cli

A flexible AI repository starter CLI: scaffolds a repo with a **working agentic development
system** — agent instructions, skills, backlog/ticket management, validation gates, and CI
wiring — composed from modules you pick, not a single opinionated template.

Its content is not invented. It is **extracted** from four repositories that were each built
with a different agentic workflow, in different technologies, for different purposes, over
roughly six months. What worked in them becomes a module; what hurt becomes a guardrail.

---

## Source repositories

| Repo | Period | Scale | Workflow style | Stack |
| --- | --- | --- | --- | --- |
| [`axiom-mesh`](docs/research/repos/axiom-mesh.md) | 2026-03 → 04 | 73 commits, 48+ ADRs, 21 archived sessions | **Doc-authority + prompt library** (`.ai/`) | .NET 10, Postgres, Redis |
| [`hexguard`](docs/research/repos/hexguard.md) | 2026-06 → 07 | 507 commits, ~200 packages | **Copilot instructions + phase checklists** (`.github/`) | Angular 22 + .NET monorepo |
| [`hexguard-templates`](docs/research/repos/hexguard-templates.md) | 2026-07 | 319 commits | **Spec-first + story workflow** (`docs/specs/`) | Angular + .NET reference apps |
| [`rift-forge`](docs/research/repos/rift-forge.md) | 2026-07 → 08 | 3236 commits, 401 branches, 69 gates, 12 skills | **Skills + mechanical gates + concurrent sessions** (`.claude/`) | .NET 10 + Angular 22 |

The four are also a **chronological progression**. Read in date order they show the same
operator learning the same lessons and paying for them each time — which is the strongest
argument for extracting them into a starter.

---

## The sequence

This repo is being built in seven phases. Each phase gates the next.

### Phase 0 — Initialize · **done**

Git repo, docs skeleton, working rules for this repo, the sequence itself (this file).

### Phase 1 — Extract, per repo · **done**

One condensed deliverable per source repo, all on a fixed template so they can be compared
column-by-column rather than read as four essays:

- what the setup **is** (files, entry points, moving parts)
- **what works** — with the evidence that it works
- **what doesn't** — with the evidence that it doesn't
- **pain points** and how they were solved, or why they weren't
- **how to improve further**
- **what the CLI should take** — the extraction verdict

→ [`docs/research/repos/`](docs/research/repos/)

### Phase 2 — Synthesize across repos · **done**

Convergences (four independent repos reaching the same answer = a default), divergences
(same problem, different answers = a choice the CLI must offer), and the failure modes all
four hit. Plus the **maturity ladder**: which practices are worth their cost at which repo
size — a solo spike does not want rift-forge's land protocol.

→ [`docs/research/synthesis.md`](docs/research/synthesis.md) ·
[`docs/research/pattern-catalog.md`](docs/research/pattern-catalog.md)

### Phase 3 — Product definition · **in progress**

What the CLI actually is: the scaffold model, the module boundary, the output contract, the
upgrade story, and harness portability.

Measuring the harness formats before designing for them
([harness-landscape.md](docs/research/harness-landscape.md), 2026-08-14) overturned the Phase 2
hypothesis. Agentic config is **four primitives**, not one, and two of them stopped needing
rendering after the source repos were built: procedures are now an open standard (Agent Skills,
45+ clients) and always-on context needs a one-line bridge. Only **path-scoped rules** are
genuinely fragmented — so the CLI renders one primitive, not four.

- [`docs/design/product-brief.md`](docs/design/product-brief.md) — **done**
- [ADR-0001](docs/decisions/ADR-0001-multi-harness-rendering.md) multi-harness rendering ·
  [ADR-0002](docs/decisions/ADR-0002-stack-and-runtime-footprint.md) stack + runtime footprint ·
  [ADR-0003](docs/decisions/ADR-0003-module-definition-format.md) module definition format ·
  [ADR-0005](docs/decisions/ADR-0005-self-instrumentation.md) self-instrumentation — **all accepted**
- **ADR-0004 (adoption detection) is the one still open**, and Phase 4 does not block on it

### Phase 4 — Module catalog

Turn the pattern catalog into a specified module set with dependencies and conflicts —
`backlog`, `findings`, `adr`, `specs`, `gates`, `skills`, `concurrency`, `release`, `ci`,
`design-sync`. Each module: what it generates, what it requires, what it costs to run.

### Phase 5 — CLI implementation

Stack decision first (ADR). Then `init` (new repo), `add <module>` (retrofit an existing
one — the harder and more valuable case), `doctor` (audit a repo against the modules it
claims), `upgrade`.

### Phase 6 — Dogfood

Retrofit the four source repos from the CLI and diff against what they have by hand. A
module that cannot reproduce the repo it was extracted from is not finished.

### Phase 7 — Distribution

Packaging, versioning, docs site, public template registry.

---

## Working rules for this repo

See [`CLAUDE.md`](CLAUDE.md). Short version: extraction claims carry **evidence** (a file
path, a commit, a measured count) or they are marked as opinion. This repo's whole value is
that its content was paid for once already.

## Status

Phase 3 substantially complete: the product brief and ADRs 0001, 0002, 0003 and 0005 are
accepted. ADR-0004 (adoption detection) remains open and does not block Phase 4.

**Phase 4 (module catalog) is unblocked** — the module format is settled, so the ~80 patterns
in the catalog can now be written as modules.
