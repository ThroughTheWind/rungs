# Google ADK — runner events, resumable confirmation, schema migration, and language parity

This extraction answers WI-024's bounded question: how Google ADK's agent/workflow runner,
session/event persistence, delegation, tool confirmation, evaluation, and public language
implementations evolve together. It is a source extraction from two pinned public repositories,
not a hosted Vertex AI assessment, performance benchmark, security certification, or full A2A
analysis. A2A protocol semantics remain in WI-026.

## Snapshot and read boundary

**Measured** — The primary source is Google's public [adk-python repository](https://github.com/google/adk-python/tree/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf) at commit
`1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf`, read 2026-08-15. `git describe` reports
`v1.15.0-2525-g1d2d1eda`; this is a pinned source snapshot, not a current-release claim. The
repository's [LICENSE](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/LICENSE)
is Apache-2.0.

**Measured** — The bounded Python checkout measurement was:

```text
git -C C:\Temp\rungs-follow-on-20260815\adk-python ls-files
  2,481 tracked files
  1,776 Python files
    851 test-named/test-directory files
    287 Markdown files
```

The counts describe tracked paths at this commit. They do not measure installed dependencies,
model quality, cloud services, or runtime performance.

**Measured** — The secondary parity source is Google's public [adk-java repository](https://github.com/google/adk-java/tree/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4) at commit
`2b87d65d9704a61ff4668b8c9482a79fef9fe0d4`, read 2026-08-15. The checkout has no usable tag at
that commit (`git describe` reports `2b87d65d`); its source [Version.java](https://github.com/google/adk-java/blob/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4/core/src/main/java/com/google/adk/Version.java)
declares Java ADK version `1.7.1`. Its [LICENSE](https://github.com/google/adk-java/blob/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4/LICENSE)
is Apache-2.0.

**Measured** — The bounded Java checkout measurement was:

```text
git -C C:\Temp\rungs-follow-on-20260815\adk-java ls-files
  683 tracked files
    541 Java files
    211 test-named/test-directory files
     38 Markdown files
```

The parity comparison is deliberately one mechanism rather than a whole-family inventory:
runner/event/session/confirmation semantics and their executable tests. Differences below are
classified as idiom, design divergence, migration timing, or not established.

**Documented** — The selected Python read set is the runner, event/action and confirmation models,
session services, database schemas/migration runner, local evaluation service, bounded A2A adapter,
and their targeted tests. The selected Java read set is `Runner`, `Event`, `EventActions`,
`ToolConfirmation`, session service contracts, and `RunnerTest`/session tests. No model, cloud
endpoint, Python package, Java build, or remote A2A peer was run from these checkouts.

## One Python invocation: event queue, session, delegation, tool, and termination

**Implemented** — `Runner._run_node_async` is the Python execution spine. It obtains or creates a
session, validates a fresh message versus function-response resume inputs, resolves the invocation
id from the matching function-call event, creates an `InvocationContext`, appends the user event,
runs `on_user_message` and `before_run` callbacks, starts the root node, drains its event queue,
persists non-partial events, and finally runs `after_run` plus post-invocation compaction. The
source path is [`src/google/adk/runners.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/runners.py),
principally `_run_node_async`, `_append_user_event`, `_consume_event_queue`, and
`_resolve_invocation_id_from_fr`.

**Implemented** — A model/tool turn is represented as an `Event` with `invocation_id`, `author`,
`actions`, content/output, workflow `node_info`, timestamp, and optional `branch` and
`isolation_scope`. `EventActions` carries state/artifact deltas, agent transfer, escalation,
requested auth, requested tool confirmations, compaction, and workflow termination/checkpoint
fields. The event model explicitly says that `branch` hides peer sub-agent history and that
`isolation_scope` restricts task-agent visibility to the originating function-call scope. See
[`events/event.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/events/event.py)
and [`events/event_actions.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/events/event_actions.py).

**Implemented** — Delegation is event/state driven rather than a second top-level runner. The
workflow can transfer to another agent through `EventActions.transfer_to_agent`; task delegation
uses an active function-call scope discovered by `_find_active_task_scope`, and task events are
stamped with the originating function-call id as `isolation_scope`. A `finish_task` response closes
the active scope; the next user/function-response turn can resume the same invocation. This is a
runtime mechanism, not evidence that an external agent or protocol shares ADK's session store.

**Implemented** — The event consumer applies plugin callbacks, derives the output event, appends
non-partial events to `session_service`, and yields the same event to the caller. Partial streaming
chunks are caller-visible but are not persisted; the final aggregate is the durable event. The
root-node task is cleaned up before successful `after_run` and compaction; exceptions notify the
error callback and are re-raised. This gives the following bounded trace:

```text
user Content
  -> user Event appended to Session
  -> root agent/workflow emits model Event
  -> transfer/task EventActions optionally narrow visibility by branch/scope
  -> tool FunctionCall Event
  -> tool result or confirmation Event
  -> non-partial events appended; partial chunks only streamed
  -> root task finishes; after_run + compaction; invocation ends
```

**Implemented** — The Python executable coverage includes `tests/unittests/runners/` runner,
pause/resume, rewind, and confirmation tests. The targeted confirmation suite exercises a real
function-call id, a pending confirmation event, a user FunctionResponse, the resumed tool result,
and the final model response in one session. The tests also cover a confirmation inside a
`SequentialAgent` child and verify that later workflow agents run after resume without re-running
completed earlier agents ([`test_run_tool_confirmation.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/tests/unittests/runners/test_run_tool_confirmation.py)).

## Confirmation: identity, arguments, durability, and host authority

**Implemented** — `EventActions.requested_tool_confirmations` is a dictionary keyed by function
call id. Each value is a `ToolConfirmation` with a human hint, `confirmed` boolean, and optional
JSON-serializable payload. The Python model is marked experimental and accepts either a direct
response object or the client's `{"response": "<json>"}` wrapper. See
[`tools/tool_confirmation.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/tools/tool_confirmation.py)
and the `requested_tool_confirmations` field in
[`events/event_actions.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/events/event_actions.py).

**Implemented** — Resume binding is to the original function-call id, not to a tool name or a
newly supplied invocation id. `_resolve_invocation_id_from_fr` searches session events for every
function-response id, rejects an unknown id, rejects responses that resolve to multiple
invocations, and derives the original invocation id. If a caller supplies a conflicting
invocation id, the function-response match wins with a warning. The confirmation tests then assert
that the resumed event retains the original invocation id and executes the originating child
agent.

**Implemented** — Arguments are preserved in the original model `FunctionCall` event and are
replayed by the tool flow after an affirmative response. The confirmation payload itself is
durable only insofar as the emitted event is persisted by the configured session service; the
`ToolConfirmation` type does not itself authenticate a user or sign an approval. The runner and
session service bind the response to the call id, while the application/client supplies the
human decision.

**Strongest counter-evidence** — The inspected code establishes structural binding and resumable
state, not end-user authentication, authorization policy, replay protection outside the session
history, or rollback of an already executed external side effect. Host/application code owns the
identity of the person or service submitting the FunctionResponse and the authority of the tool
process. “Confirmed” must therefore not be read as “securely authorized.”

## Persisted session/event schema migration

**Implemented** — Python `DatabaseSessionService` selects schema v1 when the metadata table reports
`schema_version == "1"`; a database without metadata is classified as legacy v0 when its `events`
table has `actions` but no `event_data`. New databases receive v1 tables and metadata. The selector
and constants are in [`sessions/migration/_schema_check_utils.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/sessions/migration/_schema_check_utils.py)
and the branching table setup is in
[`sessions/database_session_service.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/sessions/database_session_service.py).

**Implemented** — v0 stores event actions through Python pickle; v1 stores a JSON `event_data`
representation and metadata version `"1"`. `StorageEvent.from_event`/`to_event` preserve the
event model and timestamp. The migration runner maps v0 pickle to v1 JSON, refuses in-place
migration, supports temporary SQLite databases for multi-step chains, and cleans temporary files.
The process guide requires forking the latest schema, transforming/upserting rows, setting
metadata, keeping the previous schema readable for at least two releases, and only then removing
the compatibility path ([`sessions/migration/README.md`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/sessions/migration/README.md),
[`migration_runner.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/sessions/migration/migration_runner.py),
[`schemas/v0.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/sessions/schemas/v0.py),
[`schemas/v1.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/sessions/schemas/v1.py)).

**Implemented** — The persistence path applies temporary state to the in-memory session but trims
`temp:` keys before persistence. It updates app/user/session state, writes the event, and uses an
exact storage update marker when available. A stale marker raises `StaleSessionError`; marker-less
legacy/in-memory sessions fall back to checking whether the last event still matches storage. This
is concurrency protection for the session writer, not a distributed transaction over tool effects.

**Implemented** — The migration tests create a v0 SQLite database, run the migration, assert v1
metadata and rows, preserve safe nested action payloads, retain timestamps, and reject unsafe
pickle globals unless explicitly enabled for a trusted source. Session tests cover state deltas,
partial-event handling, and stale-session behavior ([`sessions/migration/test_migration.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/tests/unittests/sessions/migration/test_migration.py),
[`sessions/test_session_service.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/tests/unittests/sessions/test_session_service.py)).

**Documented** — The migration process makes the compatibility contract explicit: old state can be
read and transformed through the registered path, but an in-place database upgrade is not
supported and arbitrary legacy pickle content is not trusted by default. The pinned source does
not establish that every historical schema or every external database dialect is losslessly
migratable.

## Evaluation path, bounded against Inspect AI

**Implemented** — Python's experimental `LocalEvalService` separates inference from metric
evaluation. It selects eval cases from an `EvalSet`, runs bounded concurrent inference through the
agent/session services, yields `InferenceResult` values, then evaluates each result into an
`EvalCaseResult` with per-invocation metric details and an overall score. An optional results
manager persists eval-set result artifacts. [`evaluation/local_eval_service.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/evaluation/local_eval_service.py)
and [`evaluation/agent_evaluator.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/evaluation/agent_evaluator.py)
are the bounded implementation path; the evaluation tests mock the service boundary and assert
that inference, metric results, artifacts, and optional result managers are threaded correctly.

**Implemented** — The ADK evaluation boundary is runtime-adjacent: it can use the same session and
artifact services as inference, and its result objects retain invocation-level details and metric
scores. It is not the runner's ordinary event log and is not itself a claim of reproducibility
without a pinned model, dependency environment, eval set, and configuration.

**Comparison (analogy only)** — WI-021's Inspect AI extraction treats a `Sample`/transcript and
evaluation log as the durable evaluation evidence boundary, with task setup, sandbox, scorer,
aggregation, and optional optimizer feedback kept explicit. ADK's `EvalSet` → inference → metric
result path is comparable at the “case/invocation/score” vocabulary level, but the authority and
artifacts differ: ADK's runner/session services remain the runtime evidence source, while Inspect
AI's sample/log object is the evaluation-system boundary. This is not evidence that the two systems
produce equivalent or interchangeable reproducibility guarantees.

## Java parity on the predeclared event/session/confirmation mechanism

**Implemented** — Java `Runner.runAsync` returns an RxJava `Flowable<Event>`. It loads or
auto-creates a session, appends the user event, creates an `InvocationContext`, runs the root agent,
persists non-partial events, and serializes concurrent runs for the same session id. Java's
`Event` carries invocation id, author, content, actions, branch, partial/turn state, timestamps,
and long-running tool ids; `Session` carries app/user/user-id, state, ordered events, and last
update time. See [`runner/Runner.java`](https://github.com/google/adk-java/blob/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4/core/src/main/java/com/google/adk/runner/Runner.java),
[`events/Event.java`](https://github.com/google/adk-java/blob/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4/core/src/main/java/com/google/adk/events/Event.java),
and [`sessions/Session.java`](https://github.com/google/adk-java/blob/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4/core/src/main/java/com/google/adk/sessions/Session.java).

**Implemented** — Java `EventActions` has state/artifact deltas, transfer/escalation, requested
auth, requested tool confirmations keyed by function-call id, and an explicit `endOfAgent` flag.
`BaseSessionService.appendEvent` ignores partial events, applies non-temporary state deltas, and
appends the completed event to the session. Java `ToolConfirmation` has the same hint/confirmed/
payload shape and is JSON-deserializable ([`events/EventActions.java`](https://github.com/google/adk-java/blob/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4/core/src/main/java/com/google/adk/events/EventActions.java),
[`events/ToolConfirmation.java`](https://github.com/google/adk-java/blob/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4/core/src/main/java/com/google/adk/events/ToolConfirmation.java),
[`sessions/BaseSessionService.java`](https://github.com/google/adk-java/blob/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4/core/src/main/java/com/google/adk/sessions/BaseSessionService.java)).

**Implemented** — Java's executable `RunnerTest` covers a confirmation request followed by a
FunctionResponse, confirmation inside a `SequentialAgent` child, and resumability that advances
later agents without re-running completed earlier agents. It also covers partial events being
streamed without being passed to the session service. The in-memory session tests cover state
delta application/removal and timestamps ([`runner/RunnerTest.java`](https://github.com/google/adk-java/blob/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4/core/src/test/java/com/google/adk/runner/RunnerTest.java),
[`sessions/InMemorySessionServiceTest.java`](https://github.com/google/adk-java/blob/2b87d65d9704a61ff4668b8c9482a79fef9fe0d4/core/src/test/java/com/google/adk/sessions/InMemorySessionServiceTest.java)).

| Difference | Classification | Evidence boundary |
| --- | --- | --- |
| Python async generators/`asyncio.Queue` versus Java RxJava `Flowable` and `PersistBarrier` | Idiom | Both stream events and persist completed events; the control-flow libraries differ. |
| Python `isolation_scope` and node path metadata versus Java branch/agent metadata and explicit `endOfAgent` | Design divergence | The public event shapes expose related delegation/termination concerns but are not wire-identical. |
| Python v0 pickle → v1 JSON database migration and two-release compatibility guidance | Migration timing | No equivalent Java database-schema migration was established in the selected core read set. |
| A full cross-language evaluation and A2A parity contract | Not established | The bounded Java read set was runner/session/confirmation only; WI-026 owns A2A and no Java evaluation comparison was attempted. |

**Strongest counter-evidence** — The parity source confirms shared concepts and test intent, not
behavioral equivalence. Java's `BaseSessionService` default append is in-memory and its concrete
services may own different persistence guarantees; Python's database service has explicit schema
versioning and stale-writer markers. The language comparison therefore cannot support a single
cross-language durability or security claim.

## Bounded A2A note

**Implemented** — Python contains a `RemoteA2aAgent` adapter and targeted tests that resolve an
agent card, send/stream A2A messages, map remote task/artifact updates into ADK events, and carry
bounded `a2a:` metadata. The read boundary is [`agents/remote_a2a_agent.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/src/google/adk/agents/remote_a2a_agent.py)
and [`tests/unittests/agents/test_remote_a2a_agent.py`](https://github.com/google/adk-python/blob/1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf/tests/unittests/agents/test_remote_a2a_agent.py).

**Not established** — This extraction does not determine A2A normative requirements, remote-agent
identity/authentication, artifact consistency, or protocol conformance. Those claims require the
pinned A2A specification and implementation comparison in WI-026.

## Continuity matrix

| Boundary | What the pinned implementation preserves | What it does not establish |
| --- | --- | --- |
| Identity | Session id, invocation id, function-call id, event id, agent branch/scope | Human identity, tool authorization, or remote-agent identity |
| State | Session state deltas, ordered events, resumable invocation context, schema-versioned database rows | Atomic rollback of external effects or availability of a remote provider/task |
| External effects | Tool calls/results, requested confirmation, artifact service hooks, A2A adapter events | Reversibility, sandboxing, network policy, or side-effect transactions |
| Human authority | Function-call-id-bound confirmation response and host-supplied decision | Authentication or authorization of the approver |
| Evidence | Non-partial persisted events, migration metadata, eval case/metric results | Tamper-evident complete process/network transcript |
| Recovery | Function-response resume, task isolation, stale-writer rejection, v0→v1 migration | Guaranteed recovery after a process/provider/external side-effect failure |

**Opinion** — ADK's durable spine is an invocation's session/event history plus explicit schema
versioning. Delegation and confirmation become safer to reason about when they carry stable call
ids and scopes, but those identifiers are application/runtime evidence rather than authentication.
The multi-language comparison suggests that the event/session boundary is an intentional concept;
its streaming and migration mechanisms remain language- and release-specific.

## Candidate pattern consequences (deferred to WI-028)

| Candidate | Evidence | Provisional disposition |
| --- | --- | --- |
| `session-isolation` | **Implemented** — branch/isolation scopes, task-call ids, and session append/reload paths constrain what a delegated agent sees. | Candidate; compare with product-session evidence in WI-028. |
| `confirmation-gate` | **Implemented** — confirmation is a persisted event action keyed to a function-call id and resumed through the originating invocation. | Candidate; do not infer authentication or safe execution. |
| `schema-evolution` | **Implemented** — v0 pickle/v1 JSON detection, migration runner, metadata version, and compatibility window are explicit. | Candidate; reconcile with existing catalogue wording. |
| `evaluation-boundary` | **Implemented** — EvalSet/inference/metric results are distinct from ordinary runtime events. | Candidate; compare only within the evaluation track. |
| `protocol-escape-hatch` | **Implemented** — RemoteA2aAgent maps an external agent protocol into local events. | Candidate only; WI-026 adjudicates protocol semantics. |

No catalogue, module, or CLI file changed. WI-025 owns MCP semantics, WI-026 owns full A2A
analysis, and WI-028 owns cross-subject reconciliation.
