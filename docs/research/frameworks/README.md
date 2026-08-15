# Public agent frameworks

The second research corpus approved in [WI-009](../../backlog/items/WI-009-public-agent-framework-corpus.md).
The existing [`repos/`](../repos/) corpus examines how repositories organise agentic work; this
corpus examines how independently built public frameworks implement agents. Keeping the two axes
separate preserves the workflow corpus's stated boundary while letting the shared
[`pattern-catalog.md`](../pattern-catalog.md) remain the one definition of each pattern.

## Corpus question

**Which agent-architecture practices recur across independent implementations, which ones are
framework-specific bargains, and what does each result confirm, challenge, or add to the rungs
pattern catalogue?**

This is an architecture comparison, not a framework ranking. Adoption, benchmark performance, and
product recommendations are outside [the epic's scope](../../backlog/items/WI-009-public-agent-framework-corpus.md#out-of-scope).

## Index

| Work | Subject | State |
| --- | --- | --- |
| [Template](TEMPLATE.md) | Fixed extraction structure and evidence prompts | Applied to all six extractions |
| [SWE-agent](swe-agent.md) · [WI-011](../../backlog/items/WI-011-extract-swe-agent.md) | Minimal coding-agent loop and agent-computer interface | Pinned at `3ea751c087f32b16e039a2233dd6eefecef325d5` |
| [LangGraph](langgraph.md) · [WI-012](../../backlog/items/WI-012-extract-langgraph.md) | Checkpointed graph state and resumable interrupts | Pinned at `644815f9e5bc52ad8f7a5227a456227e9c3e639b` |
| [OpenAI Agents SDK](openai-agents-sdk.md) · [WI-013](../../backlog/items/WI-013-extract-openai-agents-sdk.md) | Small primitive surface across Python and TypeScript | Pinned at `1a0c08868aec2a18eba964e5a07da4270a490c25` and `d85dd2c144cd99bfdfa0111975cc759c00d56a77` |
| [Pydantic AI](pydantic-ai.md) · [WI-014](../../backlog/items/WI-014-extract-pydantic-ai.md) | Typing, injection, deterministic tests, and durable-execution adapters | Pinned at `9a602b3216b2cde46bfe29c1d32927eb36c501d6` |
| [Microsoft Agent Framework](microsoft-agent-framework.md) · [WI-015](../../backlog/items/WI-015-extract-microsoft-agent-framework.md) | .NET-first workflows, approval binding, checkpoints, and observability | Pinned at `12621e0a746517068300f7b9445225c3ee2406ea` |
| [OpenHands](openhands.md) · [WI-016](../../backlog/items/WI-016-extract-openhands.md) | Shipped run control, worktrees, sandbox boundaries, recovery, and concurrency | Pinned at `dc99e98615de4ace821692773b00a7f50d476e50` and `46ad3d43dc385b2e7975c0935f157153930ebb16` |
| [Synthesis](synthesis.md) · [WI-017](../../backlog/items/WI-017-framework-synthesis.md) | Cross-framework comparison and catalogue reconciliation | Complete |

## Method

1. **Freeze the source.** Record the repository URL and full commit SHA before reading. Cite files
   with permalinks at that SHA, and run every measurement against the same checkout.
2. **Inspect implementation before summarising it.** A project's documentation is evidence of what
   the project documents; source and executable tests are evidence of what the pinned version does.
   Label those two kinds of evidence rather than silently treating them as interchangeable. This is
   the public-source form of the repository's
   [extraction discipline](../../../CLAUDE.md#extraction-discipline).
3. **Use one template.** Every extraction follows [`TEMPLATE.md`](TEMPLATE.md) so the synthesis can
   compare mechanisms and boundaries section by section.
4. **Make claim type visible.** Implementation claims cite a pinned file or test; measurements give
   the dated command and result; documentation claims say that they are documented; judgement is
   prefixed **Opinion.** This applies the repository's
   [evidence rule](../../../CLAUDE.md#the-evidence-rule-mandatory).
5. **Reconcile once.** Per-framework extractions cite existing pattern ids but do not edit the
   catalogue. [WI-017](../../backlog/items/WI-017-framework-synthesis.md) compares all six and makes
   any catalogue change in one place.

Absence claims need a search boundary: name the directories, symbols, or command inspected. “None”
without that boundary is an unchecked inventory claim.

## Commit pinning

A read date identifies when an extraction happened; it cannot reconstruct a moving repository.
Each Snapshot therefore carries a full commit SHA, and every source link and measurement resolves
against that commit. If a second commit must be consulted, record it as a separate snapshot rather
than widening the first one invisibly. This constraint is established by
[WI-009](../../backlog/items/WI-009-public-agent-framework-corpus.md#two-constraints-the-first-corpus-never-had).

## Licence and quotation

- Record the repository's licence identifier and cite the licence file at the pinned SHA. If the
  licence cannot be established from the checkout, say so; do not infer it from repository metadata.
- Quote sparingly, preserve the source's wording, and attach a pinned permalink. Prefer a concise
  paraphrase when exact wording is not the evidence.
- Attribute documented behaviour as documentation. Do not restate it as an observed implementation
  fact until the implementation or an executable test supports it.
- This corpus extracts patterns and warnings. It does not copy framework code into rungs, and
  [WI-009 excludes changes to `modules/`](../../backlog/items/WI-009-public-agent-framework-corpus.md#out-of-scope).
