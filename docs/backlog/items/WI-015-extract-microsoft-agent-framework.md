---
id: WI-015
title: Extract the Microsoft Agent Framework — enterprise .NET and multi-agent workflows
type: docs
status: review
branch: feature/WI-015-extract-microsoft-agent-framework
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-010, WI-013]
epic: WI-009
children: []
---

## Proposal (rationale)

Two reasons this repo is in the corpus, and the second is the stronger one.

**It is the only .NET member.** `axiom-mesh` and `rift-forge` are .NET repos, and the extraction
that produced most of rungs' content came from them — so the corpus's centre of gravity is already
.NET, and a framework targeting that stack is the closest thing to a same-context comparison
available. `rungs add` has been dry-run against both ([roadmap](../../roadmap.md), Phase 6), which
makes anything learned here directly checkable against a repo rungs already understands.

**It is the only one whose stated target is "enterprise".** That word usually means a specific set
of constraints arrived: approval before an action, an audit trail of what the agent did, identity,
policy, and the ability to answer "why did it do that" after the fact. The private corpus has a
weak version of every one of those — a review section in a work item, a findings register, a session
archive — invented ad hoc by one operator. Seeing what a framework built for the constraint does
instead is the point.

The specific questions:

- **What is recorded about a run**, in what form, and who is expected to read it? This is the
  audit-trail question, and it is the same question as the findings register one layer down.
- **Where is approval expressed** — before a tool call, before a plan, before a commit? The four
  private repos put it at merge, which may simply be the only place a documentary workflow *can*
  put it.
- **What is a "workflow" here**, and how does it differ from LangGraph's graph
  ([WI-012](WI-012-extract-langgraph.md)) and from handoffs in the Agents SDK
  ([WI-013](WI-013-extract-openai-agents-sdk.md))? Three vocabularies for composition; the
  comparison is [WI-017](WI-017-framework-synthesis.md)'s, the raw material is this item's.
- **What does the .NET version have that the Python one does not, and vice versa?** Same signal as
  WI-013's two implementations — divergence exposes which parts were essential.
- **What does "production-grade" cost the author?** Section 7 must answer this; a framework that
  makes the enterprise path easy usually makes the small path expensive, and rungs' maturity ladder
  exists precisely because that trade is real.

> Expectations from the project's positioning, not evidence. Confirm the URL, the license, the
> language split, and the project's relationship to its predecessors before writing any of it down —
> a framework consolidating earlier ones carries retired practice, and **a retired practice is a
> finding, not an omission** ([CLAUDE.md](../../../CLAUDE.md)).

## Decision

`accepted` — 2026-08-15. The user directed the remaining WI-009 children to proceed sequentially;
WI-014 is complete and this is the next planned child.

## Plan

### Requirements

- `docs/research/frameworks/microsoft-agent-framework.md` on the
  [WI-010](WI-010-framework-extraction-template.md) template, eight sections answered.
- Snapshot pins a commit SHA, license, read date, per-count commands, and the language split.
- The audit-trail and approval questions each answered with file-level evidence.
- **Anything the project explicitly retired or superseded from an earlier framework is recorded with
  its reason**, in section 7 or 8.
- Section 8 cites pattern ids; candidates go to [WI-017](WI-017-framework-synthesis.md).

### Impacts

- One new document; one row in the frameworks index; site route and links.
- Potentially relevant to `rungs add`'s .NET detection (Phase 6) — noted, **not acted on**; a
  detection change is its own item.

### Approach

**Read the .NET side as primary**, because that is where the corpus overlap is, and treat Python as
the divergence check. Bound the read the same way as WI-012: one non-trivial multi-agent example
traced end to end, and the Snapshot states what was read and what was not.

**Look for the retirement.** A consolidating framework is a record of what its predecessors got
wrong, and that record is more useful to rungs than the feature list. It is also the easiest thing
to miss by reading only the current documentation, which describes the survivor.

### Acceptance criteria / tests

1. All eight sections answered; Snapshot carries SHA, license, date, commands, read boundary.
2. Audit trail and approval each traced to a named file, or an explicit "not found, here is where I
   looked".
3. At least one retired or superseded practice recorded with its reason, or an evidenced statement
   that none was findable.
4. Section 7 states what the enterprise posture costs a small project.
5. Opinion marked as opinion; no comparison to other corpus repos in the document.
6. `rungs check` passes; the site builds with links resolving.

### Out of scope

- **Azure, hosted services, and anything whose implementation is not in the repository.** Recorded
  as not inspectable rather than described from documentation.
- **Semantic Kernel, AutoGen or any predecessor as subjects in their own right.** They appear only as
  the source of a recorded retirement.
- **Any change to `rungs add`'s detection or to the .NET module set** — separate items if warranted.
- **Cross-repo comparison and catalogue edits** — WI-017.

## Execution

Branch `feature/WI-015-extract-microsoft-agent-framework`, cut from `main` 2026-08-15.

## Review

Self-review completed 2026-08-15 against every acceptance criterion:

1. **Pass.** [`microsoft-agent-framework.md`](../../research/frameworks/microsoft-agent-framework.md)
   answers all eight template sections and records the repository, pinned SHA, MIT licence, read
   date, count commands, language split, and .NET-primary read boundary.
2. **Pass.** Section 6 traces the audit inputs through `Run`, `StreamingRun`, `WorkflowEvent`,
   `.WithOpenTelemetry`, and the Aspire exporter sample, explicitly distinguishing ephemeral events
   and spans from a durable audit ledger. Approval is traced through the named
   `GroupChatToolApproval/Program.cs` sample, `AIAgentHostExecutor`, `InProcessRunnerContext`, and
   `ApprovalResponseBindingChatClient`.
3. **Pass.** Section 7 records the retired Python-core provider-bundling practice and the removal of
   deprecated assistants-parity samples, with the accepted decision's reasons: core weight,
   provider/abstraction conflation, and a maintainable deprecation path.
4. **Pass.** Section 7 states the small-project cost: decorator order, sessions, orchestration,
   event handling, state hooks, checkpoint serialization, telemetry exporters, and host-owned
   identity and retention policy.
5. **Pass.** Judgement is labelled **Opinion** and the extraction makes no comparison to another
   corpus repository. The .NET/Python table compares only the two implementations of this subject.
6. **Pass.** `node src/cli.ts check` passed 20/20 gates. In `site`, `npm run build` generated 60
   pages and `npm run check` reported 0 diagnostics and 520 internal links with 0 broken.
