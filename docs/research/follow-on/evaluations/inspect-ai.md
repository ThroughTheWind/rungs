# Inspect AI — reproducible evaluation and sandboxed evidence

This extraction answers WI-021's bounded question: what a single Inspect AI evaluation records,
what its score means, and what remains outside the record. It follows the
[shared spine](../SHARED-SPINE.md) and the [evaluation track template](../EVALUATION-TEMPLATE.md).
It is an architecture extraction, not a model comparison or a claim about hosted behaviour.

## Snapshot and claim boundary

**Measured** — The source is the public
[UKGovernmentBEIS/inspect_ai repository](https://github.com/UKGovernmentBEIS/inspect_ai/tree/d482209d573cdde116cc0f28abfb01712e91e80c)
at commit `d482209d573cdde116cc0f28abfb01712e91e80c`, read 2026-08-15. `git describe` at that
commit reports `0.3.258-38-gd482209d5`; this is a source snapshot, not a claim about the latest
release. The repository's [LICENSE](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/LICENSE)
is MIT.

**Measured** — The bounded checkout measurement was:

```text
git -C C:\Temp\rungs-follow-on-20260815\inspect-ai ls-files
  2,088 tracked files
  1,565 Python files
    773 test-named/test-directory files
    186 Markdown/QMD/RST files
    110 task definitions under src/, examples/, and tests/
```

The command counts tracked paths only. It does not measure runtime dependencies, installed sandbox
images, model access, or evaluation quality.

**Documented** — This extraction reads the task/eval runtime (`src/inspect_ai/_eval/`), dataset,
solver, model, scorer, log/recorder, sandbox, checkpoint, and selected executable tests and design
notes. The concrete mechanism is the `bash` task in
[`examples/tool_use.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/examples/tool_use.py),
which combines a tool-using solver, a model generation, a local sandbox, and the deterministic
`includes()` scorer. The source checkout was inspected at the pinned commit; no expensive model
evaluation was run.

## E1 — one evaluation contract, end to end

| Element | Definition and owner | Pinned evidence | Versioned input | Failure or missing-data rule |
| --- | --- | --- | --- | --- |
| Task definition and sample | `Task` owns dataset, solver, scorer, limits, sandbox, checkpoint, metadata, and version. `Sample` owns input, target, id, files, setup, and optional sandbox/checkpoint overrides. | [`task.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/_eval/task/task.py), [`_dataset.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/dataset/_dataset.py) | Task `version`, task file/registry name, dataset/sample ids, input/target, task args and passed args are captured in `EvalSpec`. | Missing ids or invalid task construction fail before a trustworthy sample result; dynamic `SampleSource` can add samples while the scheduler is open. |
| Execution environment and tools | The plan runs solvers under per-sample limits and an optional `SandboxEnvironment`; tool calls can call `sandbox().exec`, `read_file`, or `write_file`. | [`run.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/_eval/task/run.py), [`sandbox.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/_eval/task/sandbox.py), [`tool_use.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/examples/tool_use.py) | Model name/config, model roles, sandbox type/config, limits, concurrency, task revision, and package versions are fields of `EvalSpec`/`EvalConfig`. | Sandbox initialization, tool, model, timeout, limit, or cleanup errors become sample/eval errors; the selected `local` backend runs commands as the current user. |
| Evidence log or transcript | `TaskLogger` and a recorder write `EvalSample` events, messages, model output, tool/sandbox events, state store, scores, errors, retries, and attachments; `EvalLog` holds eval identity, plan, results, stats, and samples. | [`_log.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/log/_log.py), [`events.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/util/_sandbox/events.py), [`_recorders/eval.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/log/_recorders/eval.py) | Eval log format version, run/eval/task ids, source revision, timestamps, configuration, and per-sample `id` + `epoch` + `uuid`. | Realtime/buffered logging can leave only the last successful flush after a hard crash; an in-progress sample has no final score. |
| Scoring function or judge | A `Scorer` receives `TaskState` and `Target`, returns a `Score`, and emits a `ScoreEvent`. Built-ins include deterministic match/includes and model-graded QA/fact scorers. | [`_scorer.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/scorer/_scorer.py), [`_model.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/scorer/_model.py) | Scorer registry name, args, metadata, metrics, target, and (for model graders) grader model/role/config. | A missing or unparsable model-judge grade is unscored; scorer exceptions follow retry/score-on-error policy. |
| Aggregation and uncertainty | Sample scores are collected into `EvalResults`; epoch reducers (default `mean`, also mode/median/pass@k/etc.) produce aggregate metrics and optional sample reductions. | [`epochs.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/_eval/task/epochs.py), [`reducer.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/scorer/_reducer/reducer.py), [`results.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/_eval/task/results.py) | Total/completed samples, epochs, reducer names, scorer metrics, model usage, and timing are retained. | Aggregates summarize scored values; they do not establish truth, causal quality, or independence between epochs. Unscored/error samples follow the scorer and eval policy. |
| Optimizer feedback or selection | Not applicable to this selected mechanism. Inspect AI evaluates tasks; it does not update the task or prompt as part of `eval()`/`eval_set()`. | [`eval.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/src/inspect_ai/_eval/eval.py) and the absence of an optimizer in the traced task plan. | An external experiment runner could consume `EvalLog.results`, but that consumer is outside this pinned run. | **Opinion** — treating a reported score as an automatic improvement signal would cross the evaluation boundary and require a separately evidenced optimizer. |

### The concrete path

**Implemented** — The selected `bash` task constructs one `Sample` with an input asking whether
`python3` is present, a target of `Yes`, a solver plan of `system_message → use_tools(list_files)
→ generate`, `sandbox="local"`, and `includes()` as scorer. The `list_files` tool calls
`sandbox().exec(["ls", dir])`; it does not call the host shell directly from the task code.

**Implemented** — `eval()` resolves task/model/sandbox/configuration and schedules samples. The task
runner lazily creates a `TaskState` from the sample, enters the active-sample context, applies
message/token/time/working/cost/turn limits, then executes the solver plan. The model's tool call
and response become model/tool events in the sample transcript.

**Implemented** — `sandboxenv_context()` resolves task-versus-sample sandbox precedence, copies
sample files and setup content, enforces `max_sandboxes` through a resizable semaphore, initializes
the selected provider, and cleans it up on normal or interrupted exit. The sandbox proxy emits
structured `SandboxEvent` records for `exec`, `read_file`, and `write_file`, including command,
result/output, timestamps, and selected options.

**Implemented** — Once the solver completes, each scorer is called with the final `TaskState` and
target. The score is attached to `state.scores` and a `ScoreEvent` records the scorer name,
arguments (when registry-created), target, score, and model usage. `includes()` is a deterministic
comparison; `model_graded_qa()` makes a second model call and parses a configured grade pattern.

**Implemented** — The logger materializes an `EvalSample` containing input, output, messages, store,
events, attachments, scores, usage, timing, error, limits, and retry history. The recorder flushes
samples to an `.eval` archive and finalizes `EvalLog.results`, `stats`, reductions, and status at
task completion. The on-disk format is therefore both a transcript/evidence artifact and a
post-run aggregate, not a source of model-independent truth.

## Shared spine

### State and identity

**Implemented** — There are several identities with different scopes: `Sample.id` identifies the
dataset item; `epoch` identifies a repeated attempt; `EvalSample.uuid` identifies one runtime sample
instance; `EvalSpec.eval_id`, `run_id`, and `task_id` identify the eval/task execution; and
`EvalRevision` can record a Git origin/commit/dirty state. A retry keeps the sample/epoch identity
but appends `error_retries`; a requeued or task-retried attempt can mint a fresh runtime UUID.

**Opinion** — This separation is stronger evidence for audit joins than a single run id, but it
means downstream systems must choose whether they are counting dataset items, attempts, or runtime
instances. A scalar aggregate hides that choice unless the log's sample and retry fields are kept.

### External effects and authority

**Implemented** — Model-provider calls, grader-provider calls, sandbox commands, filesystem reads and
writes, network access inside a sandbox provider, and human approval/ACP/control endpoints are
external boundaries. The evaluator records requests/results where the event type supports it, but
the provider, image, network, and host policy remain authorities outside `Task`/`Scorer`.

**Implemented** — The `local` sandbox creates a temporary directory and executes subprocesses as the
current user; its `user` argument is explicitly ignored. This is a workspace boundary and lifecycle
wrapper, not a privilege boundary. Docker or other providers add their own daemon/image/network
authority and were not executed here.

**Documented** — Human judgement is present in the approval/control surface and in the project’s
human-approval tests, but the inspected scorer API has no built-in “human label” scorer analogous to
`model_graded_qa`. A human approval decision can authorize a tool action; it is not automatically a
ground-truth label for the resulting score.

### Durable evidence, replay, and recovery

**Implemented** — An `EvalLog` can reconstruct the task specification, plan, sample input/target,
messages, model output, tool/sandbox events, state store, scores, errors, retries, timing, usage,
and aggregate results for samples that were flushed. Attachments may be stored separately and
resolved while reading.

**Documented** — `design/recover.md` describes the `.eval` ZIP journal (`start.json`, versioned
summary flushes, sample files, final header) and the realtime SQLite sample buffer. A hard crash
leaves status `started`, flushed samples, and possibly unflushed buffer data; it does not recover an
in-flight sample's final score or the aggregate reductions. `inspect recover` can reconstruct a
recovered error log from available flushed and buffer data.

**Implemented** — Checkpoint sidecars can resume an errored sample from a saved checkpoint or resume
for scoring after an `agent_complete` checkpoint. The test fixture in
[`test_score_on_error.py`](https://github.com/UKGovernmentBEIS/inspect_ai/blob/d482209d573cdde116cc0f28abfb01712e91e80c/tests/test_score_on_error.py)
asserts the distinction between a checkpoint resume, scoring resume, and a fresh retry when no
sidecar exists. Resume restores state/sandbox/transcript at the checkpoint boundary; it does not
replay external model or host behaviour deterministically.

**Opinion** — The log is replayable as an observation (messages/events/scores can be inspected) and
partly resumable when checkpoint artifacts exist. It is not a replay oracle for a provider, sandbox
image, network, wall clock, or human decision.

## E2 — reproducibility and provenance

**Implemented** — A credible rerun needs, at minimum: the task source and `Task.version`; dataset
content and sample ids; model and grader model/provider/configuration; model roles; prompts and tool
definitions; sandbox type/config/image and setup/files; dependency/package versions; limits,
parallelism, retries, epochs/reducers, approval policy, and relevant environment variables. `EvalSpec`
records many of these, and `EvalRevision` records Git origin/commit/dirty state when available.

**Measured** — The source lock and task file are reproducible at the pinned SHA above. The selected
example has one sample and no random seed; model output and filesystem state are still external
inputs. The measurement does not establish cross-provider or cross-host reproducibility.

**Executed** — The pinned checkout was verified by read-only `git` measurements and source-path
inspection. A live eval was intentionally not executed because this environment has no Python
runtime/model credentials; the executable evidence cited below is the project's own mock-model and
sandbox tests at the same SHA.

## E3 — scoring validity and aggregation

**Implemented** — Deterministic scorers such as `includes()` and `match()` compare the produced
output to the sample target under their documented normalization rules. Their score establishes only
that the implementation's predicate returned a value for that target/output pair.

**Implemented** — `model_graded_qa()` renders a grading prompt, calls a configured grader model (or a
named `grader` role), parses a regex grade, and stores the grader response/prompt in score metadata.
Multiple grader models can be combined through a mode-based multi-scorer. The result is evidence of
that judge configuration and response, not an independent fact.

**Documented** — The inspected scorer package and tests include model graders and approval/human
interaction tests, but no built-in human-label aggregation path was used in the selected evaluation.
If a human review process consumes the log, its labels and adjudication policy must be added as
separate evidence rather than inferred from `EvalResults`.

**Implemented** — Epoch reducers operate on the scored values available to them. `mean`, `median`,
`mode`, `pass_at`, and related reducers define mathematical transformations; sample count,
completed count, scorer name, reducer, and metrics are retained. They do not automatically report
confidence intervals or correct for correlated epochs.

**Opinion** — A score is a bounded claim: “this scorer, with this target and evidence, returned this
value.” An aggregate is a bounded claim about those values. Neither is a claim that the agent is
generally correct, safe, or improved outside the measured task and environment.

## E4 — optimization feedback

**Documented** — Not applicable to the traced `eval()` path. Inspect AI produces logs/results for a
task; it does not select a new prompt/program/parameter in the execution path inspected. An
external optimizer may consume the result, but that is a new evidence boundary and belongs in the
DSPy comparison rather than being attributed to Inspect AI.

## E5 — cost, capacity, and failure semantics

**Implemented** — `max_samples`, `max_tasks`, `max_subprocesses`, and `max_sandboxes` bound parallel
work. Per-sample message/token/time/working/cost/turn limits, model usage counters, and timing are
recorded. Sandbox concurrency is provider-specific and dynamically resizable through the control
surface.

**Implemented** — `retry_on_error` records intermediate `EvalRetryError` entries, removes buffered
sample events before recursively re-running the sample, and scores only the final attempt unless
`score_on_error` is enabled after retries are exhausted. `fail_on_error`, `continue_on_fail`, and
`score_on_error` separately control whether an errored sample fails the eval, is allowed to finish,
or receives a score.

**Implemented** — Cancellation preserves a structured sample error/transcript where possible and
marks the eval `cancelled`; tests cover keyboard interruption, sandbox and no-sandbox paths, and
suppression of retries for cancelled samples. A hard process crash is different: the journal/buffer
recovery path can recover flushed/completed data but cannot invent in-flight results.

**Opinion** — Retries and epochs are useful for capacity and variance questions but can repeat
non-idempotent tool/sandbox side effects. The log preserves the attempts; it does not roll back an
external side effect or prove that a retry saw the same world.

## Strongest counter-evidence

**Executed** — The most important boundary found is the local sandbox implementation: it runs
commands as the current user and ignores the requested `user`. Therefore “sandboxed evidence” does
not by itself mean least privilege or hostile-code containment. Docker/remote sandbox security,
network policy, image provenance, and model-provider retention remain outside this extraction.

**Documented** — The recovery design explicitly allows loss of unflushed/in-progress data after a
hard crash. A successful-looking partial log is therefore not evidence that every sample ran or
that the final aggregate is complete.

**Implemented** — Model-graded scores depend on a second model, prompt, grade parser, role binding,
and provider response. A parse failure is represented as unscored; a parsed grade can still be
wrong. A deterministic scorer narrows this uncertainty only for the predicate it actually checks.

**Opinion** — The selection question's “reproducible, isolated, inspectable, aggregatable” answer is
conditional: Inspect AI makes the evaluation contract and evidence explicit, but reproducibility
and isolation are properties of the pinned task plus every external provider/backend, not of the
`EvalLog` schema alone.

## Catalogue consequences (deferred to WI-028)

| Candidate | Evidence | Provisional disposition |
| --- | --- | --- |
| `bounded-agent-loop` | **Implemented** — per-sample message/token/turn/time/working/cost limits surround the solver plan and convert limit events into structured outcomes. | Candidate; compare with existing bounded-loop evidence. |
| `event-stream-not-audit-log` | **Implemented/Documented** — events describe model/tool/sandbox activity, while crash recovery can lose in-flight or unflushed data and external effects are not rolled back. | Candidate; likely distinct from a durable audit trail. |
| `isolation-boundary-declaration` | **Implemented** — sandbox provider and cleanup are explicit, but local execution is current-user subprocess execution and provider authority remains external. | Candidate; compare with sandbox/workspace patterns. |
| `deterministic-model-substitution` | **Implemented** — mock model outputs are used throughout executable tests to exercise agent/eval paths without provider calls. | Candidate; confirm whether existing catalogue wording is sufficient. |
| `typed-output-gate` | **Implemented** — `Score`, `EvalScore`, `EvalMetric`, and `EvalResults` are typed records, but typing does not validate truth. | Candidate; do not confuse schema validation with semantic correctness. |
| `replay-safe-side-effect` | **Opinion** — retry/requeue/checkpoint paths can repeat tools and sandbox work; idempotence is an application obligation. | Take as a warning only; needs cross-track comparison. |

No catalogue file or module was changed. WI-028 owns adjudication after the remaining seven
extractions.
