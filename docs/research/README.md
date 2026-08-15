# Research

The research has three evidence corpora: four repositories surveyed for **workflow**, a
[public-framework corpus](frameworks/README.md) read for **architecture**, and a
[follow-on corpus](follow-on/README.md) separating **durable/local products**,
**evaluation/optimization**, and **interoperability protocols**. The corpora have separate methods
and share one [`pattern-catalog.md`](pattern-catalog.md).

## Read in this order

| Document | What it answers |
| --- | --- |
| [`repos/axiom-mesh.md`](repos/axiom-mesh.md) | Doc-authority + prompt library. 2026-03→04, .NET |
| [`repos/hexguard.md`](repos/hexguard.md) | Scoped instructions + phase checklists. 2026-06→07, Angular/.NET, 105 packages |
| [`repos/hexguard-templates.md`](repos/hexguard-templates.md) | Spec-first + decision procedure. 2026-07, reference apps |
| [`repos/rift-forge.md`](repos/rift-forge.md) | Skills + mechanical gates + concurrency. Candidate refreshed 2026-08-15: 433 branches, 105 registered worktrees |
| [`frameworks/README.md`](frameworks/README.md) | Public-framework architecture corpus: question, method, template, and index |
| [`frameworks/synthesis.md`](frameworks/synthesis.md) | Six-framework comparison · convergences · divergences · unsolved boundaries · catalogue reconciliation |
| [`follow-on/README.md`](follow-on/README.md) | Follow-on corpus: shared comparison spine · product/evaluation/protocol methods · eight-subject index |
| [`synthesis.md`](synthesis.md) | The learning curve · convergences · divergences · **the 8 failure modes** · the maturity ladder · what nobody solved |
| [`pattern-catalog.md`](pattern-catalog.md) | Canonical definition of every pattern, with source, rung, and target module. **The input to Phase 4** |
| [`harness-landscape.md`](harness-landscape.md) | Phase 3 addendum: what each harness actually reads, measured 2026-08-14. **The four primitives**, and what changed under the source repos |

Reading only the workflow corpus: `synthesis.md` then `pattern-catalog.md`. Reading only the public
framework result: `frameworks/synthesis.md` then `pattern-catalog.md`. Starting follow-on research:
`follow-on/README.md`, then its shared spine and the relevant track template.

> `harness-landscape.md` was added during Phase 3 and **amends** synthesis §3.1 in place. The
> source repos were built 2026-03 → 08 and predate the Agent Skills standardization; where a
> per-repo file describes a portability problem, check the landscape snapshot before acting on it.

## Method

**Direct inspection of working trees**, 2026-08-14, not of the repos' own descriptions of
themselves. Where a repo's documentation and its scripts disagreed, the scripts were taken as what
actually ran — which is how several stated-but-unenforced rules were identified as unenforced.

Each per-repo file follows one fixed template so the four are comparable column-by-column:

1. **Snapshot** — scale, dates, stack, measured counts
2. **The setup** — files and moving parts
3. **What works** — with evidence
4. **What doesn't** — with evidence
5. **Pain points → how they were solved** — a table with a *held?* verdict per row
6. **How to improve it further** — ordered by leverage
7. **Extraction verdict** — take / take-as-warning / leave

## Conventions

- **Counts are dated.** Every number was measured on 2026-08-14 by a named command. They will go
  stale; that is expected, and the date is what makes the staleness visible
  ([CLAUDE.md — the evidence rule](../../CLAUDE.md)).
- **Quoted rules are verbatim** from the source repo, in quotation marks. Where a repo's own
  wording is sharper than a paraphrase, the wording is kept.
- **Counter-examples are first-class.** A pattern derived from a failure names the repo that
  demonstrated it — `hexguard`'s 98 release workflows and `hexguard-templates`'s
  *"placeholder for future additions"* are load-bearing evidence, not criticism.
- **Patterns are defined once**, in [`pattern-catalog.md`](pattern-catalog.md). Per-repo files
  cite ids.

## What this deliberately does not do

Judge the source repos' products, architectures, or code quality. The subject is the *workflow*:
how work was proposed, decided, executed, verified, and remembered — and which parts of that
survived contact with an agent.
