**Authoritative for:** what each word rungs uses in public means, in one sentence.
**Not authoritative for:** how any of it works — every entry ends by handing you to the document
that owns the topic.

# Glossary

Nine words do most of the work on the landing page and in the README. They are defined here once;
everything else links here rather than re-explaining, which is the same
[one-definition-per-concept](../CLAUDE.md) rule the pattern catalogue runs on.

**Admission for this page is narrow on purpose.** A term earns an entry by appearing on a surface a
first-time reader meets — the landing page, the README, `--help`, or
[your first hour](getting-started.md). Terms that live only in design documents and ADRs
(`engine`, `ledger`, `render pipeline`, `admission rule`, `provenance`) are not here: they are
precise where precision is worth more than approachability, and a reader who reaches them has
already been handed the document that defines them.

| Term | One sentence | Owned by |
| --- | --- | --- |
| **module** | A coherent capability you can install, check, and remove as a unit — it owns files, and it owns the rules about those files | [product brief §4](design/product-brief.md) |
| **rung** | How mature a practice is, 0–5, declared by each module so `add` can tell you when you are installing above the problem you actually have | [module catalogue](design/module-catalog.md) |
| **profile** | A named set of modules installed together — `minimal`, `tracked`, `disciplined`, `hardened`, `fleet` | [product brief §3](design/product-brief.md) |
| **gate** | One mechanical check that exits pass or fail, with the incident that justified it attached. A rule with a gate is enforced; a rule without one says so | [product brief §3](design/product-brief.md) |
| **work item** | One unit of tracked work with a permanent id and a status — **a decision**, kept as a file | [backlog README](backlog/README.md) |
| **finding** | Something noticed while doing something else — **an observation**, kept as a row, because recording one must cost almost nothing | [FINDINGS.md](backlog/FINDINGS.md) |
| **ADR** | A decision record: what was chosen, what was rejected, and why — admitted only if it meets the admission rule | [decisions README](decisions/README.md) |
| **skill** | A named multi-step procedure an agent invokes (`/work-item`, `/record-finding`), written to the Agent Skills spec so it is portable | [your first hour §3](getting-started.md) |
| **path-scoped rule** | A rule that loads only when a matching file is edited, rather than on every task — the one thing rungs renders per harness, because it is the only thing harnesses genuinely disagree about | [ADR-0001](decisions/ADR-0001-multi-harness-rendering.md) |

## Two distinctions worth more than their definitions

**A work item is a decision; a finding is an observation.** Items are files, findings are rows, and
the asymmetry is deliberate — if recording an observation costs as much as opening an item, nobody
records observations, and the things people notice in passing are exactly what a repo loses first.

**A rule is `gated` or `review-only`, and there is no silent third category.** All four source
repos had one, and all four decayed inside it — including inside the files that stated the rules.
Naming which of the two a rule is does not make it enforced; it makes the unenforced ones countable.

## The name

The tool, the command, and everything it writes are **rungs**. The npm package is **`@rungs/cli`**,
because the unscoped name is unpublishable — it is one edit from both `rung` and `runjs`, which
npm's typosquat filter refuses ([ADR-0006](decisions/ADR-0006-the-name.md)). After a global install
the command is plain `rungs`.

A separate, unrelated `rung` CLI for stacked pull requests exists in the same ecosystem. Written
out, this project is **rungs CLI — repository infrastructure for coding agents**; the bare word is
ambiguous when spoken and when searched.
