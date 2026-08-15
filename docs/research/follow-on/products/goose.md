# goose — local state machine, MCP extensions, ACP providers, and session isolation

This extraction answers WI-023's bounded product question: how Goose keeps a local agent loop
re-entrant while its provider, extensions, MCP calls, ACP-backed agents, recipes, and sessions may
be owned by different processes. It follows the [shared spine](../SHARED-SPINE.md) and the
[product track template](../PRODUCT-TEMPLATE.md). It is an implementation extraction, not a
security certification, provider comparison, or claim about hosted/current Goose behaviour.

## Snapshot and read boundary

**Measured** — The source is the public [aaif-goose/goose repository](https://github.com/aaif-goose/goose/tree/3810898a7447ec3299be72e223d3570a7aabf0ab)
at commit `3810898a7447ec3299be72e223d3570a7aabf0ab`, read 2026-08-15. `git describe` reports
`v2.0-rc-04-27-0-1051-g3810898a7`; this is a pinned source snapshot, not a current-release claim.
The repository's [LICENSE](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/LICENSE)
is Apache-2.0.

**Measured** — The bounded checkout measurement was:

```text
git -C C:\Temp\rungs-follow-on-20260815\goose ls-files
  2,368 tracked files
    514 Rust files
    104 test-named/test-directory files
    332 Markdown files
```

The counts describe tracked paths at this commit. They do not measure compiled dependencies,
desktop bundle size, network services, provider quality, or the permissions of an installed MCP
server.

**Documented** — The read set is the `goose-agent` state machine; Goose's agent, extension,
MCP-client, tool approval/execution, configuration, ACP provider, session manager, recipe, and
targeted state-machine tests. The selected executable evidence is the calculator MCP test double
and the `tool_lifecycle`, `reconstruction_isolation_lifecycle`, `recipe_scheduling_lifecycle`,
and `provider_lifecycle` test modules. The checkout was inspected at the pinned commit; no Goose
binary, provider, MCP server, or ACP child process was run locally.

## One local request through an MCP result

**Implemented** — `goose_agent::machine::StateMachine::run` loads a `session_id`, calls
`StateMachine::step`, applies returned effects through `EffectHandler`, and reloads the session
for the next step. It stops when no operation applies or when an operation yields to the client.
Goose's concrete `state_machine::run` adds usage accounting and emits the final assistant text.
The persisted session, rather than an in-memory pipeline object, is the input to every iteration
([machine.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose-agent/src/machine.rs),
[state-machine/session.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/session.rs)).

**Implemented** — `InferenceRunner` supplies provider-facing messages, extension prompt parts,
MCP tools, and model configuration. It calls the selected `Provider`; a direct provider returns a
stream of assistant text/tool requests, which become conversation effects. Provider errors become
an explicit error message effect, while cancellation adds error responses for unanswered tool
requests ([ops_llm.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/ops_llm.rs)).

**Implemented** — `ToolExecutionOperation::inference_tools` calls
`ExtensionManager::get_prefixed_tools_excluding(&session.id, ...)`. A model tool request is
classified as executable, declined, or a parse error by `pending_tool_requests`; only known tools
are dispatched. `ExtensionManager::dispatch_tool_call` resolves the prefixed tool to one
extension, checks its configured availability, subscribes to notifications/action-required
messages, and creates a `ToolCallContext` carrying `session_id`, `working_dir`, and the optional
tool-call request id ([ops_toolcalling.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/ops_toolcalling.rs),
[extension_manager.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/extension_manager.rs),
[tool_execution.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/tool_execution.rs)).

**Implemented** — `McpClient::call_tool` builds an MCP `CallToolRequest` and sends it with the
session id, working-directory header, tool-call request id, and cancellation token. The result is
returned as `CallToolResult`; notification and action-required streams remain available while the
future completes ([mcp_client.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/mcp_client.rs)).

**Implemented** — The first-party calculator test extension exposes `add`, `multiply`,
`subtract`, `divide`, `add_values`, `add_with_audience`, and `request_value`. Its `call_tool`
records the `ToolCallContext`, validates JSON arguments, applies a checked arithmetic operation,
and returns a successful `CallToolResult` containing `result: <total>`. Cancellation and a
two-second barrier/timeout are explicit test paths ([calculator_extension.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/tests/calculator_extension.rs)).

**Implemented** — The result is converted into a user-role tool-response message and persisted by
`SessionManager::apply_effects`; the next state-machine iteration sends that tool result back to
the provider. The `tool_lifecycle::basic_tool_calling` test and the calculator's `result: 1`
assertions exercise this pairing. `reconstruction_isolation_lifecycle::tool_turn_reconstructs_after_every_applied_step`
rebuilds the pipeline after every applied step and asserts one tool call, one tool response, and
the final assistant message ([tool_lifecycle.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/tests/tool_lifecycle.rs),
[reconstruction_isolation_lifecycle.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/tests/reconstruction_isolation_lifecycle.rs)).

## Ownership: direct provider, ACP provider, or MCP extension

| Path | Loop owner | State carried by Goose | Failure/control boundary |
| --- | --- | --- | --- |
| Direct model provider | Goose's `StateMachine` and `InferenceRunner` | Persisted Goose conversation, tool metadata, usage, recipe, and session config | Provider stream/error is translated into conversation effects; Goose runs tool approval and MCP dispatch. |
| ACP-backed provider | The external ACP agent owns its internal prompt/tool loop; Goose's `AcpProvider` adapts it to `Provider` | One ACP session id, mode/config options, handoff marker, pending confirmations, and streamed updates | ACP child process/protocol owns agent execution; Goose maps text/tool/permission updates and can resume only when the agent advertises `session/load`. |
| MCP-backed extension | Goose owns the model loop; the MCP server owns the capability implementation | Extension client/server connection, tool list cache, `ToolCallContext`, and MCP request/response ids | MCP transport/server owns extension effects; Goose owns tool availability, confirmation, cancellation, and message persistence. |

**Implemented** — `AcpProvider::connect` starts an ACP client loop on a dedicated current-thread
Tokio runtime, initializes the protocol, and eagerly sends `session/new`. `AcpProvider` reports
`manages_own_context() == true`, routes permission through `ActionRequired`, and keeps the ACP
session id separate from the Goose session id. `resume` uses ACP `session/load` when available and
closes the replaced session; otherwise it returns an explicit unsupported error
([provider.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/acp/provider.rs)).

**Implemented** — ACP `stream` sends a prompt to the external agent, buffers text/thought/tool
updates, maps ACP tool calls into Goose tool-request messages, forwards permission requests to a
pending confirmation map, and emits provider usage on completion. Cancelled/refused prompts roll
back the one-time handoff-context marker so a retry can resend context; a completed prompt commits
it. This is an ownership boundary, not a second Goose MCP loop.

**Implemented** — An ACP child is spawned with configured command/args, piped stdin/stdout/stderr,
`kill_on_drop(true)`, configured environment additions/removals, and a PATH adjustment. The source
does not establish a sandbox, privilege drop, or network isolation for that child; those remain
external operating-system or provider policy ([provider.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/acp/provider.rs)).

**Implemented** — MCP extensions are represented by `ExtensionConfig` variants for stdio,
streamable HTTP, built-in, and platform extensions. `ExtensionManager` caches prefixed tool
schemas, invalidates the cache on `notifications/tools/list_changed`, and dispatches by the
resolved extension owner. A platform extension runs in Goose's process; stdio/HTTP extensions
cross a process/network boundary ([extension.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/extension.rs),
[extension_manager.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/extension_manager.rs)).

## Permission, secrets, filesystem, environment, and sandbox boundaries

**Implemented** — `ToolApprovalOperation` reconstructs pending requests from persisted messages,
inspects them with `ToolInspectionManager`, and marks each request with `goose.executable`. It
emits a user-only `ActionRequired` message for requests needing approval. `handle_approval_tool_requests`
waits on `ToolConfirmationRouter`; allow-once/always-allow dispatches the call, while deny paths
append an explicit `DECLINED_RESPONSE`. Always-allow/deny decisions update the per-tool
permission manager ([ops_tool_approval.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/ops_tool_approval.rs),
[tool_execution.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/tool_execution.rs)).

**Implemented** — `PermissionManager` persists user and smart-approve levels in
`permission.yaml`, with `always_allow`, `ask_before`, and `never_allow` lists. MCP tool
annotations with `read_only_hint == false` seed smart-approve `ask_before`; this is a local
policy store, not proof that a remote server is safe ([permission.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/config/permission.rs)).

**Implemented** — Config secrets use keyring storage when available and a file fallback under the
Goose config directory. `Config::get_secrets` reads environment variables for the primary key or
the configured secret storage for the group; file-based tests cover restricted permissions and
cache invalidation ([base.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/config/base.rs)). Extension configs resolve secret-backed values at client creation and keep that resolved snapshot in memory rather than serializing it.

**Implemented** — Stdio extension `Envs` rejects a denylist of path, loader, interpreter, profile,
temporary-directory, and Windows process-location variables (including `PATH`, `LD_PRELOAD`,
`PYTHONPATH`, `NODE_OPTIONS`, `TEMP`, and `USERPROFILE`) before spawning. Allowed configured
variables are passed to the child; the source does not claim a complete environment sandbox
([extension.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/extension.rs)).

**Implemented** — `ToolCallContext.working_dir` is copied into MCP request context. Goose's ACP
filesystem tools resolve relative paths against the session working directory and include the
working directory in terminal requests; ACP shell requests also include an `AGENT_SESSION_ID`
environment value ([fs.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/acp/fs.rs)).

**Strongest counter-evidence** — The inspected default path does not create a general sandbox for
MCP stdio processes or ACP children. Permission confirmation constrains when Goose dispatches a
tool, but once an allowed process runs, its filesystem, network, inherited privileges, and server
logic remain outside Goose's guarantee. The `Container` type in the selected agent path only holds
a Docker container id; it is not evidence that every tool runs inside Docker.

## Recipe and session identity

**Implemented** — `Session` persists `id`, `working_dir`, conversation, provider/model, usage,
extension data, `recipe`, user recipe values, schedule id, mode, and optional `parent_session_id`.
`SessionManager::get_session(id, true)` reloads the conversation from SQLite; `apply_effects`
writes messages, replacements, recipe, extension data, and usage back to that session id
([session_manager.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/session/session_manager.rs),
[state-machine/session.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/session.rs)).

**Implemented** — `RecipeOperation::run_command` resolves a recipe slash command, validates an
optional structured-output schema, persists it through `GooseEffect::SetRecipe`, and appends a
private agent-visible prompt. Recipe parameters/instructions/extensions are therefore part of
the session's repeatable input, while the final-output tool is generated from the persisted
response schema ([ops_recipe.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/ops_recipe.rs)).

**Implemented** — The recipe tests cover inherited parameters and instructions, extension
advertisement, child turn limits, retry checks, scheduler configuration, and structured final
output. `recipe_retry_and_final_output_run_to_completion` demonstrates a failed shell success
check producing a bounded retry error and a separate recipe using `FINAL_OUTPUT_TOOL_NAME` to
produce validated JSON ([recipe_scheduling_lifecycle.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/tests/recipe_scheduling_lifecycle.rs)).

**Implemented** — `SessionManager::copy_session` creates a fresh id, copies working directory,
recipe, user values, extension/provider/model/mode metadata, and copies the conversation. It does
not share the original session id; `parent_session_id` is available for explicit child trees.
The reconstruction/isolation test creates a second session with a different working directory,
asserts every calculator context carries that session id and directory, and shows totals do not
cross between sessions ([session_manager.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/session/session_manager.rs),
[reconstruction_isolation_lifecycle.rs](https://github.com/aaif-goose/goose/blob/3810898a7447ec3299be72e223d3570a7aabf0ab/crates/goose/src/agents/state_machine/tests/reconstruction_isolation_lifecycle.rs)).

**Strongest counter-evidence** — Session identity isolates persisted messages, recipe metadata,
working directory, and tool context; it does not automatically isolate a shared remote MCP server,
provider account, OS process, or external side effect. ACP state can only be loaded when the child
agent advertises ACP `session/load`; a Goose SQLite session may therefore outlive an unavailable
provider-side continuation.

## Continuity matrix

| Boundary | What the pinned implementation preserves | What it does not establish |
| --- | --- | --- |
| Identity | Goose session id, ACP session id, tool-call request id, message ids, extension-prefixed tool names | That a provider or MCP server uses the same identity outside the request metadata. |
| State | SQLite session row/conversation, recipe, extension data, usage, provider/model settings, tool metadata | Live child-process memory, remote server state, or an unflushed in-flight stream. |
| External effects | MCP results/notifications, ACP updates, approval actions, provider usage, recipe success checks | Reversibility, transactional rollback, network policy, or filesystem snapshots. |
| Human authority | Tool inspection, action-required messages, confirmation router, ACP permission mapping, chat-mode skip | That a user-approved tool is benign or that remote policy was reviewed. |
| Evidence | Persisted messages, tool response content, usage, structured action-required records, recipe output | A tamper-evident transcript of every process/network effect or provider token stream. |
| Recovery | State-machine reconstruction, cancellation response pairing, ACP handoff rollback, session copy/fork, bounded recipe retries | Guaranteed recovery after a process dies, a remote session cannot load, or an external side effect partially completes. |

**Opinion** — Goose's durable unit is a re-entrant session plus its persisted conversation and
recipe, while capability execution is an explicitly named MCP/ACP boundary. That makes session
identity and user-visible approval useful control points, but it is not a transaction across the
model, Goose database, child process, remote MCP server, and ACP agent.

## Candidate pattern consequences (deferred to WI-028)

| Candidate | Evidence | Provisional disposition |
| --- | --- | --- |
| `session-isolation` | **Implemented** — every state-machine step reloads by session id; tool context includes session id and working directory; reconstruction tests assert separate totals and contexts. | Candidate; reconcile with existing session wording. |
| `confirmation-gate` | **Implemented** — tool inspection, `goose.executable`, action-required messages, and allow/deny persistence gate dispatch. | Candidate; compare with structural/approval gates already in the catalogue. |
| `protocol-escape-hatch` | **Implemented** — MCP and ACP preserve a Goose loop while delegating capability or loop ownership across a protocol boundary. | Candidate; do not treat delegation as proof of protocol conformance. |
| `agent-facing-interface` | **Implemented** — provider errors, tool results, approval requests, notifications, and recipe output are represented as messages/events visible to the model or user. | Candidate; compare with existing interface findings. |
| `handoff` | **Implemented** — ACP's first-prompt context marker commits only after completion and rolls back on cancellation/refusal. | Candidate; narrow to ownership-transfer recovery. |
| `neighbour` | **Opinion** — ACP and MCP make adjacent agents/capabilities addressable without collapsing their identity into Goose's session. | Candidate only; needs WI-028 cross-subject comparison. |

No catalogue, module, or CLI file changed. WI-025 owns normative MCP semantics and WI-028 owns
cross-track reconciliation.
