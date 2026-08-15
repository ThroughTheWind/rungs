# LangGraph

## 1. Snapshot

This snapshot fixes the source boundary used by every claim and count below.

| Field | Value |
| --- | --- |
| Repository | [`langchain-ai/langgraph`](https://github.com/langchain-ai/langgraph) |
| Pinned commit | [`644815f9e5bc52ad8f7a5227a456227e9c3e639b`](https://github.com/langchain-ai/langgraph/tree/644815f9e5bc52ad8f7a5227a456227e9c3e639b) |
| Date read | 2026-08-15 |
| Licence | MIT — [`LICENSE`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/LICENSE) |
| Languages | Python implementation: 450 tracked `.py` files |
| Measured scale | 671 tracked files; 78 Python files in the bounded LangGraph runtime; 17 Python files in the bounded checkpoint package |

**Measured 2026-08-15 at the pinned commit, in PowerShell:**

```powershell
(git ls-files | Measure-Object -Line).Lines
(git ls-files -- '*.py' | Measure-Object -Line).Lines
(git ls-files -- 'libs/langgraph/langgraph/*.py' 'libs/langgraph/langgraph/**/*.py' |
  Sort-Object -Unique | Measure-Object -Line).Lines
(git ls-files -- 'libs/checkpoint/langgraph/*.py' 'libs/checkpoint/langgraph/**/*.py' |
  Sort-Object -Unique | Measure-Object -Line).Lines
```

The commands produced 671, 450, 78, and 17 respectively. They count tracked paths, not logical
lines of code.

**Read boundary.** I read the Python `StateGraph` compiler, Pregel runtime and loop, checkpoint base
and in-memory implementation, interrupt/command types, and the repository's nested-interrupt and
callback tests. The broader LangChain ecosystem, prebuilt agents, remote/server paths, and hosted
platform are outside this extraction. The traced non-trivial graph is
[`test_subgraph_checkpoint_true_interrupt`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/tests/test_pregel.py#L3326-L3382).

## 2. The core loop

LangGraph supplies an orchestration loop, not a built-in model-decision loop. A `StateGraph` author
registers functions or `Runnable` objects as nodes; `add_node` coerces each action into a runnable,
and `compile` turns the builder into a `CompiledStateGraph`
([`StateGraph.add_node`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/graph/state.py#L667-L720),
[`StateGraph.compile`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/graph/state.py#L1177-L1208)).
If a node calls a model, model choice and action interpretation belong to that node.

The compiled runtime uses bulk-synchronous steps. It plans actors from channel changes, runs the
selected actors concurrently while channel state remains immutable, then applies their writes; it
stops when no actors are selected or the step limit is reached
([`Pregel`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/main.py#L450-L477)).
The synchronous executable path makes that contract concrete:

1. `SyncPregelLoop` loads the requested or latest checkpoint for the configured thread
   ([`SyncPregelLoop.__enter__`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/_loop.py#L1629-L1665)).
2. `loop.tick()` derives runnable tasks from the checkpoint, pending writes, channels, and graph;
   no tasks means termination
   ([`PregelLoop.tick`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/_loop.py#L599-L681)).
3. `PregelRunner.tick` executes tasks and commits either their writes or exceptions
   ([`PregelRunner.tick`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/_runner.py#L176-L254)).
4. `loop.after_tick()` atomically exposes the collected channel writes to the next step and creates
   the loop checkpoint
   ([`PregelLoop.after_tick`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/_loop.py#L683-L724)).

[`Pregel.stream`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/main.py#L2899-L2988)
wires those four operations into the repeated runtime loop and waits for each checkpoint before the
next step only in `sync` durability mode.

## 3. State and persistence

### What is checkpointed

Graph state is represented by channels. A `Checkpoint` stores channel values, per-channel versions,
the versions each node has seen, updated-channel metadata, an id, and a timestamp; its enclosing
`CheckpointTuple` adds metadata, the parent checkpoint, and pending task writes
([`Checkpoint` and `CheckpointTuple`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/checkpoint/langgraph/checkpoint/base/__init__.py#L92-L146)).
The checkpointer uses `thread_id` as its primary retrieval key and exposes get, list, put, and
pending-write operations
([`BaseCheckpointSaver`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/checkpoint/langgraph/checkpoint/base/__init__.py#L176-L251)).

The serialized schema does not contain arbitrary Python locals, live resources, or effects already
performed outside the channels. `create_checkpoint` asks each tracked channel for its snapshot and
copies version/routing metadata
([`create_checkpoint`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/checkpoint/langgraph/checkpoint/base/__init__.py#L829-L860)).
Storage durability is supplied by the chosen saver: `InMemorySaver` explicitly targets debugging
and tests and indexes checkpoints, writes, and blobs in process memory
([`InMemorySaver`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/checkpoint/langgraph/checkpoint/memory/__init__.py#L33-L82)).

### Where a step ends

The graph author defines nodes and routing, but the runtime decides the checkpoint boundary: every
set of actors made ready by the same channel versions forms one superstep. Their writes are hidden
from peers during execution, applied together in `after_tick`, and then checkpointed. Thus a node is
an author-visible unit, while the durable step can contain multiple parallel nodes
([`Pregel`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/main.py#L464-L477),
[`after_tick`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/_loop.py#L683-L718)).

### What resume restores and replays

On entry the loop loads either a named checkpoint or the latest one for the thread. `InMemorySaver`
reconstructs its channel values from versioned blobs and returns pending writes plus its parent
configuration
([`InMemorySaver.get_tuple`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/checkpoint/langgraph/checkpoint/memory/__init__.py#L230-L309)).
On the first resumed tick, successful pending writes are reattached to their tasks, so the runner
does not execute those tasks again. Error, interrupt, and resume control writes are deliberately
skipped, leaving interrupted tasks empty and therefore eligible for re-execution
([`_reapply_writes_to_succeeded_nodes`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/_loop.py#L736-L749)).

`interrupt()` makes the replay contract explicit: after `Command(resume=...)`, execution restarts
at the beginning of the node, and the interrupt call returns the stored resume value when reached
again
([`interrupt`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/types.py#L851-L871),
[`interrupt` implementation](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/types.py#L950-L974)).
Consequently, an external side effect performed before the interrupt can run again. The framework
restores channel and task-write state; it cannot roll back or deduplicate an application-owned
effect.

Process-crash exposure also depends on the selected durability mode. `sync` persists changes before
the next step, `async` persists while the next step runs, and `exit` persists only when the graph
exits
([`Pregel.stream`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/main.py#L2705-L2712)).

### Checkpoint versus documentary handoff

**Opinion.** They overlap in continuity but are not the same problem. A LangGraph checkpoint can
derive the next runnable tasks from typed execution state; a rungs handoff preserves objective,
constraints, working assumptions, open questions, and judgement that may never have been graph
channels. Checkpointing can remove the need to narrate recoverable machine state, but it does not
remove the need to explain why the work exists, what was decided, or what a new human or agent must
not reopen. Conversely, a handoff is not an execution checkpoint because it cannot prove which
parallel writes committed or make a replayed side effect safe.

## 4. Tools and the outside world

In the bounded runtime, the generic outside-world boundary is the node. A node can be any function
or `Runnable`, and the runner calls it in-process through the retry path
([`StateGraph.add_node`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/graph/state.py#L667-L720),
[`PregelRunner.tick`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/_runner.py#L200-L248)).
Its return becomes channel writes or a `Command`; exceptions are committed and either routed to a
configured error-handler node or propagated by the runner.

**Bounded absence check, 2026-08-15.** `rg -n 'ToolNode|tool_call|sandbox|permission|approval'
libs/langgraph/langgraph` found tool-call message/projection and streaming code, plus one remote
server permission comment, but no core declaration-time permission, approval, or sandbox primitive.
This does not claim that separate prebuilt or hosted packages lack those features. Within the read
boundary, tool schemas, authorization, isolation, idempotency, and compensation are application
responsibilities; checkpointing records the node's graph writes, not its external transaction.

## 5. Composition

A compiled graph can itself be a node. The traced test uses a child state schema whose `bar` and
`baz` keys are absent from the parent, explicitly maps parent `foo` into the child, compiles the
child with `checkpointer=True`, and maps the child's result back to `foo`
([`test_subgraph_checkpoint_true_interrupt`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/tests/test_pregel.py#L3326-L3365)).
The parent's checkpointer then exposes the interrupted child's durable state through
`get_state(..., subgraphs=True)` and resumes the nested graph with the parent's
`Command(resume=...)`
([nested interrupt assertions](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/tests/test_pregel.py#L3365-L3382)).

Checkpoint scope is configurable: `None` inherits a parent's saver, `False` refuses inheritance,
and `True` gives a subgraph its own checkpoint namespace using the parent saver
([`StateGraph.compile`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/graph/state.py#L1177-L1205)).
Control can also cross upward: `Command.graph` targets the current or closest parent graph, while
`update`, `goto`, and `resume` carry state and routing instructions
([`Command`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/types.py#L799-L824)).
This is hierarchical graph composition with explicit state adapters and namespace-aware control,
not autonomous peers negotiating a handoff.

## 6. The human in the loop

Human interruption is a durable graph event, but human decision policy is outside the runtime. On
its first call, `interrupt(value)` raises `GraphInterrupt` with a namespaced interrupt id and value.
The top-level loop suppresses the exception, emits the interrupted state, and the client later
supplies `Command(resume=value)` using the same `thread_id`
([`interrupt` implementation](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/types.py#L950-L974),
[`callback test`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/tests/test_graph_callbacks.py#L95-L130)).
`Command.resume` accepts either one value or an interrupt-id-to-value map; the latter disambiguates
multiple pending interrupts
([`Command`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/types.py#L799-L824),
[`PregelLoop._first`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/_loop.py#L848-L928)).

While waiting, the durable world is the last checkpoint plus the interrupt/pending writes. The
runtime does not define an approver identity, approval UI, rejection semantics, or authorization
rule in the bounded core search from section 4. An application may encode approve, reject, or edited
input in the resume value, but LangGraph treats it as data. On resume the interrupted node reruns,
so logic before the interrupt must be replay-safe.

## 7. The abstraction bargain

**Opinion.** I think the graph buys an unusually precise answer to “what can resume?” Typed channels,
versions-seen, pending writes, task identities, and checkpoint ancestry let the runtime distinguish
finished parallel work from the interrupted task. A plain agent loop would have to reconstruct
that machinery or restart more work.

**Opinion.** The cost is that application authors must promote every recovery-relevant fact into
serializable graph state, choose stable thread and namespace identities, operate a checkpointer,
and reason in supersteps rather than ordinary call order. The three durability modes additionally
force an explicit latency-versus-loss choice. Those costs follow from the state schema and loop
paths in sections 2 and 3.

**Opinion.** The sharpest hidden cost is replay-safe side effects. A checkpoint after channel
commit is not a transaction around an email, payment, shell command, or remote API call. Because
an interrupted node restarts, authors need idempotency keys, effect ledgers, or a node boundary that
places the interrupt before the effect. LangGraph exposes the replay point clearly; it does not make
the external world rewindable.

**Opinion.** The framework deliberately leaves “agent” semantics thin. Model calls, tool policy,
approval UX, and documentary rationale remain application concerns; this makes the runtime broadly
composable, but a graph alone is not a complete agent harness.

## 8. What rungs takes

These verdicts are inputs to WI-017; they do not change the catalogue here.

| Pattern id | Verdict | Pinned evidence | Reason |
| --- | --- | --- | --- |
| `session-handoff` | take-as-warning | [`Checkpoint`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/checkpoint/langgraph/checkpoint/base/__init__.py#L92-L146), [`interrupt`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/types.py#L851-L871) | **Opinion.** Mechanical checkpoints sharpen what a handoff is not: a narrative can preserve intent but cannot establish committed writes or replay state, while a checkpoint need not preserve rationale or constraints. |
| `candidate: durable-superstep` | take | [`Pregel.stream`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/main.py#L2959-L2988), [`after_tick`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/_loop.py#L683-L724) | **Opinion.** I would carry forward the practice that a resumable workflow names the unit whose writes become visible and durable together; “save often” is too vague. |
| `candidate: replay-safe-side-effect` | take | [`_reapply_writes_to_succeeded_nodes`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/pregel/_loop.py#L736-L749), [`interrupt`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/types.py#L851-L871) | **Opinion.** A resumable step must state what re-executes and make pre-boundary effects idempotent or separately recorded; persistence without replay semantics is a dangerous half-contract. |
| `candidate: interrupt-as-state` | take | [`Command`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/langgraph/types.py#L799-L824), [`nested interrupt test`](https://github.com/langchain-ai/langgraph/blob/644815f9e5bc52ad8f7a5227a456227e9c3e639b/libs/langgraph/tests/test_pregel.py#L3326-L3382) | **Opinion.** I would retain the separation between durable pause/resume mechanics and application-owned approval policy, including an addressable id when more than one decision is pending. |

The strongest counter-evidence is the side-effect boundary: even a fully versioned checkpoint and a
successful resume do not prove exactly-once interaction with the outside world.
