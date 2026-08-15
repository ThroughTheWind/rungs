# Pydantic AI

## 1. Snapshot

| Field | Value |
| --- | --- |
| Repository | [`pydantic/pydantic-ai`](https://github.com/pydantic/pydantic-ai) |
| Pinned commit | [`9a602b3216b2cde46bfe29c1d32927eb36c501d6`](https://github.com/pydantic/pydantic-ai/tree/9a602b3216b2cde46bfe29c1d32927eb36c501d6) |
| Date read | 2026-08-15 |
| Licence | MIT — [`LICENSE`](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/LICENSE) |
| Language | Python |
| Measured scale | 2,508 tracked files; 683 tracked `.py` files; 283 Python files in `pydantic_ai_slim/pydantic_ai`; 271 Python files in `tests` |

**Measured 2026-08-15 at the pinned commit, in PowerShell:**

```powershell
(git ls-files | Measure-Object -Line).Lines
(git ls-files -- '*.py' | Measure-Object -Line).Lines
(git ls-files -- 'pydantic_ai_slim/pydantic_ai/*.py' 'pydantic_ai_slim/pydantic_ai/**/*.py' |
  Sort-Object -Unique | Measure-Object -Line).Lines
(git ls-files -- 'tests/*.py' 'tests/**/*.py' |
  Sort-Object -Unique | Measure-Object -Line).Lines
```

The commands produced 2,508, 683, 283, and 271. They count tracked paths, not logical lines of
code or test cases.

**Read boundary.** I entered through `tests/test_deps.py` and the structured-output, retry, and
approval cases in `tests/test_agent.py`; then traced those tests through `Agent`, `_agent_graph`,
output processing, tool management, model and profile abstractions, capabilities, deferred results,
and the first-party `durable_exec` integrations. Provider transports, UI/event protocols, evals,
realtime, and Pydantic's own implementation are outside the boundary.

The repository's test policy makes recorded real-provider responses through the public `Agent`
API the default. It reserves unit tests for behavior that a real response cannot reliably trigger
or that cassette matching would fail to protect, including request-body shape
([test policy](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/AGENTS.md#L3-L11)).

## 2. The core loop

`Agent.iter` prepares an output schema, dependencies, model, toolsets, capabilities, message
history, usage, retry counters, and run identifiers, then builds an internal graph
([run preparation](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/agent/__init__.py#L1438-L1481)).
The default path has three principal node types: `UserPromptNode` constructs the initial request,
`ModelRequestNode` sends the latest history to the model, and `CallToolsNode` processes the
response
([prompt node](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_agent_graph.py#L501-L555),
[model node](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_agent_graph.py#L1106-L1138),
[tool/output node](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_agent_graph.py#L1816-L1851)).

Response processing executes ordinary tool calls, validates an output call or text output, and
either returns a final result or appends tool results/retry prompts and creates another model
request. A response with no usable action also becomes a retry, bounded by the output retry limit
([response processing](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_agent_graph.py#L1891-L2051),
[next request or result](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_agent_graph.py#L2065-L2172)).
The default usage limits provide a separate request bound; callers can replace them per run
([run limit setup](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/agent/__init__.py#L1505-L1513)).

### What an agent test looks like

The test suite exposes two deterministic model seams. `TestModel` generates a generic sequence:
call available tools, then return a final response. Configuration can select tool calls, custom
output, or a seed
([`TestModel`](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/models/test.py#L63-L98)).
`FunctionModel` instead gives a local function the full messages and `AgentInfo`, allowing a test
to emit an exact `ModelResponse`
([`FunctionModel`](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/models/function.py#L53-L175)).
The global request guard rejects real model calls when requests are disabled, while these two test
models remain usable
([request guard](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/models/__init__.py#L1390-L1434)).

Named test file `tests/test_deps.py` builds `Agent(TestModel(), deps_type=MyDeps)`, injects a value,
has a tool read `ctx.deps`, and asserts both the typed dependency's rendered value and the complete
tool-call/message history. Its nested override test also proves override precedence and restoration
([setup and trace assertion](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_deps.py#L20-L79),
[override assertion](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_deps.py#L82-L95)).

**Opinion.** That test can prove the framework passes a dependency through the loop, exposes it to
the tool, and records the expected messages. It cannot prove that a provider obeys a prompt or
schema, that provider serialization is correct, or that the dependency's external service works.
A `FunctionModel` test can additionally prove response-specific retry and validation branches, but
still not real-provider behavior. Recorded public-API tests cover a provider response as recorded;
the repository's own policy warns that an insensitive cassette matcher can miss an outgoing
request-body regression.

## 3. State and persistence

The in-memory graph state carries message history, usage, retry counts, run step, run id, and
conversation id. `Agent.iter` seeds that state from caller-provided `message_history` and fresh or
resolved identifiers
([graph state](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_agent_graph.py#L298-L349),
[initialisation](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/agent/__init__.py#L1473-L1481)).
Conversation continuation is therefore explicit input: the caller keeps messages and passes them
into a later run. The inspected core does not expose this graph state as an application checkpoint
record.

**Bounded absence check, 2026-08-15.**
`rg -n 'Checkpointer|checkpoint|save_state|load_state' pydantic_ai_slim/pydantic_ai/agent
pydantic_ai_slim/pydantic_ai/_agent_graph.py pydantic_ai_slim/pydantic_ai/_run_context.py` returned
no core checkpoint-store interface. This establishes only the inspected boundary; it does not say
that applications cannot persist messages or use the durable integrations.

The first-party `durable_exec` package composes with external execution engines. Its base
capability declares shared behavior for Temporal, DBOS, and Prefect; model instances cannot cross
the serialization boundary and must be reconstructed from stable ids, runtime toolsets are
validated, and same-process cancellation tokens are rejected inside a durable container
([base durable boundary](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/durable_exec/_base.py#L40-L100),
[runtime restrictions](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/durable_exec/_base.py#L124-L175)).

Temporal makes the partition concrete. It serializes messages, model settings, request
parameters, run context, model id, and dependencies into activity calls; model and tool I/O are
routed through activities only when inside a workflow
([serializable request](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/durable_exec/temporal/_durability.py#L63-L80),
[capability contract](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/durable_exec/temporal/_durability.py#L131-L180),
[model request wrapper](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/durable_exec/temporal/_durability.py#L496-L574)).
Temporal owns persistence and replay. Pydantic AI owns the adapter that moves nondeterministic I/O
across the engine boundary; it does not introduce its own checkpoint store in that path.

The boundary has visible costs: all activity values must serialize through a `TypeAdapter`, model
instances and runtime capabilities require prior registration, and image output is rejected because
it would cross the activity payload limit
([serialization and payload failures](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/durable_exec/temporal/_durability.py#L107-L126),
[registration rule](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/durable_exec/temporal/_durability.py#L479-L494)).

## 4. Tools and the outside world

A function tool starts as a Python callable. `Tool` derives a function schema unless one is
provided, retains a Pydantic argument validator and optional custom validator, and records approval
and retry configuration
([`Tool` construction](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/tools.py#L292-L426)).
The tool manager first validates model arguments through that schema and custom validator, then
executes through capability hooks; validation or execution failures can become model-visible retry
results
([argument validation](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/tool_manager.py#L315-L401),
[execution path](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/tool_manager.py#L447-L485)).

Dependencies are the application boundary carried into tools. `RunContext[DepsT]` includes the
dependency value alongside model, usage, messages, retry data, and approval metadata
([`RunContext`](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_run_context.py#L60-L135)).
`deps_type` supports static typing and schema/reflection needs, while `_get_deps` deliberately does
not type-check a supplied runtime value
([dependency resolution](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/agent/__init__.py#L2843-L2853)).

The base tool callback executes in the application process. No transaction, sandbox, or
idempotency guarantee is added to its outside-world effect by argument validation. A durable
capability can move supported toolset I/O into an engine activity, but then the engine's
registration, serialization, timeout, and retry rules become part of the tool contract
([durable toolset validation](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/durable_exec/_base.py#L124-L160),
[Temporal activity configuration](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/durable_exec/temporal/_durability.py#L168-L224)).

### Structured output as a gate

An output tool builds JSON Schema and a Pydantic validator from a function signature or type. A
non-model-like type is wrapped under `response`, and validation accepts either JSON or Python input
depending on the response mode
([output schema and validator](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_output.py#L850-L940)).
The output toolset exposes those processors as tool definitions with argument validators
([output toolset](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_output.py#L1490-L1524)).

`test_result_pydantic_model_retry` is executable evidence of the gate behavior. Its
`FunctionModel` first returns `{"a": "wrong"}` where `a` must be an integer; the asserted message
trace contains a validation `RetryPromptPart`; the second response uses `42` and becomes a typed
`Foo`
([test setup and result](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_agent.py#L321-L360)).
`test_output_validator` adds a semantic gate: structurally valid `41` raises `ModelRetry`, the
model-visible retry asks again, and only `42` completes
([semantic validator test](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_agent.py#L455-L528)).

**Opinion.** This is a gate one layer below artifact validation: malformed or type-invalid output
cannot silently become the typed result, and a custom validator can reject domain-invalid values.
It does not make generation deterministic or establish truth. A well-typed but wrong value passes
unless the application encodes the missing invariant.

## 5. Composition

The internal agent is a graph of prompt, model, and tool/output nodes. Application composition is
primarily additive: toolsets supply callable surfaces and capabilities contribute instructions,
model settings, tools, and hooks. Capabilities can wrap the assembled toolset and model or tool
execution with middleware ordering
([capability contract](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/capabilities/abstract.py#L162-L185),
[toolset wrapping](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/capabilities/abstract.py#L407-L430),
[model wrapper](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/capabilities/abstract.py#L709-L722)).

**Bounded absence check, 2026-08-15.**
`rg -n 'def (as_tool|to_tool|handoff)|class Handoff|AgentTool' pydantic_ai_slim/pydantic_ai`
found no first-class ownership-changing handoff or agent-as-tool constructor in the inspected
package. `AgentToolset` matches were a type alias for accepted toolset forms, not an agent
delegation primitive. An application can still call another agent inside ordinary tool code; that
crosses only the tool callback boundary and inherits no special ownership or shared-state semantics
from the framework.

## 6. The human in the loop

A tool marked `requires_approval` does not run immediately. The loop groups pending calls into a
`DeferredToolRequests` output keyed by tool-call identity. The application can build results,
approve all, deny an item, or approve with overridden arguments
([deferred request/result types](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_deferred.py#L26-L118),
[result conversion](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_deferred.py#L121-L184)).

`test_hitl_tool_approval` traces the full protocol. A deterministic model asks to create one file
and delete two; the create tool executes, the delete calls become `DeferredToolRequests`, and the
first run returns. A second `agent.run` receives the prior message history plus
`DeferredToolResults`, approves one deletion, denies the other with model-visible text, and reaches
`Done!`
([first run and pending approvals](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_agent.py#L10658-L10748),
[resume, approve, and deny](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_agent.py#L10750-L10832)).

The framework supplies call identity, validated pending arguments, decision/result types, and the
message-history resume contract. The application supplies the approver, authentication, UI,
storage, and decision policy. Resume reconstructs a new run from messages and deferred results; it
does not preserve a live Python stack across the wait.

## 7. The abstraction bargain

**Opinion.** The testing bargain is unusually explicit. `TestModel` cheaply proves generic loop,
tool, dependency, and message contracts; `FunctionModel` pins difficult response branches; recorded
public-API tests exercise actual provider responses. The cost is maintaining three evidence kinds
and remembering that none substitutes for the other. A deterministic fake can make a broken prompt
look perfectly tested, while a frozen cassette can miss a changed request payload when its matcher
does not examine that field.

**Opinion.** Typing turns both tool input and agent output into enforceable runtime boundaries, not
only editor assistance. The cost is schema plumbing, retries, and an abstraction that must tolerate
provider non-compliance: the output implementation accepts a JSON string alternative explicitly
because some models do not follow the declared schema
([lenient output validator](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_output.py#L875-L896)).
Semantic correctness remains an application validator.

**Opinion.** Typed dependency injection identifies the run-varying environment cleanly and makes
tools easy to substitute in tests. Its cost is a type promise the framework does not enforce at
ordinary runtime; a wrong dependency value can fail later inside user code. Under durable
execution, that same value must also meet the engine's serialization boundary, so the useful
injection seam becomes part of the recovery protocol.

**Opinion.** The common `Model` interface makes the loop provider-independent, but does not erase
provider differences. The abstract surface requires `request`, while token counting, compaction,
and streaming can be unsupported
([model interface](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/models/__init__.py#L366-L417),
[optional operations](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/models/__init__.py#L505-L555)).
Profiles carry capability flags, and genuinely non-portable response data falls into
`provider_details`
([model profile](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/profiles/__init__.py#L47-L76),
[provider details](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/messages.py#L2319-L2322)).
Portability therefore relocates provider-specific behavior into profiles, settings, adapters, and
an untyped escape hatch; it does not remove it.

## 8. What rungs takes

These verdicts are inputs to WI-017; they do not change the catalogue here.

| Pattern id | Verdict | Pinned evidence | Reason |
| --- | --- | --- | --- |
| `contract-test-base` | take-as-warning | [`TestModel`](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/models/test.py#L63-L98), [test policy](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/AGENTS.md#L3-L11) | **Opinion.** A fake is useful only when its claim boundary is named and provider-facing behavior has separate evidence. Testing the fake-driven loop alone is not an implementation contract. |
| `structural-gates` | take-as-analogy | [schema retry test](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_agent.py#L321-L360), [semantic validator test](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_agent.py#L455-L528) | **Opinion.** Validate the cheapest machine-settled structure first, then attach explicit semantic checks; neither green result proves the content is true. |
| `session-handoff` | take-as-warning | [graph state](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_agent_graph.py#L298-L349), [deferred resume test](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_agent.py#L10750-L10832) | **Opinion.** Message history can resume machine interaction, but it does not carry documentary intent, evidence boundaries, or settled project decisions. |
| `candidate: deterministic-model-substitution` | take | [`FunctionModel`](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/models/function.py#L53-L175), [dependency test](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_deps.py#L20-L79) | **Opinion.** Inject a deterministic decision source to make loop and branch contracts exact, and pair it with a separately named real-boundary test. |
| `candidate: typed-output-gate` | take | [output validation](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_output.py#L850-L940), [retry test](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_agent.py#L321-L360) | **Opinion.** Turn probabilistic prose into a typed boundary where structural failure becomes an explicit retry or terminal error; keep semantic truth outside the claim. |
| `candidate: resumable-approval-state` | take | [pending decision types](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/pydantic_ai_slim/pydantic_ai/_deferred.py#L26-L118), [approval resume](https://github.com/pydantic/pydantic-ai/blob/9a602b3216b2cde46bfe29c1d32927eb36c501d6/tests/test_agent.py#L10750-L10832) | **Opinion.** A human boundary needs stable action identity, validated arguments, explicit approve/deny data, and enough state to reconstruct continuation; authority and UI remain application-owned. |

The strongest counter-evidence is the provider abstraction itself: a typed common loop still needs
capability profiles, optional operations, leniency for schema non-compliance, and an untyped field
for behavior that genuinely does not port.
