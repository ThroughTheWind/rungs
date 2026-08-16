# Public agent-framework synthesis

Six pinned extractions test the workflow-derived catalogue against independently built agent
architectures. This is a comparison of mechanisms and boundaries, not a framework ranking. Each
cell below links to an extraction whose Snapshot records its source repository, exact commit,
licence, read date, measurements, and read boundary.

## 1. Six-framework comparison

| Template section | SWE-agent | LangGraph | OpenAI Agents SDK | Pydantic AI | Microsoft Agent Framework | OpenHands |
| --- | --- | --- | --- | --- | --- | --- |
| **2. Core loop** | One model → command → observation trajectory, with explicit format, cost, time, and retry exits ([trace](swe-agent.md#2-the-core-loop)). | A Pregel-style graph advances durable supersteps until no task remains or an interrupt halts it ([trace](langgraph.md#2-the-core-loop)). | A small runner loops over model output, tools, guardrails, handoffs, and final output in both Python and TypeScript ([trace](openai-agents-sdk.md#2-the-core-loop)). | Prompt, model-request, and tool/output graph nodes retry invalid output and stop on a typed result or bound ([trace](pydantic-ai.md#2-the-core-loop)). | Executors exchange workflow messages over edges; a group-chat host selects participants and owns termination/output ([trace](microsoft-agent-framework.md#2-the-core-loop)). | Canvas creates a conversation/worktree; Agent Server loops model steps, action events, tools, observations, approval waits, and terminal states ([trace](openhands.md#2-the-core-loop)). |
| **3. State and persistence** | A `.traj` file is an append-after-step record, but incomplete runs restart rather than resume ([state](swe-agent.md#3-state-and-persistence)). | Checkpoints, pending writes, channels, namespaces, and durability mode define replayable graph state ([state](langgraph.md#3-state-and-persistence)). | Run state can serialize interruption; session protocols persist conversation history, with stronger atomic history capabilities only in TypeScript ([state](openai-agents-sdk.md#3-state-and-persistence)). | Core continuation is caller-supplied message history; optional durable-execution adapters move I/O into Temporal, DBOS, or Prefect ([state](pydantic-ai.md#3-state-and-persistence)). | Workflow checkpoints capture executor state and pending requests through a host-selected store; emitted events are separate ([state](microsoft-agent-framework.md#3-state-and-persistence)). | Base state plus an event log restores a conversation; a restart marks an unmatched in-flight action as ambiguous error rather than rolling it back ([state](openhands.md#3-state-and-persistence)). |
| **4. Tools / outside world** | A compact agent-computer interface normalizes command schemas, state, truncation, empty output, and errors; the external runtime is another package ([tools](swe-agent.md#4-tools-and-the-outside-world)). | Nodes and tasks may perform effects, but checkpoint replay does not make those effects exactly once ([tools](langgraph.md#4-tools-and-the-outside-world)). | Function tools, hosted tools, MCP, computer use, and guardrails share runner events; effect policy stays with the host/tool ([tools](openai-agents-sdk.md#4-tools-and-the-outside-world)). | Typed inputs and dependencies validate the call boundary; ordinary callbacks still execute in the application process unless a durable adapter moves them ([tools](pydantic-ai.md#4-tools-and-the-outside-world)). | `AITool` schema and invocation middleware support approval and telemetry, while deployment/auth/storage remain host concerns ([tools](microsoft-agent-framework.md#4-tools-and-the-outside-world)). | Local tools have host filesystem access; worktrees isolate Git state, while all-in-one Docker and optional `DockerWorkspace` expose different mount/network/process boundaries ([tools](openhands.md#4-tools-and-the-outside-world)). |
| **5. Composition** | Not applicable: the bounded default path is one agent; no graph/handoff/sub-agent primitive was found in the named read boundary ([composition](swe-agent.md#5-composition)). | Subgraphs and parallel graph tasks compose through channels, namespaces, and checkpointed supersteps ([composition](langgraph.md#5-composition)). | Handoffs transfer continuation ownership; agent-as-tool runs a nested agent and returns to the caller ([composition](openai-agents-sdk.md#5-composition)). | Not applicable in the bounded core: another agent can be called as ordinary tool code, but no ownership-changing primitive was found ([composition](pydantic-ai.md#5-composition)). | Graph edges, executors, group-chat hosts, participant sessions, and explicit output mapping separate routing from disclosure ([composition](microsoft-agent-framework.md#5-composition)). | Multiple backends/conversations compose operationally; optional delegated child conversations run concurrently but share the parent workspace path ([composition](openhands.md#5-composition)). |
| **6. Human in loop** | `ShellAgent` supports terminal takeover and records human actions in the same trajectory, but the inspected loop has no pre-effect approval protocol ([human boundary](swe-agent.md#6-the-human-in-the-loop)). | An interrupt becomes checkpointed state with an addressable resume command; approver identity, authorization, and UI are application-owned ([human boundary](langgraph.md#6-the-human-in-the-loop)). | Pending tool approvals live in serializable run state; the application approves/rejects and owns authority, UI, and persistence ([human boundary](openai-agents-sdk.md#6-the-human-in-the-loop)). | Deferred requests carry call identity and validated arguments into a later run; the application supplies approver, storage, and UI ([human boundary](pydantic-ai.md#6-the-human-in-the-loop)). | Typed request/response messages can be checkpointed, and one client binds approval to the original action; the host still supplies the human authority and ledger ([human boundary](microsoft-agent-framework.md#6-the-human-in-the-loop)). | Canvas supplies live inspection, stop/resume, and risk buttons, but the server receives a boolean decision rather than the displayed action identity ([human boundary](openhands.md#6-the-human-in-the-loop)). |
| **7. Bargain** | Minimal, inspectable coding loop; limited recovery and product infrastructure ([bargain](swe-agent.md#7-the-abstraction-bargain)). | Precise replay and durable graph semantics; replay-safe effects remain the author's burden ([bargain](langgraph.md#7-the-abstraction-bargain)). | Portable small primitives and escape hatches; operational durability and approval authority remain host work ([bargain](openai-agents-sdk.md#7-the-abstraction-bargain)). | Strong typing, injection, and deterministic seams; provider variance and durable-engine constraints remain visible ([bargain](pydantic-ai.md#7-the-abstraction-bargain)). | Rich workflow, checkpoint, approval, and telemetry machinery; enterprise properties remain opt-in and host-owned ([bargain](microsoft-agent-framework.md#7-the-abstraction-bargain)). | A composed product supplies backend/workspace/history/Git/run-control surfaces; deployment shape still does not imply rollback or least privilege ([bargain](openhands.md#7-the-abstraction-bargain)). |

The pins are SWE-agent `3ea751c087f32b16e039a2233dd6eefecef325d5`, LangGraph
`644815f9e5bc52ad8f7a5227a456227e9c3e639b`, OpenAI Agents Python
`1a0c08868aec2a18eba964e5a07da4270a490c25`, OpenAI Agents TypeScript
`d85dd2c144cd99bfdfa0111975cc759c00d56a77`, Pydantic AI
`9a602b3216b2cde46bfe29c1d32927eb36c501d6`, Microsoft Agent Framework
`12621e0a746517068300f7b9445225c3ee2406ea`, Agent Canvas
`dc99e98615de4ace821692773b00a7f50d476e50`, and OpenHands SDK
`46ad3d43dc385b2e7975c0935f157153930ebb16`; each resolves from its linked
Snapshot above.

## 2. Convergences

### A loop is a bounded state machine, even when its syntax is not a loop

All six turn probabilistic model output into named state transitions and terminal conditions. The
linear subjects expose turn/cost/retry limits; graph subjects terminate on graph/manager state; the
product adds pause, stuck, budget, and error states
([SWE-agent loop](swe-agent.md#2-the-core-loop), [LangGraph loop](langgraph.md#2-the-core-loop),
[OpenAI loop](openai-agents-sdk.md#2-the-core-loop), [Pydantic loop](pydantic-ai.md#2-the-core-loop),
[Microsoft loop](microsoft-agent-framework.md#2-the-core-loop), [OpenHands loop](openhands.md#2-the-core-loop)).
**Opinion.** I do not treat “until done” as an execution contract. A repository procedure invoking an agent
should state the bounds and the state produced when each bound fires.

### The tool boundary is agent-facing and effect-unsafe by default

Every subject converts a model decision into a structured action and converts execution back into
model-visible state. Their strongest differences are schema richness and runtime location, not an
exactly-once guarantee
([SWE-agent ACI](swe-agent.md#4-tools-and-the-outside-world),
[LangGraph replay boundary](langgraph.md#4-tools-and-the-outside-world),
[Pydantic tool boundary](pydantic-ai.md#4-tools-and-the-outside-world),
[OpenHands isolation boundary](openhands.md#4-tools-and-the-outside-world)).
**Opinion.** I treat tool schema, error shape, truncation, environment access, and replay behavior as
one declared interface; validating arguments does not make the resulting effect reversible.

### Continuity has at least three independent layers

Five extractions independently warn that conversation history, resumable machine state, and
documentary intent are not interchangeable
([SWE-agent warning](swe-agent.md#8-what-rungs-takes),
[LangGraph warning](langgraph.md#8-what-rungs-takes),
[OpenAI warning](openai-agents-sdk.md#8-what-rungs-takes),
[Pydantic warning](pydantic-ai.md#8-what-rungs-takes),
[Microsoft warning](microsoft-agent-framework.md#8-what-rungs-takes)).
OpenHands adds a fourth useful distinction: a reconstructed event history can survive while the
environment before an ambiguous tool effect cannot
([OpenHands recovery](openhands.md#3-state-and-persistence)).
**Opinion.** I retain the existing `session-handoff` pattern only as narrative continuity; it
must say explicitly that it is not a machine checkpoint, event store, or conversation-memory API.

### A human pause is state; human authority is still external

LangGraph, OpenAI Agents SDK, Pydantic AI, Microsoft Agent Framework, and OpenHands can all stop on
a pending decision and continue later. None of the inspected boundaries supplies the complete set
of authenticated actor identity, authorization policy, durable retention, UI, and accountability
ledger
([LangGraph HITL](langgraph.md#6-the-human-in-the-loop),
[OpenAI HITL](openai-agents-sdk.md#6-the-human-in-the-loop),
[Pydantic HITL](pydantic-ai.md#6-the-human-in-the-loop),
[Microsoft HITL](microsoft-agent-framework.md#6-the-human-in-the-loop),
[OpenHands HITL](openhands.md#6-the-human-in-the-loop)).
Microsoft's binding client and OpenHands' boolean response provide the positive and negative cases
for one narrower invariant: the decision must bind to the exact surfaced request.

### Composition needs ownership and disclosure semantics

An OpenAI handoff, an agent-as-tool call, a LangGraph subgraph, a Microsoft executor edge, and an
OpenHands delegated child can look tool-shaped while differing in who continues, which state is
shared, and what becomes public output
([OpenAI composition](openai-agents-sdk.md#5-composition),
[LangGraph composition](langgraph.md#5-composition),
[Microsoft composition](microsoft-agent-framework.md#5-composition),
[OpenHands composition](openhands.md#5-composition)).
**Opinion.** I consider a routing declaration incomplete until it states continuation ownership, shared
state, and the output allow-list.

## 3. Divergences

**Opinion.** I use the mechanisms column for extracted evidence and the reconciliation column for my
synthesis judgement about what belongs in rungs.

| Choice | Mechanisms observed | Reconciliation |
| --- | --- | --- |
| **Durability unit** | trajectory step · graph superstep/checkpoint · serializable run state/session history · caller history/external durable activity · workflow checkpoint · event log/base state ([comparison §1](#1-six-framework-comparison)) | No universal default. Each mechanism must name what becomes durable together and what re-executes. |
| **Tool contract** | compact command ACI · arbitrary node code · multiple tool/provider protocols · typed dependency/schema boundary · middleware-wrapped `AITool` · terminal/editor/browser inside a workspace ([tool rows](#1-six-framework-comparison)) | Shared principles are bounds, validation, effect declaration, and explicit errors; tool breadth is product/framework specific. |
| **Composition** | none in two bounded cores · graph/subgraph · ownership-changing handoff or nested tool · executor graph/group-chat host · shared-workspace child conversations ([composition row](#1-six-framework-comparison)) | Admit ownership/output practices, not a preferred graph or delegation topology. |
| **Testing seam** | scripted models and loop traces appear in several repos; Pydantic AI makes deterministic substitution plus separate provider evidence the clearest contract ([Pydantic tests](pydantic-ai.md#2-the-core-loop)) | Add a testing pattern, while preserving the existing rule that a fake alone cannot prove the real boundary. |
| **Isolation** | Five bounded reads leave ordinary tool execution to the host/runtime; OpenHands alone exposes local-host, deployment-container, and per-workspace-container choices ([OpenHands tools](openhands.md#4-tools-and-the-outside-world)) | Execution-boundary declaration is commensurable with repo instructions. Container lifecycle and sandbox implementation are product architecture, not a rungs module pattern. |
| **Run control** | Library hosts receive events/interruption objects; OpenHands composes history, live stream, terminal/browser/Git views, stop/resume, and confirmation UI ([OpenHands human boundary](openhands.md#6-the-human-in-the-loop)) | The need to expose pending state is portable; a product UI/live-tail architecture is not commensurable with the workflow catalogue. |

**Opinion.** I take the most important divergence to be category, not implementation: the first five subjects are agent
libraries or focused runtimes, while OpenHands is a product that must package persistence,
workspaces, credentials, ingress, and user control
([product residue](openhands.md#what-the-product-has-that-the-five-libraries-do-not)).
Silently treating those product mechanisms as workflow-module defaults would merge the two corpora
at the point where their responsibilities differ most.

## 4. What nobody solved

1. **Exactly-once outside-world effects or general rollback.** LangGraph defines replay but still
   requires idempotent/recorded effects; Pydantic's durable adapters inherit engine retry rules;
   OpenHands records an interrupted action as ambiguous rather than reversing it
   ([LangGraph state](langgraph.md#3-state-and-persistence),
   [Pydantic state](pydantic-ai.md#3-state-and-persistence),
   [OpenHands state](openhands.md#3-state-and-persistence)).
2. **Semantic truth.** Typed outputs, guardrails, structured tools, and retries can reject malformed
   values; none establishes that a well-formed model answer is true
   ([Pydantic output gate](pydantic-ai.md#4-tools-and-the-outside-world),
   [OpenAI guardrail bargain](openai-agents-sdk.md#7-the-abstraction-bargain)).
3. **Complete approval accountability.** The strongest request binding still expects a host to
   authenticate the approver and retain decisions; the shipped UI counter-example sends only a
   boolean
   ([Microsoft approval](microsoft-agent-framework.md#6-the-human-in-the-loop),
   [OpenHands approval](openhands.md#6-the-human-in-the-loop)).
4. **A portable isolation and resource contract.** OpenHands documents several useful boundaries,
   but local mode has host access and its inspected Docker workspace sets no CPU, memory, PID, or
   read-only limit; the five other reads do not supply a common sandbox contract
   ([OpenHands boundary](openhands.md#4-tools-and-the-outside-world)).
5. **One continuity artifact for intent, replay, events, and environment.** The convergence above
   establishes that these are separate layers, not that combining them is desirable or possible
   ([continuity convergence](#continuity-has-at-least-three-independent-layers)).
6. **Comparable real-run capacity or cost.** OpenHands' synthetic concurrency test deliberately
   does not establish real tool/model capacity, and the corpus did not run or benchmark subjects
   ([OpenHands concurrency](openhands.md#concurrent-top-level-runs),
   [corpus scope](README.md#corpus-question)).

## 5. Catalogue reconciliation

`SW`, `LG`, `OA`, `PA`, `MF`, and `OH` below refer to the six pinned extractions in §1. “New
(merged)” means the candidate is adjudicated as a clause of another admitted id rather than copied
under two names.

**Opinion.** I make the outcomes and resulting changes as synthesis decisions; their evidence cells
link to the pinned observations that make each decision reviewable.

| Pattern id | Outcome | Evidence | Resulting catalogue change |
| --- | --- | --- | --- |
| `narrowest-anchor-loop` | confirmed | [SW](swe-agent.md#8-what-rungs-takes) | Add independent source `SW`; definition and rung stay. |
| `prompt-writes-artifact` | confirmed | [SW](swe-agent.md#8-what-rungs-takes) | Add `SW` and clarify that durable progress may be written before successful completion; rung stays 2. |
| `session-handoff` | confirmed (scope narrowed) | [SW](swe-agent.md#8-what-rungs-takes), [LG](langgraph.md#8-what-rungs-takes), [OA](openai-agents-sdk.md#8-what-rungs-takes), [PA](pydantic-ai.md#8-what-rungs-takes), [MF](microsoft-agent-framework.md#8-what-rungs-takes) | Retain rung 1; state that this is narrative continuity, not checkpoint, event log, or conversation memory. |
| `skill-neighbours` | confirmed (strengthened) | [OA](openai-agents-sdk.md#8-what-rungs-takes) | Add `OA`; require ownership/return semantics as part of the neighbour boundary. |
| `contract-test-base` | confirmed (strengthened) | [PA](pydantic-ai.md#8-what-rungs-takes) | Add `PA`; require separate real-boundary evidence because a deterministic fake alone proves only the loop. |
| `structural-gates` | not commensurable | [PA analogy](pydantic-ai.md#8-what-rungs-takes) | Typed model-output validation supports the same reasoning but is not evidence about repository link/id/path gates; no source or rung change. |
| `scope-discipline` | not commensurable | [MF analogy](microsoft-agent-framework.md#8-what-rungs-takes) | Namespaced workflow state is analogous to work ownership, not evidence for backlog scope; no change. |
| `worktree-lifecycle` | confirmed (scope narrowed) | [OH](openhands.md#8-what-rungs-takes) | Add `OH`; state that worktree lifecycle coordinates Git state and is not a process, filesystem, credential, or network sandbox. |
| `candidate: agent-facing-interface` | new | [SW](swe-agent.md#8-what-rungs-takes) | Admit `agent-facing-interface` under invocation, rung 2. |
| `candidate: bounded-agent-loop` | new | [SW](swe-agent.md#8-what-rungs-takes), [PA](pydantic-ai.md#2-the-core-loop), [OH](openhands.md#2-the-core-loop) | Admit `bounded-agent-loop` under invocation, rung 2. |
| `candidate: durable-superstep` | not commensurable | [LG](langgraph.md#8-what-rungs-takes) | Keep as architecture evidence only; rungs' documentary procedures do not own a transactional checkpoint unit. |
| `candidate: replay-safe-side-effect` | new | [LG](langgraph.md#8-what-rungs-takes), [PA](pydantic-ai.md#3-state-and-persistence), [OH counter-example](openhands.md#3-state-and-persistence) | Admit under workflows, rung 3: a resumable procedure names replay and effect handling. |
| `candidate: interrupt-as-state` | new (merged) | [LG](langgraph.md#8-what-rungs-takes) | Fold stable pending identity/resume state into `resumable-approval-state`; do not create a duplicate id. |
| `candidate: ownership-changing-handoff` | new | [OA](openai-agents-sdk.md#8-what-rungs-takes), [MF](microsoft-agent-framework.md#5-composition) | Admit under invocation, rung 2. |
| `candidate: protocol-with-escape-hatch` | new | [OA](openai-agents-sdk.md#8-what-rungs-takes), [PA portability warning](pydantic-ai.md#7-the-abstraction-bargain) | Admit under workflows, rung 2. |
| `candidate: resumable-approval-state` | new | [OA](openai-agents-sdk.md#8-what-rungs-takes), [PA](pydantic-ai.md#8-what-rungs-takes), [MF](microsoft-agent-framework.md#8-what-rungs-takes) | Admit under workflows, rung 2, including the merged interrupt-state clause. |
| `candidate: deterministic-model-substitution` | new | [PA](pydantic-ai.md#8-what-rungs-takes) | Admit under testing, rung 2, paired with separate real-boundary evidence. |
| `candidate: typed-output-gate` | new | [PA](pydantic-ai.md#8-what-rungs-takes) | Admit under gates, rung 1; distinguish structural validity from semantic truth. |
| `candidate: approval-bound-to-request` | new | [MF positive case](microsoft-agent-framework.md#8-what-rungs-takes), [OH counter-example](openhands.md#8-what-rungs-takes) | Admit under workflows, rung 2: immutable id/arguments, authorized decision, one-time consumption. |
| `candidate: event-stream-not-audit-log` | new | [MF](microsoft-agent-framework.md#8-what-rungs-takes), [OH](openhands.md#8-what-rungs-takes) | Admit under session continuity, rung 1, as an accountability-boundary warning. |
| `candidate: explicit-output-designation` | new | [MF](microsoft-agent-framework.md#8-what-rungs-takes) | Admit under workflows, rung 2: public output is an allow-list, not incidental graph connectivity. |
| `candidate: isolation-boundary-declaration` | new | [OH](openhands.md#8-what-rungs-takes) | Admit under instructions, rung 0: execution unit, crossings, and absent controls must be named. |
| `candidate: event-log-plus-live-tail` | not commensurable | [OH](openhands.md#8-what-rungs-takes) | Retain as product-architecture evidence; no current rungs module owns a replayable UI transport. |
| `candidate: run-control-surface` | not commensurable | [OH](openhands.md#8-what-rungs-takes) | Retain as product residue; terminal/browser/Git UI is not a workflow-module default. |
| `candidate: shared-workspace-subagents` | demoted | [OH](openhands.md#8-what-rungs-takes) | Reject as a catalogue default: parallel writers need explicit ownership or serialization first. |

Every candidate named by the six extractions is adjudicated above. **Opinion.** I make no existing rung changes: the
independent evidence changes definitions and source confidence, while every admitted practice fits
the maturity threshold of its target module. Product-only candidates remain in this synthesis so
the absence from the catalogue is a decision rather than an omission.

## 6. Consequences for rungs

The catalogue changes are documentation inputs to the shipped modules; this item does not edit
`modules/`. The affected surfaces are `instructions`, `workflows`, `skills`, `gates`, `session`, and
`testing`. [WI-029](../../backlog/archive/WI-029-apply-framework-patterns-to-modules.md) will decide
which definitions require changes to manifests, templates, skills, gates, or module versions.

No ADR is admitted. [The admission rule](../../decisions/README.md#admission-rule) fails because this
work item and the canonical catalogue already own the classification, and reversing a
documentation-only reconciliation later is not materially more expensive. An ADR would duplicate
the reconciliation table rather than constrain a separate future decision.

**Opinion.** I take the strongest finding to be non-commensurability. OpenHands shows that backend selection, sandbox
implementation, event-tail transport, and run-control UI are real product work. The workflow
catalogue should make execution boundaries visible, but it should not pretend that installing a
repository module supplies those product capabilities.
