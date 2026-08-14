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

### Phase 3 — Product definition · **next**

What the CLI actually is: the scaffold model (compose vs. template), the module boundary,
the upgrade story (a repo scaffolded in v1 must be able to take v2's modules), and the
harness-portability question — Claude Code skills, Copilot instruction files, and `AGENTS.md`
are three renderings of the same content and the CLI should emit all three from one source.

Deliverable: `docs/design/product-brief.md` + the first ADRs.

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

Phase 2 complete. Phase 3 not started.
