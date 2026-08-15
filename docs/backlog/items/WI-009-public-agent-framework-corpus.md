---
id: WI-009
title: Extract a second research corpus — six public agent frameworks
type: epic
status: done
branch:
created: 2026-08-15
updated: 2026-08-15
related: [ADR-0003, ADR-0005]
epic:
children: [WI-010, WI-011, WI-012, WI-013, WI-014, WI-015, WI-016, WI-017]
---

## Proposal (rationale)

Phase 1 extracted four repositories, all built by one operator. That is the corpus's strength and
its ceiling: [`synthesis.md` §1](../../research/synthesis.md) argues the four are *one learning
curve*, which makes the arc legible but means **every convergence in the catalogue is a convergence
of one person with themselves**. "Four repos converge on X" is the strongest claim the repo makes
([CLAUDE.md — extraction discipline #4](../../../CLAUDE.md)), and it is weaker than it reads when
the four share an author.

Six public repositories, built by six independent teams under real adoption pressure, are the
cheapest available test of which extracted patterns are portable and which are one operator's
habits.

| Repo | The question it is being read for |
| --- | --- |
| LangGraph | Graph-based orchestration: state, persistence, checkpoints, human-in-the-loop, long-running work |
| OpenHands | A shipped autonomous agent product: sandboxing, code execution, repository manipulation, scale |
| SWE-agent | The minimal loop — observe → reason → execute → observe — with the infrastructure stripped out |
| OpenAI Agents SDK | A deliberately small primitive surface: agents, tools, handoffs, sessions; two language implementations |
| Microsoft Agent Framework | Production and enterprise .NET, plus Python; multi-agent workflows |
| Pydantic AI | Typed production Python: DI, structured output, model abstraction, durable execution, testability |

### This is a second axis, not more of the first

The existing corpus is read for **workflow** — how work was proposed, decided, executed, verified
and remembered. [`research/README.md`](../../research/README.md) closes by stating the non-goal
explicitly: it does not judge the source repos' *products, architectures, or code quality*.

The six repos above are being read for exactly that — architecture. Their contributor workflow is
incidental; their agent design is the subject. Reading them into the same directory under the same
template would quietly redefine what `docs/research/` means, and the next reader would find
architecture claims filed as workflow evidence. So the corpus gets its own home and its own
template, and the research index gains one line saying there are now two axes. That is
[WI-010](WI-010-framework-extraction-template.md), and it is a prerequisite, not overhead —
Phase 1's own lesson was that four repos on *one* template could be compared column by column
"rather than read as four essays" ([roadmap](../../roadmap.md)).

### Two constraints the first corpus never had

1. **The source moves.** The four private working trees were surveyed once, on 2026-08-14, and
   nobody else was pushing to them. These six are under active development, so a date is not enough
   to make a count reproducible. Every extraction pins a **commit SHA**, and the SHA is what a
   re-reader checks out. This is the evidence rule's "counts go stale" corollary with the staleness
   made addressable rather than merely visible.
2. **The source is licensed.** Quoting a private repo raises no question; quoting six public ones
   does, and rungs *ships* what it extracts into every scaffolded repo. So each extraction records
   the license, and the synthesis states what may be restated as a pattern versus what may only be
   cited. Nothing is copied into `modules/` under this epic — see Out of scope.

### Value, and the cost of not doing it

The [pattern catalogue](../../research/pattern-catalog.md) is the input to module authoring. Right
now a pattern's rung and its "target module" rest on a single-author sample. The likely outcomes are
(a) patterns confirmed by independent teams, which get to state a much stronger claim; (b) patterns
that turn out to be habits, which get demoted; and (c) practices six teams use that the four repos
never invented — the most valuable category, and the one no amount of re-reading the existing
corpus can produce.

**Nothing in this epic is evidence yet.** The "question it is being read for" column above is an
expectation drawn from each project's own positioning, and expectations are exactly what an
extraction is supposed to contradict. Where a repo turns out not to work the way this proposal
assumes, the divergence is the finding.

## Decision

`accepted` — 2026-08-15. The user directed work on the research epic to start. The epic is planned
through its eight children; each child remains individually decidable and executes on its own
branch.

## Plan

> Filled once `accepted`. The per-child plans are written in the children.

### Requirements

- One template item, six extractions, one synthesis — see `children`.
- Every child produces a document under `docs/research/frameworks/`, pinned to a commit SHA.
- The synthesis reconciles findings against the existing
  [`pattern-catalog.md`](../../research/pattern-catalog.md) rather than starting a second catalogue.

### Impacts

- New directory `docs/research/frameworks/` (created by [WI-010](WI-010-framework-extraction-template.md)).
- [`research/README.md`](../../research/README.md) gains the two-axis distinction.
- [`pattern-catalog.md`](../../research/pattern-catalog.md) gains sources and possibly rung changes —
  written by [WI-017](WI-017-framework-synthesis.md), not by the per-repo children.
- The site publishes `docs/**`, so every new file is a wiki route and a link-check surface.
- **Possibly an ADR** — if the synthesis changes a module's contents or a pattern's rung, that is a
  design decision and gets one. Not decidable before the evidence exists.

### Approach

**Template first, then one extraction, then fan out.** [WI-011](WI-011-extract-swe-agent.md)
(SWE-agent, the smallest) is the template's first real test and is expected to correct it; Phase 4
produced sixteen corrections to the module format, every one found by *writing* a module rather than
reading the format. The remaining five are independent of each other and may run in any order or in
parallel.

Ordered smallest to largest so the template hardens on cheap repos before meeting OpenHands.

### Acceptance criteria / tests

1. All eight children reach `done`.
2. `docs/research/frameworks/` holds six extractions on one template, each with a commit SHA, plus
   an index.
3. Every pattern claim in the synthesis is either traced to a named file in a pinned commit or
   marked as opinion in the first person.
4. `rungs check` passes, and the site builds with links resolving.

### Out of scope

- **Any change to `modules/`.** This epic produces research. Shipping a newly-evidenced pattern into
  a module is a separate item, opened by the synthesis if the evidence warrants it — the same
  boundary Phase 2 and Phase 4 kept.
- **Vendoring, forking, or copying code from any of the six.** Extraction reads; it does not import.
- **Judging the six as products** — which framework to use, benchmark scores, adoption counts.
  Neither the question nor something this repo can answer.
- **Re-surveying the four original repos.** They were measured 2026-08-14; if the new corpus makes a
  claim about them look wrong, that is a finding against the existing corpus, not a re-run.
- **The module registry** (Phase 7) — unrelated, despite both touching "third-party".

## Execution

Executed sequentially 2026-08-15 through children WI-010–WI-017. Each non-trivial child planned on
`main`, executed and reviewed on its own feature branch, passed its gates/site checks, and was
merged before the next began. The synthesis opened WI-029 rather than changing shipped modules.

## Review

Epic review completed 2026-08-15 against every acceptance criterion:

1. **Pass.** A frontmatter scan reports `status: done` for all eight children, WI-010 through
   WI-017.
2. **Pass.** [`docs/research/frameworks/`](../../research/frameworks/README.md) contains one applied
   template, six framework extractions, their index, and the cross-framework synthesis. Every
   extraction Snapshot records at least one full commit SHA; the two-repository subjects record
   both pins.
3. **Pass.** The synthesis matrix and reconciliation link every extracted mechanism to one of the
   six documents, which resolves onward to pinned source. Synthesis judgement is marked
   **Opinion** in the first person. All 17 candidate ids are adjudicated exactly once.
4. **Pass.** On the merged `main` tree, `node src/cli.ts check` passed 20/20 gates. In `site`,
   `npm run build` generated 63 pages and `npm run check` reported 0 diagnostics and 662 internal
   links with 0 broken.

The proposal's optional ADR was not admitted: WI-017 and the canonical catalogue already own the
documentation classification, and no pattern rung changed. Module implementation remains the
separate proposed [WI-029](WI-029-apply-framework-patterns-to-modules.md).
