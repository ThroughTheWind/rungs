# Microsoft Agent Framework

## 1. Snapshot

| Field | Value |
| --- | --- |
| Repository | [`microsoft/agent-framework`](https://github.com/microsoft/agent-framework) |
| Pinned commit | [`12621e0a746517068300f7b9445225c3ee2406ea`](https://github.com/microsoft/agent-framework/tree/12621e0a746517068300f7b9445225c3ee2406ea) |
| Date read | 2026-08-15 |
| Licence | MIT — [`LICENSE`](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/LICENSE) |
| Languages | C#/.NET and Python |
| Measured scale | 4,893 tracked files; 1,969 tracked `.cs`; 1,154 tracked `.py`; 945 C# files in `dotnet/src`; 623 Python files in `python/packages` |

**Measured 2026-08-15 at the pinned commit, in PowerShell:**

```powershell
(git ls-files | Measure-Object -Line).Lines
(git ls-files -- '*.cs' | Measure-Object -Line).Lines
(git ls-files -- '*.py' | Measure-Object -Line).Lines
(git ls-files -- 'dotnet/src/*.cs' 'dotnet/src/**/*.cs' |
  Sort-Object -Unique | Measure-Object -Line).Lines
(git ls-files -- 'python/packages/*.py' 'python/packages/**/*.py' |
  Sort-Object -Unique | Measure-Object -Line).Lines
```

The commands produced 4,893, 1,969, 1,154, 945, and 623. They count tracked paths, not logical
lines of code or public APIs.

**Read boundary.** The .NET implementation is primary. I traced the
`GroupChatToolApproval` sample from two `ChatClientAgent`s through `GroupChatWorkflowBuilder`, the
agent-host executor, external request/response handling, the in-process runner, checkpoints,
workflow events, and OpenTelemetry. I then checked the Python core's corresponding agent, tool,
workflow, functional-workflow, session, approval, and observability surfaces for divergence. Hosted
Azure services, provider transports, evaluation, declarative agents, realtime, and the separate
durable extension are outside the boundary.

The repository describes the public surface as agents plus graph-based multi-agent workflows in
both languages. Its .NET contributor map names `AIAgent`, `AgentSession`, `ChatClientAgent`,
`IChatClient`, `AITool`, messages, and content as the core types
([.NET source map](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/AGENTS.md#L15-L33)).

## 2. The core loop

At the single-agent boundary, `AIAgent.RunAsync` normalizes overloads and delegates to
`RunCoreAsync`. `ChatClientAgent` prepares a concrete session, messages, options, context providers,
and history, calls the decorated `IChatClient`, records provider failure or new messages, updates
the service conversation id, and returns `AgentResponse`
([`AIAgent` run contract](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Abstractions/AIAgent.cs#L320-L369),
[`ChatClientAgent.RunCoreAsync`](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI/ChatClient/ChatClientAgent.cs#L205-L267)).
The default client pipeline adds approval binding and bypass logic, function invocation, optional
message injection and per-service-call history persistence, and an inert telemetry slot around the
provider client
([default decorator pipeline](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI/ChatClient/ChatClientExtensions.cs#L43-L143)).

The traced multi-agent path starts in
`dotnet/samples/03-workflows/Agents/GroupChatToolApproval/Program.cs`. It constructs QA and DevOps
agents with different tools, wraps only the production-deployment function in
`ApprovalRequiredAIFunction`, supplies a four-turn manager, and builds a group-chat workflow
([agent and tool setup](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/samples/03-workflows/Agents/GroupChatToolApproval/Program.cs#L49-L84)).
Its custom manager selects QA for the first turn and DevOps thereafter
([speaker selection](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/samples/03-workflows/Agents/GroupChatToolApproval/DeploymentGroupChatManager.cs#L18-L49)).

`GroupChatWorkflowBuilder` turns each agent into an executor, creates one host with the canonical
conversation, connects host-to-participant and participant-to-host edges, and designates host output
plus participant intermediate output
([builder expansion](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/GroupChatWorkflowBuilder.cs#L15-L91)).
The host's manager selects the next participant from the full history; each participant keeps its
own session while the host broadcasts only the new messages, and the manager's iteration count
bounds the loop
([manager contract](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/GroupChatManager.cs#L16-L102)).

The runner processes work in supersteps. The sample starts a lockstep streaming run, sends a turn
token, and consumes typed `WorkflowEvent`s until completion or error. Agent outputs return through
edges to the host, which either selects another speaker, reaches the manager's limit, or halts for
an external request
([sample execution loop](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/samples/03-workflows/Agents/GroupChatToolApproval/Program.cs#L86-L151),
[`StreamingRun` contract](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/StreamingRun.cs#L13-L104)).

## 3. State and persistence

There are three state layers in the traced .NET path. Each `AIAgentHostExecutor` holds an
`AgentSession` and current-turn settings; the group-chat host holds canonical conversation and
manager state; the in-process runner holds queued messages, external requests, edge state, and
executor state
([agent host state](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/Specialized/AIAgentHostExecutor.cs#L13-L50),
[manager checkpoint hooks](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/GroupChatManager.cs#L104-L182)).

A workflow checkpoint contains the superstep number, workflow description, runner data, executor
state, edge state, and optional parent. `CheckpointManager` can use a process-memory implementation
or JSON over an application-supplied `ICheckpointStore`; that store must return its index in commit
order and namespaces records by session id
([checkpoint payload](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/Checkpointing/Checkpoint.cs#L9-L41),
[`CheckpointManager`](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/CheckpointManager.cs#L12-L88),
[`ICheckpointStore`](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/Checkpointing/ICheckpointStore.cs#L8-L58)).

The human-in-the-loop checkpoint sample makes the recovery contract explicit: providing a manager
creates a checkpoint after each superstep; a `SuperStepCompletedEvent` carries its identity; later
`RestoreCheckpointAsync` rewinds the same run, including the pending external-input cycle
([checkpoint and restore](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/samples/03-workflows/Checkpoint/CheckpointWithHumanInTheLoop/Program.cs#L31-L101)).
Executor-local mutable state survives only if the executor implements checkpoint and restore hooks;
the sample explicitly saves and reloads its attempt counter
([executor state hooks](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/samples/03-workflows/Checkpoint/CheckpointWithHumanInTheLoop/WorkflowFactory.cs#L57-L100)).

**Opinion.** A checkpoint is recovery state, not a historical ledger. It represents one restorable execution
point and may branch through parent ids; the application chooses the durable store, retention,
tenant scoping, and authorization. The default manager is process memory, so its checkpoints do not
survive a process crash
([default manager](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/CheckpointManager.cs#L29-L48)).

## 4. Tools and the outside world

The framework relies on `Microsoft.Extensions.AI` tool primitives. A `ChatClientAgent` accepts
`AITool`s and injects `FunctionInvokingChatClient` when the caller's client does not already contain
one. Its own security contract says tools execute without approval by default, model arguments are
untrusted, and side-effecting or irreversible tools should require explicit approval
([constructor and security boundary](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI/ChatClient/ChatClientAgent.cs#L15-L91),
[function layer insertion](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI/ChatClient/ChatClientExtensions.cs#L88-L101)).

The deployment sample derives tool schema from C# methods and `[Description]` attributes. Three
functions execute normally; only `DeployToProduction` is wrapped for approval
([tool declaration and effects](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/samples/03-workflows/Agents/GroupChatToolApproval/Program.cs#L154-L177)).
**Opinion.** The callback still owns the side effect, validation beyond its declared input types, idempotency,
compensation, credentials, and external authorization. Workflow checkpoints cannot make that
outside-world effect transactional.

When an agent runs inside a workflow, `AIAgentHostExecutor` registers typed handlers for approval
requests and function results. It invokes the agent with a per-agent session, collects unserviced
requests, yields optional agent events, and submits pending requests to the workflow
([handler registration](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/Specialized/AIAgentHostExecutor.cs#L27-L73),
[agent invocation and request collection](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/Specialized/AIAgentHostExecutor.cs#L218-L297)).
The runner stores the request by id and emits `RequestInfoEvent`; duplicate pending ids fail rather
than overwrite
([external request post](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/InProc/InProcessRunnerContext.cs#L301-L327)).

## 5. Composition

The .NET surface offers both general graph construction and named multi-agent shapes. The general
`WorkflowBuilder` connects typed executors with edges and explicit output designations. The agent
facade builds sequential, concurrent, group-chat, handoff, and Magentic workflows
([agent workflow factories](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/AgentWorkflowBuilder.cs#L14-L182)).

The traced group chat is not peer negotiation. `GroupChatManager.SelectNextAgentAsync` owns speaker
selection, receives the canonical history, and can filter the per-turn broadcast. The selected
agent receives messages and an isolated session; its response crosses an edge back to the host,
which retains orchestration ownership
([manager selection and broadcast](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/GroupChatManager.cs#L50-L101),
[host/participant graph](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/GroupChatWorkflowBuilder.cs#L42-L90)).
The manager's base iteration count is checkpointed automatically; a subclass receives a prefixed
state namespace for any additional cursor or model-session state
([composition state boundary](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/GroupChatManager.cs#L104-L182)).

Output is a separate design choice from routing. The group-chat builder chooses the host as final
output and participant agents as intermediate output; general builders can replace those
designations. This prevents every internal executor payload from becoming caller-facing merely
because it crossed an edge
([default output designations](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/GroupChatWorkflowBuilder.cs#L73-L89)).

## 6. The human in the loop

Approval is attached to a specific tool call, not to a plan or whole workflow. The sample displays
the agent/port, tool name, and serialized arguments from `RequestInfoEvent`, then creates a typed
approval response and sends it back on the same streaming run
([approval event loop](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/samples/03-workflows/Agents/GroupChatToolApproval/Program.cs#L98-L119)).
`StreamingRun` queues that response for the next superstep; its event stream can either block while
waiting or return control to a host that owns the turn loop
([response and wait semantics](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/StreamingRun.cs#L34-L120)).

The control is stronger than trusting the caller's response payload. The default approval-binding
decorator snapshots each model-originated pending request in `AgentSession`, keyed by request id.
On resume it ignores unknown or duplicate approvals and rebinds an altered response to the exact
tool name and arguments that were originally surfaced
([approval binding contract](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI/ChatClient/ApprovalResponseBindingChatClient.cs#L15-L53),
[validation and rebinding](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI/ChatClient/ApprovalResponseBindingChatClient.cs#L157-L288),
[snapshot persistence](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI/ChatClient/ApprovalResponseBindingChatClient.cs#L391-L477)).

**Opinion.** The framework supplies call identity, immutable request binding, pause/resume mechanics, and
checkpointable workflow state. The host supplies the human or policy engine, authenticates the
actor, authorizes the decision, records the reason if required, renders the UI, and stores state
durably. The sample auto-approves in code; it demonstrates the protocol, not human authority.

### What is recorded about a run?

Every non-streaming `Run` accumulates typed `WorkflowEvent`s in a process-local list; consumers can
read all outgoing events or only those since the last bookmark. `StreamingRun` exposes the same
events in order as an async stream
([`Run` event sink](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/Run.cs#L13-L76),
[`WorkflowEvent` base](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/WorkflowEvent.cs#L8-L29)).
Invocation, completion, failure, output, request, warning, and superstep types let application code
and evaluation code read the run mechanically; the deployment sample itself handles request,
streaming response, and failure events.

OpenTelemetry is a second channel. `.WithOpenTelemetry` is opt-in per .NET workflow and emits spans
for build, workflow session/run, executor processing, edge routing, message delivery, and errors.
The application owns the `ActivitySource` and exporter
([telemetry activation](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/OpenTelemetryWorkflowBuilderExtensions.cs#L10-L67),
[Aspire exporter sample](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/samples/03-workflows/Observability/AspireDashboard/Program.cs#L25-L69)).
Raw inputs, outputs, and message content are excluded unless `EnableSensitiveData` is explicitly
enabled
([telemetry privacy default](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/Observability/WorkflowTelemetryOptions.cs#L6-L25)).

**Opinion.** The events are a rich run record and the spans are an operator-facing diagnostic
record, but neither is an audit trail by itself. The event list is ephemeral, exporters and
retention are application choices, content is intentionally absent by default, and the framework
does not attach authenticated human identity to an approval. An audit trail needs a durable,
access-controlled sink and an application-defined actor/policy record in addition to these signals.

## 7. The abstraction bargain

### .NET/Python divergences at the pin

| Difference | Classification | Evidence and consequence |
| --- | --- | --- |
| Python has a `@workflow` functional API that returns a stateless definition and requires `build()` for caller-scoped mutable execution; the inspected .NET workflow package uses builder/executor classes and has no `FunctionalWorkflow` or workflow attribute. | Language idiom plus design surface | [`FunctionalWorkflowDefinition`](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/python/packages/core/agent_framework/_workflows/_functional.py#L640-L716), [`workflow` decorator](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/python/packages/core/agent_framework/_workflows/_functional.py#L1309-L1377). The Python surface uses decorator syntax to make definition versus per-caller instance explicit. |
| .NET workflow telemetry is disabled until `.WithOpenTelemetry`; Python workflow entry points create spans subject to global observability settings, whose instrumentation default is enabled. | Design surface | [.NET opt-in](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/OpenTelemetryWorkflowBuilderExtensions.cs#L31-L67), [Python workflow span](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/python/packages/core/agent_framework/_workflows/_workflow.py#L488-L520), [Python settings](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/python/packages/core/agent_framework/observability.py#L722-L755). Operators must know whether silence means disabled instrumentation or an unconfigured exporter. |
| .NET marks a local function by wrapping `AIFunction` in `ApprovalRequiredAIFunction`; Python's `@tool` carries `approval_mode="always_require"`. | Language idiom | [.NET sample](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/samples/03-workflows/Agents/GroupChatToolApproval/Program.cs#L61-L72), [Python decorator contract](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/python/packages/core/agent_framework/_tools.py#L1207-L1260). Both reach request/response approval content; the declaration syntax differs. |

**Bounded absence check, 2026-08-15.**
`rg -n 'FunctionalWorkflow|WorkflowAttribute|class .*WorkflowDefinition'
dotnet/src/Microsoft.Agents.AI.Workflows` returned no match. This establishes the inspected .NET
package boundary, not the absence of every functional or declarative API in the repository.

### One explicitly retired practice

The accepted provider-client decision records that Python core had bundled OpenAI and Azure
provider implementations and dependencies. It retired that shape because it made core heavier than
necessary and conflated core abstractions with one provider; the replacement extracts provider
packages, keeps lazy compatibility imports, and quarantines deprecated wrappers for later deletion
([problem and drivers](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/docs/decisions/0021-provider-leading-clients.md#L9-L27),
[decision outcome](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/docs/decisions/0021-provider-leading-clients.md#L29-L45)).
The same decision deprecates the assistants client and the V1 service client; the migration gallery
then removes assistants-parity samples rather than teaching a deprecated surface
([deprecated clients](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/docs/decisions/0021-provider-leading-clients.md#L33-L41),
[removed migration samples](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/python/samples/semantic-kernel-migration/README.md#L14-L21)).

**Opinion.** The enterprise bargain is explicit control surfaces rather than automatic guarantees.
The framework makes sessions, approval, typed workflow events, checkpoint stores, output
designations, telemetry, and provider separation available without inventing them in each
application. A small project pays in concepts and configuration: decorator pipeline ordering,
per-agent sessions, a manager or graph, event handling, state hooks, checkpoint serialization,
exporters, and host-owned identity/retention policy. Omitting those pieces remains possible, but
then “production-grade” describes available machinery rather than the application's achieved
properties.

**Opinion.** The approval binding is the strongest part of the bargain. It refuses a forged or
mutated approval response at the framework boundary. Its limit is equally important: matching the
approved bytes does not establish that the approver had authority or that the effect remains safe
at execution time.

## 8. What rungs takes

These verdicts are inputs to WI-017; they do not change the catalogue here.

| Pattern id | Verdict | Pinned evidence | Reason |
| --- | --- | --- | --- |
| `session-handoff` | take-as-warning | [checkpoint payload](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/Checkpointing/Checkpoint.cs#L9-L41), [event sink](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/Run.cs#L13-L76) | **Opinion.** Recovery state, emitted history, and documentary intent are independent continuity layers; one cannot safely stand in for the others. |
| `scope-discipline` | take-as-analogy | [prefixed manager state](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/GroupChatManager.cs#L104-L182) | **Opinion.** Shared state needs an ownership namespace just as work needs an ownership boundary; a convenient global bag otherwise turns composition into collisions. |
| `candidate: approval-bound-to-request` | take | [binding contract](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI/ChatClient/ApprovalResponseBindingChatClient.cs#L15-L53), [rebinding](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI/ChatClient/ApprovalResponseBindingChatClient.cs#L247-L288) | **Opinion.** Approval is valid only for the exact surfaced action identity and arguments, and it should be consumed once; a later caller-supplied payload must not redefine what was approved. |
| `candidate: resumable-approval-state` | take | [workflow request post](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/InProc/InProcessRunnerContext.cs#L301-L327), [checkpointed HITL sample](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/samples/03-workflows/Checkpoint/CheckpointWithHumanInTheLoop/Program.cs#L31-L101) | **Opinion.** A pending request belongs in recoverable state with stable identity and a typed response path; the host can then own timing, UI, and authority. |
| `candidate: event-stream-not-audit-log` | take-as-warning | [`WorkflowEvent`](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/WorkflowEvent.cs#L8-L29), [telemetry privacy default](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/Observability/WorkflowTelemetryOptions.cs#L6-L25) | **Opinion.** Events and spans are audit inputs, not accountability: durability, retention, access control, actor identity, and decision reasons must be named separately. |
| `candidate: explicit-output-designation` | take | [group-chat output mapping](https://github.com/microsoft/agent-framework/blob/12621e0a746517068300f7b9445225c3ee2406ea/dotnet/src/Microsoft.Agents.AI.Workflows/GroupChatWorkflowBuilder.cs#L73-L89) | **Opinion.** Internal progress should become public output only through an allow-list; graph connectivity alone must not decide disclosure. |

The strongest counter-evidence is that most enterprise properties remain opt-in or host-owned:
checkpoints default to memory, .NET workflow telemetry defaults off, sensitive content defaults
off, approval defaults off for tools, and the framework does not authenticate an approver or retain
an audit ledger.
