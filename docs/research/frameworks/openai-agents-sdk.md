# OpenAI Agents SDK

## 1. Snapshot

This extraction reads the Python and TypeScript implementations against each other at two fixed
commits.

| Field | Python | TypeScript |
| --- | --- | --- |
| Repository | [`openai/openai-agents-python`](https://github.com/openai/openai-agents-python) | [`openai/openai-agents-js`](https://github.com/openai/openai-agents-js) |
| Pinned commit | [`1a0c08868aec2a18eba964e5a07da4270a490c25`](https://github.com/openai/openai-agents-python/tree/1a0c08868aec2a18eba964e5a07da4270a490c25) | [`d85dd2c144cd99bfdfa0111975cc759c00d56a77`](https://github.com/openai/openai-agents-js/tree/d85dd2c144cd99bfdfa0111975cc759c00d56a77) |
| Date read | 2026-08-15 | 2026-08-15 |
| Licence | MIT — [`LICENSE`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/LICENSE) | MIT — [`LICENSE`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/LICENSE) |
| Measured scale | 1,522 tracked files; 898 tracked `.py` files; 305 Python files in `src/agents` | 1,469 tracked files; 934 tracked `.ts`/`.tsx` files; 210 TypeScript files in `packages/agents-core/src` |

**Measured 2026-08-15 at the pinned commits, in PowerShell:**

```powershell
(git ls-files | Measure-Object -Line).Lines
(git ls-files -- '*.py' | Measure-Object -Line).Lines
(git ls-files -- 'src/agents/*.py' 'src/agents/**/*.py' |
  Sort-Object -Unique | Measure-Object -Line).Lines

(git ls-files | Measure-Object -Line).Lines
(git ls-files -- '*.ts' '*.tsx' | Sort-Object -Unique | Measure-Object -Line).Lines
(git ls-files -- 'packages/agents-core/src/*.ts' 'packages/agents-core/src/**/*.ts' |
  Sort-Object -Unique | Measure-Object -Line).Lines
```

The first three commands, run in the Python checkout, produced 1,522, 898, and 305. The second
three, run in the TypeScript checkout, produced 1,469, 934, and 210. These are tracked-path counts,
not logical lines of code.

**Read boundary.** I read the Python `src/agents` and TypeScript `packages/agents-core/src` agent,
runner, handoff, tool, guardrail, session, run-state, model, and tracing boundaries, plus the public
agent-variant declarations and the pinned root READMEs. I traced the non-streaming runner paths in
both languages. The deeper sandbox, realtime, voice, hosted-tool, and provider implementations are
outside the boundary; their public types establish that a variant exists, not how its transport or
provider works.

The two READMEs publish nearly the same concept inventory: agents and sandbox/realtime variants,
agents-as-tools and handoffs, tools, guardrails, human intervention, sessions, and tracing. Python
also lists a separate voice-pipeline concept
([Python inventory](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/README.md#L10-L21),
[TypeScript inventory](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/README.md#L9-L19)).

## 2. The core loop

Both implementations run the same bounded agent loop. Invoke the current agent; return a final
output; switch the current agent after a handoff; otherwise execute tool calls and invoke the model
again. A turn is one model invocation, and a configurable maximum bounds the loop
([Python `Runner.run`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/run.py#L234-L278),
[TypeScript `Runner.run`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/run.ts#L634-L653)).
The TypeScript implementation makes the state transition explicit: a final-output step returns,
a handoff installs `newAgent` and loops, an interruption returns the current state, and a run-again
step loops without changing ownership
([TypeScript loop](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/run.ts#L1403-L1421),
[step switch](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/run.ts#L1812-L1848)).

For this extraction, a *primitive family* is either a concept named in the two pinned README
inventories or the runner/state pair that executes those concepts. Under that boundary, the list
is complete:

| Primitive family | What it carries | Escape hatch |
| --- | --- | --- |
| Agent, including sandbox/realtime and Python voice variants | Instructions, model, tools, handoffs, guardrails, output type, and hooks. `SandboxAgent` and `RealtimeAgent` specialise that configuration; Python also exposes `VoicePipeline` ([Python `Agent`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/agent.py#L296-L355), [TypeScript `Agent`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/agent.ts#L501-L550)). | Instructions may be callbacks, and `model` accepts an implementation rather than only a name. The ultimate model escape is the `Model`/`ModelProvider` protocol ([Python](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/models/interface.py#L37-L145), [TypeScript](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/model.ts#L680-L713)). |
| Runner and `RunState` | Loop control, model calls, tool execution, agent switching, interruptions, session persistence, and resumable execution ([Python loop contract](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/run.py#L234-L280), [TypeScript runner configuration](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/run.ts#L567-L612)). | Per-run configuration replaces model providers, guardrails, tracing, session-input handling, and tool-error behaviour; serializable `RunState` lets an application store and later resume an interruption ([Python state](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/run_state.py#L744-L792), [TypeScript state](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/runState.ts#L1849-L1902)). |
| Tools | Model-visible action name, description, JSON schema, invocation, enablement, approval, timeout, guardrails, and error/output handling ([Python `FunctionTool`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/tool.py#L441-L522), [TypeScript `FunctionTool`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/tool.ts#L426-L524)). | Construct the low-level tool object, supply the invocation and schema directly, or dynamically hide a tool. Python explicitly calls raw output JSON Schema an escape hatch ([Python decorator](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/tool.py#L2532-L2584)); TypeScript accepts schema-plus-executor options ([TypeScript factory](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/tool.ts#L2250-L2321)). |
| Delegation: handoff or agent-as-tool | Both expose another agent through a function-tool-shaped model surface. A handoff transfers conversation ownership; agent-as-tool runs a nested agent and returns its result to the caller ([Python distinction](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/agent.py#L576-L627), [TypeScript distinction](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/agent.ts#L703-L715)). | A handoff can replace its schema, invocation callback, target, input filter, and dynamic enablement ([Python](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/handoffs/__init__.py#L126-L192), [TypeScript](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/handoff.ts#L107-L188)). Choosing agent-as-tool is the control-retaining alternative. |
| Guardrails | Input checks, final-output checks, and tool input/output checks can trip the run before or after work ([Python input/output](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/guardrail.py#L72-L166), [TypeScript input/output](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/guardrail.ts#L63-L120)). | The checks are application callbacks and can be attached globally, per agent, or per tool; Python input checks may be parallel or blocking, and the same choice appears as `runInParallel` in TypeScript. |
| Human approval | A tool may request approval always or through a per-call callback. The runner returns an interruption; the application approves or rejects the item and reruns the same state ([Python tool approval](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/tool.py#L486-L493), [TypeScript tool approval](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/tool.ts#L486-L490)). | `needs_approval`/`needsApproval` may be dynamic; the application supplies the approver, policy, storage, and UI, and it can approve, reject, or provide rejection text through `RunState` ([Python](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/run_state.py#L1250-L1293), [TypeScript](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/runState.ts#L2567-L2614)). |
| Sessions | Conversation-history storage across runs: read, append, pop, and clear ([Python protocol](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/memory/session.py#L15-L66), [TypeScript interface](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/memory/session.ts#L25-L95)). | Implement the session protocol against any store, or omit it and manage input history directly. TypeScript has optional capabilities for normalization, compaction, and atomic idempotent history transactions. |
| Tracing | Receives trace/span lifecycle events around runs, model calls, tools, handoffs, and guardrails. | Replace or add a `TracingProcessor`, add custom spans, or disable tracing globally ([Python processor registration](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/tracing/__init__.py#L94-L112), [TypeScript processor registration](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/tracing/index.ts#L60-L85)). |

The small surface is therefore not a claim that the SDK owns every policy. It concentrates policy
in supplied functions and protocols: model, tool invocation, guardrail, handoff filter, session,
and trace processor. The escape hatch usually stays inside the runner contract rather than
requiring a fork.

## 3. State and persistence

The SDK separates two persistence questions. A `Session` stores conversation items across runs;
its minimal protocol reads, appends, pops, and clears history. `RunState` stores an in-progress
execution: current agent and turn, original input, model responses, generated/session items,
approval context, and other resume metadata
([Python `Session`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/memory/session.py#L15-L56),
[Python `RunState`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/run_state.py#L744-L792),
[TypeScript `Session`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/memory/session.ts#L25-L95),
[TypeScript `RunState`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/runState.ts#L1849-L1902)).

Both state types serialize for later resume. Python `to_json` includes approval and invocation
records, model responses, original input, usage, and context payload; custom contexts may need an
application serializer. TypeScript `toJSON`/`toString` and `fromString` provide the corresponding
boundary and omit tracing credentials by default
([Python serialization](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/run_state.py#L1699-L1744),
[TypeScript serialization](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/runState.ts#L2616-L2637),
[TypeScript restore](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/runState.ts#L2883-L2917)).
Serialization is a recovery format, not storage: the application still chooses where and when to
persist the state.

TypeScript adds an optional session transaction protocol. Its stable `operationId` must be stored
atomically with an append or suffix replacement; replaying the same operation must not apply it
again, while a changed transaction or mismatched suffix must fail without changing history
([`SessionHistoryTransactionAwareSession`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/memory/session.ts#L133-L170)).

**Bounded absence check, 2026-08-15.**
`rg -n 'SessionHistoryTransaction|operation_id|operationId' src/agents/memory src/agents/run.py
src/agents/run_state.py` returned no match in the pinned Python checkout. This establishes a parity
gap within the inspected Python session/runner boundary, not why the gap exists.

### Execution state versus documentary handoff

**Opinion.** A serialized `RunState` can answer which agent owns the live conversation, which tool
calls await approval, and which model responses already exist. A rungs `session-handoff` answers a
different set: why the work exists, which constraints are settled, what evidence was inspected,
and what should happen next. The execution snapshot can reduce narration of machine-recoverable
state, but it cannot replace documentary intent. The document cannot safely resume a tool call.

## 4. Tools and the outside world

A function tool is an in-process callback behind a model-visible name, description, and JSON
schema. The runner parses and validates the model arguments, invokes application code, and turns
the result or configured error into model input
([Python `FunctionTool`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/tool.py#L441-L493),
[TypeScript `FunctionTool`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/tool.ts#L426-L524)).
The tool abstraction does not make an external side effect transactional. Timeout policy,
model-visible failure, approval, and guardrails are explicit hooks, but effect idempotency and
compensation remain inside the application callback.

Python's high-level decorator derives the parameter schema from a function signature and its
descriptions from the docstring. TypeScript's factory accepts an options object and converts an
explicit Zod or Standard Schema input into a parser and JSON Schema
([Python `function_tool`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/tool.py#L2532-L2550),
[TypeScript `tool`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/tool.ts#L2250-L2321)).
Both converge on the same runtime contract even though their ergonomic path differs.

### Is a handoff only a renamed tool call?

At the model boundary, yes: Python `Handoff` literally has a tool name, description, input JSON
schema, and invocation callback, and TypeScript gives the class the same shape
([Python `Handoff`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/handoffs/__init__.py#L126-L192),
[TypeScript `Handoff`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/handoff.ts#L160-L188)).
The default name is even `transfer_to_<agent>`
([Python naming](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/handoffs/__init__.py#L203-L218),
[TypeScript naming](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/handoff.ts#L58-L82)).

At the runner boundary, no. TypeScript invokes the handoff callback, optionally filters the full
conversation history, and produces `next_step_handoff`; the runner then replaces the current agent
and re-enters the loop
([handoff execution](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/runner/toolExecution.ts#L2590-L2653),
[ownership transition](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/run.ts#L1829-L1841)).
By contrast, `Agent.as_tool` creates an ordinary function tool whose executor creates a nested
runner; its generated input goes to the nested agent and its output returns to the original agent
([Python contract and nested run](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/agent.py#L599-L627),
[TypeScript tool construction](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/agent.ts#L786-L851)).

**Opinion.** The useful distinction is therefore not wire shape but control ownership. A handoff is
a tool-shaped routing decision with continuation semantics; agent-as-tool is a nested call with
return semantics. Naming both merely “tool calls” would erase the property a workflow author must
decide.

## 5. Composition

The framework has two deliberate composition shapes. A handoff forms a chain: the target receives
the conversation history and becomes the current agent. An agent-as-tool forms a call tree: the
callee receives generated input, runs within a nested `Runner`, returns a value, and the caller
continues
([Python `as_tool`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/agent.py#L599-L627),
[TypeScript `asTool`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/agent.ts#L703-L715)).
Both shapes share the parent run context and tracing machinery, while the nested runner preserves
its own approval/resume boundary through agent-tool state
([Python nested context](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/agent.py#L672-L715),
[TypeScript nested runner](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/agent.ts#L837-L860)).

Neither form is peer negotiation. The current model selects among exposed tool-shaped choices, and
the runner deterministically applies either “replace current agent” or “run nested and return.” The
handoff input filter and agent-as-tool input builder are the adapters at those boundaries.

## 6. The human in the loop

Human intervention is attached to a concrete tool invocation. `needs_approval`/`needsApproval` may
be a constant or a callback over the call and context; when true, the runner returns a result whose
interruptions identify the pending tool approval instead of executing it
([Python approval field](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/tool.py#L486-L493),
[Python result](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/result.py#L510-L562),
[TypeScript approval field](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/tool.ts#L486-L490),
[TypeScript interruption return](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/run.ts#L1842-L1844)).

The application obtains the state, calls `approve` or `reject`, and runs again with that state.
Approval can apply once or for future calls in the run; rejection may carry exact model-visible
text. Both languages route nested agent-tool approvals to the nested run state
([Python `RunState`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/run_state.py#L1250-L1293),
[TypeScript `RunState`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/runState.ts#L2567-L2614)).
Because the state is serializable, the wait may cross a process boundary if the application stores
and restores it. The SDK supplies invocation identity and pause/resume mechanics; it does not select
the human, authenticate the decision, or provide the approval UI within the inspected runner
boundary.

Guardrails are a separate automated control. Input guardrails can run before or alongside the first
agent; output guardrails inspect the final output; tool guardrails surround a tool invocation. A
tripwire stops the run rather than opening an approval request
([Python guardrails](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/guardrail.py#L72-L166),
[TypeScript runner contract](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/run.ts#L634-L647)).

## 7. The abstraction bargain

### Python/TypeScript divergences

| Difference at the pins | Classification | Reasoning |
| --- | --- | --- |
| Python exposes class methods `Runner.run`, `run_sync`, and `run_streamed`; TypeScript exposes a top-level `run` backed by a default runner plus a configurable `Runner` ([Python](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/run.py#L234-L250), [TypeScript](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/run.ts#L535-L571)). | Language idiom | The loop and state transitions are the same; the difference is how each language presents sync/async and convenience entry points. |
| Python derives a function-tool schema and descriptions from signatures and docstrings; TypeScript takes explicit schema-bearing options and parses Zod/Standard Schema values ([Python](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/tool.py#L2532-L2550), [TypeScript](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/tool.ts#L2250-L2321)). | Language idiom | Python runtime introspection and JavaScript's schema-library ecosystem reach the same JSON-schema-plus-invoker contract. |
| TypeScript defines optional atomic, idempotent session-history transactions with a stable operation id; the bounded Python session/runner search found no analogue ([TypeScript](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/memory/session.ts#L133-L170)). | Design surface / parity gap | The capability changes recovery guarantees rather than syntax. The pins do not establish whether this is deliberate design or release timing, so no intent is inferred. |
| Python lists and implements a separate speech-to-text → agent workflow → text-to-speech `VoicePipeline`; TypeScript lists realtime voice agents but no separate pipeline ([Python README](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/README.md#L128-L146), [Python class](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/voice/pipeline.py#L21-L61), [TypeScript inventory](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/README.md#L9-L19)). | Design surface / parity gap | This is an additional composition pipeline, not a TypeScript spelling difference. The pins do not reveal intent or future parity. |

**Bounded absence check, 2026-08-15.** `rg -n 'VoicePipeline|VoiceWorkflow' packages` returned no
match in the pinned TypeScript checkout. It does not say the realtime package lacks voice support;
the README explicitly says it has spoken-interaction agents.

**Opinion.** The bargain is strong because the core nouns stay few while the extension points stay
typed. The application can replace a model, tool callback, handoff adapter, session store,
guardrail, and tracing processor without changing the loop. The cost is that “small” describes the
vocabulary, not the operational burden: durable storage, replay-safe effects, approval authority,
credentials, and external isolation still belong to the adopter.

**Opinion.** The session transaction divergence is the sharpest warning. Once the runner owns
history mutation around retries and resume, a four-method conversation store is not always enough;
an optional atomic/idempotent capability appears. Minimal protocols remain honest only when their
failure boundary and upgrade path are visible.

## 8. What rungs takes

These verdicts are inputs to WI-017; they do not change the catalogue here.

| Pattern id | Verdict | Pinned evidence | Reason |
| --- | --- | --- | --- |
| `skill-neighbours` | take-as-analogy | [`Handoff`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/handoffs/__init__.py#L126-L192), [`Agent.as_tool`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/agent.py#L599-L627) | **Opinion.** A routing surface should state whether the neighbour takes ownership or returns a result. Similar invocation syntax is not enough to define continuation semantics. |
| `session-handoff` | take-as-warning | [`Session`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/memory/session.py#L15-L56), [`RunState`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/run_state.py#L744-L792) | **Opinion.** Conversation memory, resumable execution, and documentary intent are three different continuity layers. Calling all three “session state” hides what cannot be reconstructed. |
| `candidate: ownership-changing-handoff` | take | [`next_step_handoff`](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/runner/toolExecution.ts#L2590-L2653), [runner transition](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/run.ts#L1829-L1841) | **Opinion.** Define handoff by who owns the continuation, not by whether the model emitted a tool-shaped call. |
| `candidate: protocol-with-escape-hatch` | take | [`ModelProvider`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/models/interface.py#L138-L160), [`Session`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/memory/session.py#L15-L66), [`TracingProcessor`](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/tracing/processor_interface.py#L9-L45) | **Opinion.** A small primitive should name the protocol or callback that absorbs cases it refuses to own; otherwise minimalism becomes a closed assumption. |
| `candidate: resumable-approval-state` | take | [Python serialization](https://github.com/openai/openai-agents-python/blob/1a0c08868aec2a18eba964e5a07da4270a490c25/src/agents/run_state.py#L1699-L1744), [TypeScript approve/reject](https://github.com/openai/openai-agents-js/blob/d85dd2c144cd99bfdfa0111975cc759c00d56a77/packages/agents-core/src/runState.ts#L2567-L2632) | **Opinion.** An approval boundary should identify the pending action and serialize the state needed to continue; approval UI and authority can remain application-owned. |

The strongest counter-evidence is history mutation: the TypeScript transaction extension shows how
a minimal store protocol can acquire a second capability once retry-safe persistence matters.
