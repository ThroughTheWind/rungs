# OpenHands

## 1. Snapshot

OpenHands' current open-source product spans two repositories: Agent Canvas owns the user-facing
control surface and `software-agent-sdk` owns the agent, tools, conversations, workspaces, and Agent
Server API. The Canvas README names that split explicitly
([Canvas architecture](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/README.md#L122-L126)).

| Field | Agent Canvas | Agent runtime and server |
| --- | --- | --- |
| Repository | [`OpenHands/OpenHands`](https://github.com/OpenHands/OpenHands) | [`OpenHands/software-agent-sdk`](https://github.com/OpenHands/software-agent-sdk) |
| Pinned commit | [`dc99e98615de4ace821692773b00a7f50d476e50`](https://github.com/OpenHands/OpenHands/tree/dc99e98615de4ace821692773b00a7f50d476e50) | [`46ad3d43dc385b2e7975c0935f157153930ebb16`](https://github.com/OpenHands/software-agent-sdk/tree/46ad3d43dc385b2e7975c0935f157153930ebb16) |
| Date read | 2026-08-15 | 2026-08-15 |
| Licence | MIT — [`LICENSE`](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/LICENSE) | MIT — [`LICENSE`](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/LICENSE) |
| Primary language | TypeScript/TSX | Python |
| Measured scale | 1,995 tracked files; 1,701 tracked `.ts`/`.tsx` files; 1,128 of those under `src` | 1,469 tracked files; 1,256 tracked `.py` files; 286 Python files in `openhands-sdk`; 70 in `openhands-agent-server`; 10 in `openhands-workspace` |

**Measured 2026-08-15 at the pinned commits, in PowerShell:**

```powershell
# OpenHands/OpenHands
(git ls-files | Measure-Object -Line).Lines
(git ls-files -- '*.ts' '*.tsx' | Measure-Object -Line).Lines
(git ls-files -- 'src/*.ts' 'src/**/*.ts' 'src/*.tsx' 'src/**/*.tsx' |
  Sort-Object -Unique | Measure-Object -Line).Lines

# OpenHands/software-agent-sdk
(git ls-files | Measure-Object -Line).Lines
(git ls-files -- '*.py' | Measure-Object -Line).Lines
(git ls-files -- 'openhands-sdk/*.py' 'openhands-sdk/**/*.py' |
  Sort-Object -Unique | Measure-Object -Line).Lines
(git ls-files -- 'openhands-agent-server/*.py' 'openhands-agent-server/**/*.py' |
  Sort-Object -Unique | Measure-Object -Line).Lines
(git ls-files -- 'openhands-workspace/*.py' 'openhands-workspace/**/*.py' |
  Sort-Object -Unique | Measure-Object -Line).Lines
```

The commands produced the counts in the table. They count tracked paths, not logical lines, runtime
processes, or test cases.

**Read boundary.** I traced local Agent Canvas conversation creation through the Agent Server,
`LocalConversation`, the default agent response/action path, terminal and file-editor tools, event
persistence, Git read APIs, worktree creation, run-control WebSockets, confirmation controls,
sub-agent delegation, the optional `DockerWorkspace`, and the synthetic concurrent-conversation
stress test. I also read the Canvas packaging and documented local/Docker launch boundaries. Hosted
OpenHands Cloud implementation, automation internals, provider transports, ACP subprocess
implementations, the browser tool implementation, evaluation suites, and frontend surfaces outside
run/repository control are outside the boundary. I did not run or deploy the product.

## 2. The core loop

Agent Canvas creates a local conversation with a selected working directory. Unless the caller
explicitly selects the repository in place, Canvas resolves the workspace mode to `new_worktree`
and sends `worktree: true`; cloud creation instead calls the hosted app-conversation API and waits
for its task to become ready
([Canvas creation](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/api/conversation-service/agent-server-conversation-service.api.ts#L390-L500)).
The adapter adds the agent profile, workspace, client tools, confirmation policy, iteration bound,
and stuck detection to `StartConversationRequest`
([request construction](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/api/agent-server-adapter.ts#L1038-L1120),
[`StartConversationRequest`](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/conversation/request.py#L93-L151)).

For a valid Git repository, Agent Server chooses a base ref, creates
`/tmp/conversation-worktrees/<conversation-id>/<project-name>`, and checks out a new
`openhands/<conversation-id>` branch there. A non-Git path or a request with worktrees disabled
continues in the supplied workspace
([base selection and worktree creation](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/conversation_service.py#L140-L274)).
The service then persists a `StoredConversation`, creates an `EventService`, and sends the initial
message with `run=True`
([conversation start](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/conversation_service.py#L1451-L1590)).

The same run path is used after creation. The browser sends a user message over the conversation
WebSocket, or falls back to REST when the socket is unavailable, with `run: true`
([Canvas send path](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/contexts/conversation-websocket-context.tsx#L1032-L1075));
the authenticated server socket appends it to that conversation's event service and starts the run
([server socket](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/sockets.py#L226-L383)).

`LocalConversation.run` moves the status to running and repeatedly calls `agent.step`. It stops on
pause, stuck detection, completion, confirmation wait, budget/iteration limits, or an error; bounded
limits become explicit error state and events
([synchronous run loop](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/conversation/impl/local_conversation.py#L1856-L2020)).
An agent step executes any pending actions, prepares the model messages, requests a response, and
dispatches tool calls or final content
([agent step and response path](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/agent/agent.py#L636-L825)).
Tool calls are parsed, normalized, validated against the registered tool, annotated with summary
and risk, and emitted as `ActionEvent`s; unless policy requires confirmation, the parallel executor
runs the action and emits its observation
([action construction](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/agent/agent.py#L1199-L1341),
[response dispatch](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/agent/response_dispatch.py#L156-L236)).

There is no separate “commit the run” phase in the inspected local API. Repository mutation,
including `git commit`, is an agent-selected terminal command. The product's pull, push, and pull
request controls likewise send natural-language instructions to the agent
([Git action prompts](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/utils/utils.ts#L461-L500)).
After a commit, Canvas reads changes, diffs, and commits through GET-only Git routes
([Canvas Git client](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/api/git-service/agent-server-git-service.api.ts#L98-L211),
[Agent Server Git routes](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/git_router.py#L115-L177)).
The trace therefore reaches a committed change only when the model chooses and successfully runs
that terminal command; conversation completion alone does not guarantee a commit, push, or pull
request.

## 3. State and persistence

`ConversationState` holds the agent, workspace, configuration, execution status, statistics,
message/tool events, and agent-specific state. With a persistence directory it stores base state
as JSON and events in an `EventLog`; public-field changes autosave base state
([state fields](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/conversation/state.py#L82-L255),
[save and autosave](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/conversation/state.py#L421-L442),
[autosave hook](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/conversation/state.py#L581-L618)).
`ConversationState.create` either initializes those stores or reloads base state and the event log,
rebuilds derived state, verifies that restored tools are compatible, and substitutes the runtime
workspace supplied by the server
([create or resume](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/conversation/state.py#L446-L576)).
Secrets are encrypted when a cipher is supplied; without one they are redacted and cannot be
recovered from the saved JSON
([base-state serialization](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/conversation/state.py#L421-L442)).

Agent Server binds each loaded conversation to an `EventService` and its own persistence directory.
Live model deltas are sent to subscribers but deliberately are not persisted
([event service construction and streaming](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/event_service.py#L953-L1060)).
On restart, a conversation persisted as running is changed to error. The service scans its event
log for an action without a matching observation and appends a non-retryable error saying the
restart occurred while that tool was in progress
([restart reconciliation](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/event_service.py#L1093-L1127)).

This is event-consistency recovery, not environment rollback. A `LocalWorkspace` pause is a no-op
because the workspace is the host filesystem
([local pause/resume](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/workspace/local.py#L202-L216));
the restart path records an ambiguous in-flight effect but does not undo it. Persisted events and
base state can reconstruct the conversation, while an in-flight model stream, Python stack, and
the pre-action filesystem are not snapshots restored by this mechanism. A dedicated Git worktree
can make the repository branch disposable, but it cannot roll back effects outside that checkout.

Canvas reconstructs the user view by fetching paginated REST history first and then opening a
WebSocket with a `since` timestamp. It deduplicates replayed event ids and applies live status,
statistics, terminal, and browser events
([history plus live tail](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/contexts/conversation-websocket-context.tsx#L253-L375),
[event handling](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/contexts/conversation-websocket-context.tsx#L511-L640),
[reconnect options](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/contexts/conversation-websocket-context.tsx#L903-L1028)).

## 4. Tools and the outside world

### The default boundary is the host, not a sandbox

`LocalWorkspace` explicitly provides direct local-filesystem access and executes commands with a
working directory on the host
([local workspace](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/workspace/local.py#L17-L80)).
The file editor starts from a workspace root, but its path validation accepts absolute paths and
checks existence/command compatibility rather than containment under that root
([editor setup](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-tools/openhands/tools/file_editor/editor.py#L76-L119),
[path validation](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-tools/openhands/tools/file_editor/editor.py#L626-L671)).
The product documentation matches the implementation: the default npm/source launch runs Agent
Server directly on the machine and warns that the agent has full filesystem access
([unsandboxed launch](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/README.md#L63-L80),
[source launch warning](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/README.md#L106-L117)).
A per-conversation worktree changes the Git checkout and branch; it does not create an operating
system security boundary around either tool.

### Two different Docker boundaries

Agent Canvas' documented Docker option is one all-in-one product container. It mounts persisted
settings/conversations and a host `PROJECTS_PATH` at `/projects`, and the documentation says the
agent can access every project under that mounted directory
([Docker launch](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/README.md#L82-L104)).
The image combines Agent Server, automation, the static frontend, and an ingress proxy; it declares
the two mounted volumes and one exposed port
([all-in-one image](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/docker/Dockerfile#L1-L18),
[volumes and entrypoint](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/docker/Dockerfile#L139-L162)).
That container is a deployment boundary for a server that can host multiple conversations, not a
fresh container promised for every Canvas conversation.

The SDK separately offers `DockerWorkspace`, which starts a prebuilt Agent Server container for
one remote-workspace object. Its contract exposes user-chosen volume mounts, an optional Docker
network and GPU access, selected environment variables, and a mapped port
([workspace configuration](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-workspace/openhands/workspace/docker/workspace.py#L53-L128),
[container launch](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-workspace/openhands/workspace/docker/workspace.py#L171-L282)).
Cleanup stops that container; pause and resume use `docker pause` and `docker unpause`
([lifecycle](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-workspace/openhands/workspace/docker/workspace.py#L367-L427)).

**Bounded absence check, 2026-08-15.**
`rg -n 'memory|cpus|cpu-shares|read-only|pids-limit' openhands-workspace/openhands/workspace/docker/workspace.py`
found no CPU, memory, PID, or read-only-filesystem limit in this class. The search says only that
the inspected launcher does not set those controls; an operator or another workspace
implementation can impose limits outside it.

### Repository ingress and egress

For an existing local repository, Canvas supplies a working directory and normally asks Agent
Server to create the dedicated worktree described above. For a remote repository, the run-control
bar first stores repository metadata and then asks the agent in chat to clone the repository and
check out the selected branch; clone failure is therefore reported through the conversation
([repository selection](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/components/features/chat/git-control-bar.tsx#L138-L181)).
Changes leave by the same tool boundary: the agent runs Git/provider commands, while Canvas asks it
to pull, push, or open a pull request and reads resulting diffs and commits. The inspected Git API
has no write route
([prompted egress](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/utils/utils.ts#L461-L500),
[GET routes](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/git_router.py#L115-L177)).

## 5. Composition

At the product level, Agent Canvas can connect to multiple backends, while each Agent Server offers
multiple agents on one host and port
([documented backend composition](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/README.md#L33-L42),
[server boundary](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/README.md#L122-L126)).
Conversation identity partitions persistence, event subscribers, run state, and—on Canvas' default
local path—a Git worktree and branch. It does not partition the host filesystem or operating-system
process boundary.

The opt-in delegate tool adds in-run composition. It spawns child `LocalConversation`s with copied
LLM instances, the parent's workspace path and confirmation policy, and child persistence beneath
the parent's directory
([sub-agent construction](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-tools/openhands/tools/delegate/impl.py#L132-L247)).
Delegated tasks run concurrently in threads; their final responses and usage metrics return to the
parent
([parallel delegation](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-tools/openhands/tools/delegate/impl.py#L279-L395)).
Because those children receive the same workspace path, delegation isolates conversation/event
state but not concurrent filesystem writes inside the parent's checkout.

### Concurrent top-level runs

The Agent Server stress suite contains a synthetic 16-conversation contract. It starts separate
conversations against one workspace path and scripted slow LLMs with `asyncio.gather`, then checks
completion, per-conversation persistence, lack of scripted-response leakage, wall time below four
times a single conversation, and RSS growth below twice the baseline
([concurrency test](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/tests/agent_server/stress/test_concurrent_conversations.py#L80-L180),
[budgets](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/tests/agent_server/stress/budgets.py#L51-L60)).
That test does not create worktrees, execute filesystem tools, call real models, or establish a
production capacity. It is evidence for concurrent scheduling and conversation/persistence
separation under its fixture, not for repository-write isolation or cost per real run.

**Opinion.** The direct comparison with rungs is no longer containers-versus-worktrees. Current
Canvas itself chooses a worktree by default, gaining a separate checkout, index, and branch at the
cost of another checkout while sharing the Git object database and wider host. The all-in-one
Docker launch moves that shared host boundary into one container; `DockerWorkspace` can instead
spend a container per workspace. The pinned source provides no controlled cost measurement with
which to call one arrangement better.

## 6. The human in the loop

Canvas exposes a reconstructed event history plus a live stream, execution state and usage,
terminal commands/output, browser screenshots and URLs, Git diffs/commits, and message steering
([run event handling](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/contexts/conversation-websocket-context.tsx#L511-L640),
[Git client](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/api/git-service/agent-server-git-service.api.ts#L126-L272)).
Local stop uses immediate interrupt, which cancels the in-flight request; cloud stop pauses its
sandbox. Resume starts the conversation again
([Canvas stop/resume](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/hooks/mutation/conversation-mutation-utils.ts#L41-L60),
[resume](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/hooks/mutation/conversation-mutation-utils.ts#L108-L123)).
The server distinguishes pause, which waits for the current model call, from interrupt, which
cancels it immediately and leaves the conversation resumable
([server controls](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/conversation_router.py#L237-L265)).
`LocalConversation` catches that cancellation, persists paused state, and emits an interrupt event
([interrupt path](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/conversation/impl/local_conversation.py#L2417-L2459),
[interrupt API](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/conversation/impl/local_conversation.py#L2584-L2600)).

Confirmation policy evaluates each action's declared risk before execution and moves the
conversation to waiting when any action in the batch requires approval; lone think/finish actions
are exempt
([policy gate](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/agent/agent.py#L1025-L1066)).
Canvas shows the latest awaiting action, calls out high risk, and offers accept/reject
([confirmation UI](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/components/shared/buttons/conversation-confirmation-buttons.tsx#L30-L125)).

The protocol's authority boundary is weaker than the display. The server request contains only
`accept: bool` and a rejection reason, not the action id or arguments
([request model](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/models.py#L393-L397));
acceptance resumes the conversation and rejection rejects all pending actions
([response handling](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/event_service.py#L1529-L1551)).
The UI tracks the selected event id to avoid double submission, but the server does not bind the
decision payload to that displayed action identity. The conversation socket authenticates its API
connection
([socket authentication](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/sockets.py#L130-L165)).
**Opinion.** That authenticates access to the conversation, but the inspected approval request does
not establish which human made the decision.

## 7. The abstraction bargain

**Opinion.** OpenHands makes the operational layer tangible: a conversation is not only an agent
loop but a selected backend, workspace, persistence directory, event stream, Git view, and set of
run controls. That coherence costs a larger state machine and recovery protocol. Even then,
persisting an event log cannot provide exactly-once tool effects; the restart handler is strongest
where it admits the ambiguity and records which action was in flight.

**Opinion.** “Sandbox” must name a boundary and its exceptions. Current local Canvas has no OS
boundary, its worktree is repository coordination rather than a security control, the all-in-one
Docker option exposes every mounted project to all conversations in that server, and
`DockerWorkspace` allows explicit mounts and networks. The product gives operators several useful
deployment shapes, but the word alone does not establish least privilege, rollback, or resource
limits.

**Opinion.** The product delegates repository ingress and egress back through the agent loop. This
keeps one tool surface and lets the user observe failures in chat, but clone, commit, push, and pull
request creation are model-mediated operations rather than deterministic workflow stages. A
scaffold that requires a guaranteed branch or commit still needs a mechanical gate outside the
conversation.

### What the product has that the five libraries do not

**Opinion.** Relative to the inspected boundaries in [SWE-agent](swe-agent.md),
[LangGraph](langgraph.md), [OpenAI Agents SDK](openai-agents-sdk.md),
[Pydantic AI](pydantic-ai.md), and
[Microsoft Agent Framework](microsoft-agent-framework.md), the distinctive residue is the composed
product layer, not a sixth variation of the loop:

- a backend registry and control center that starts and switches between local, remote, and cloud
  agent servers, supported by the documented multi-backend boundary above;
- durable conversation storage joined to a reconnectable history-plus-live event protocol, rather
  than only an application-facing state/session abstraction;
- repository selection, per-conversation worktree creation, and a rendered Git changes/commit
  surface around the agent's terminal operations;
- a user-owned run-control surface for stop, resume, steering, risk confirmation, terminal output,
  browser state, and usage while the run is live; and
- distributable packaging that joins frontend, ingress, Agent Server, automation, credentials, and
  persistence volumes in one self-hostable image
  ([image composition](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/docker/Dockerfile#L1-L18),
  [persisted credentials and state](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/docker/entrypoint.sh#L55-L113)).

## 8. What rungs takes

These verdicts are inputs to WI-017; they do not change the catalogue here.

| Pattern id | Verdict | Pinned evidence | Reason |
| --- | --- | --- | --- |
| `worktree-lifecycle` | take-as-warning | [default Canvas worktree](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/api/conversation-service/agent-server-conversation-service.api.ts#L454-L477), [server worktree](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/conversation_service.py#L191-L274) | **Opinion.** A shipped product independently selects worktrees for concurrent repository sessions, but the pattern must never imply process, filesystem, credential, or network isolation. |
| `candidate: isolation-boundary-declaration` | take | [unsandboxed warning](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/README.md#L63-L67), [Docker mounts](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/README.md#L82-L104), [`DockerWorkspace`](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-workspace/openhands/workspace/docker/workspace.py#L171-L282) | **Opinion.** Any agent execution option should state the unit isolated, the host paths/environment/network that cross it, and the controls it does not supply. “Sandboxed” is not a sufficient contract. |
| `candidate: event-log-plus-live-tail` | take | [REST preload](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/contexts/conversation-websocket-context.tsx#L253-L375), [socket replay](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/sockets.py#L226-L383) | **Opinion.** Long-running work needs a durable history query joined to an id-deduplicated live tail; a terminal alone and an un-replayable socket each leave a different recovery gap. |
| `candidate: run-control-surface` | take | [Canvas events](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/contexts/conversation-websocket-context.tsx#L511-L640), [stop/resume](https://github.com/OpenHands/OpenHands/blob/dc99e98615de4ace821692773b00a7f50d476e50/src/hooks/mutation/conversation-mutation-utils.ts#L41-L123) | **Opinion.** A long-running agent product needs observable state plus steering, interrupt, resume, pending-decision, and artifact views; those controls are product work that loop libraries correctly leave to their hosts. |
| `candidate: approval-bound-to-request` | take-as-warning | [boolean response](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/models.py#L393-L397), [reject-all behavior](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/event_service.py#L1529-L1551) | **Opinion.** The counter-example strengthens the candidate: a decision should bind server-side to the exact pending action and arguments, not rely on the UI's selected id while sending only a boolean. |
| `candidate: event-stream-not-audit-log` | take-as-warning | [persisted state/events](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-sdk/openhands/sdk/conversation/state.py#L421-L576), [confirmation request](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-agent-server/openhands/agent_server/models.py#L393-L397) | **Opinion.** A rich durable event history still needs actor identity, authorization, retention, and bound decision data before it is an accountability record. |
| `candidate: shared-workspace-subagents` | leave | [shared workspace construction](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-tools/openhands/tools/delegate/impl.py#L167-L247), [parallel threads](https://github.com/OpenHands/software-agent-sdk/blob/46ad3d43dc385b2e7975c0935f157153930ebb16/openhands-tools/openhands/tools/delegate/impl.py#L309-L363) | **Opinion.** Parallel children sharing one writable checkout can be a useful deliberate optimization, but it is not a general scaffold default; ownership or serialization must be explicit first. |

The strongest counter-evidence is the name “Docker Sandbox” beside a documented host-project mount,
and “worktree” beside tools that still have host-level absolute-path access. Both mechanisms are
valuable; neither name substitutes for a declaration of the actual trust and recovery boundary.
