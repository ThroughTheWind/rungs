# Follow-on research synthesis — owners, evidence, and non-equivalent boundaries

This document closes WI-028. It compares the eight completed extractions in their three tracks,
then reconciles the overloaded vocabulary that appears across products, evaluators, optimizers, and
protocols. It is a synthesis of pinned evidence, not a ranking, benchmark, or implementation plan.
The canonical [pattern catalogue](../pattern-catalog.md) is changed only when a reconciliation row
supports an existing definition; no new catalogue entry is admitted by analogy alone.

## Method and provenance

**Documented** — The synthesis applies WI-019's [shared spine](SHARED-SPINE.md),
[product template](PRODUCT-TEMPLATE.md), [evaluation template](EVALUATION-TEMPLATE.md), and
[protocol template](PROTOCOL-TEMPLATE.md). Track comparisons come before cross-track claims.
Every source claim below is routed through one of these extraction records, each of which freezes its
own authority and read boundary:

| WI | Subject/track | Pinned authority | Extraction |
| --- | --- | --- | --- |
| WI-020 | Letta Code — durable/local product | `ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0` | [products/letta-code.md](products/letta-code.md) |
| WI-021 | Inspect AI — evaluation/optimization | `d482209d573cdde116ccf28abfb01712e91e80c` | [evaluations/inspect-ai.md](evaluations/inspect-ai.md) |
| WI-022 | Aider — durable/local product | `5dc9490bb35f9729ef2c95d00a19ccd30c26339c` | [products/aider.md](products/aider.md) |
| WI-023 | goose — durable/local product | `3810898a7447ec3299be72e223d3570a7aabf0ab` | [products/goose.md](products/goose.md) |
| WI-024 | Google ADK — durable/local product | Python `1d2d1eda3c9b795cd90ad643390f4da5a8cd27bf`; Java `2b87d65d9704a61ff4668b8c9482a79fef9fe0d4` | [products/google-adk.md](products/google-adk.md) |
| WI-025 | MCP — interoperability protocol | `4df2d6b6e3588efb46e7542d98498e5c630a0a86` | [protocols/mcp.md](protocols/mcp.md) |
| WI-026 | A2A — interoperability protocol | `1eb4aa03b07589d3a00ce7deab0dde679120ed30` | [protocols/a2a.md](protocols/a2a.md) |
| WI-027 | DSPy — evaluation/optimization | `80b118e52cb1f143a0d80d84685572000c59639e` | [evaluations/dspy.md](evaluations/dspy.md) |

**Boundary** — “Confirmed” below means that the candidate matches an existing catalogue meaning
under a comparable evidence boundary. “Track-specific” means useful vocabulary whose owner or
guarantee cannot be promoted to the shared catalogue from this corpus. “Contradicted” rejects the
candidate as a safe positive rule. No score, adoption claim, or cross-source performance claim is
introduced.

## Within-track comparison: durable/local products

| Subject | State and identity | External interaction and authority | Durable evidence/recovery | Strongest limit |
| --- | --- | --- | --- | --- |
| Letta Code | **Implemented** — agent-scoped memory roots, conversation metadata, Git-backed memory, and repository state are separate layers; parent/child sub-agent identity is explicit | **Implemented** — child launch carries a continuation envelope and cross-agent permissions are guarded; unrestricted launch policy remains host-owned | **Implemented** — memory commits return a revision; prompt compilation projects metadata but is not a checkpoint or complete audit | Git-backed memory is not truth, rollback, or human accountability; sync conflicts and external effects remain ambiguous ([WI-020](products/letta-code.md#10-catalogue-consequence)) |
| Aider | **Implemented** — repository context, file edits, Git state, and chat history remain distinct; exact paths/search-replace anchors scope mutation | **Implemented** — model-facing edits are confirmed/validated, commits are visible, and hooks/tests report results; shell/repository authority remains local | **Implemented** — a commit hash is a durable candidate and `/undo` exposes reversal; lint/test output is returned to chat | Repeated shell/test/commit effects are not exactly-once; user review and idempotence remain workflow obligations ([WI-022](products/aider.md#catalogue-consequences-deferred-to-wi-028)) |
| goose | **Implemented** — session id reloads state-machine steps; working directory and extension context are session-scoped | **Implemented** — MCP delegates capability, ACP delegates loop ownership, and action-required messages persist approval/denial; defaults do not create a general sandbox | **Implemented** — recipe/session metadata and ACP context markers support restart and rollback around cancellation | Optional macOS sandboxing is not a cross-platform default; neighbour is a useful analogy, not proof of shared state ([WI-023](products/goose.md#candidate-pattern-consequences-deferred-to-wi-028)) |
| Google ADK | **Implemented** — session append/reload, branch/isolation scope, task-call ids, and confirmation events separate runtime continuity from delegated state | **Implemented** — confirmation is keyed to a function-call id; `RemoteA2aAgent` maps a remote protocol into local events; authentication is not implied | **Implemented** — events, EvalSet/metric results, migration metadata, and compatibility windows are distinct artifacts | Cross-language parity confirms contract intent, not production equivalence; schema migration and session storage remain application/runtime boundaries ([WI-024](products/google-adk.md#candidate-pattern-consequences-deferred-to-wi-028)) |

**Within-track conclusion — Opinion** — The product subjects converge on explicit ownership and
durable boundaries, but not on one “session” or “memory” primitive. Letta's agent-owned memory,
Aider's repository candidate, goose's session isolation, and ADK's event/confirmation model are
commensurable as *boundary declarations*; their state stores and recovery guarantees are not
interchangeable.

## Within-track comparison: evaluation and optimization

| Subject | Evaluation contract | Optimization/runtime relation | Evidence and reproducibility | Strongest limit |
| --- | --- | --- | --- | --- |
| Inspect AI | **Implemented/Documented** — task, solver, scorer, samples, typed scores, logs, and aggregates are separate owners | **Implemented** — solver limits and sandbox outcomes bound a run; evaluation consumes a program rather than rewriting it | **Implemented** — logs/transcripts and typed results support inspection; mocks substitute model calls in tests | Crash/retry paths can lose in-flight data or repeat external effects; events are not automatically an audit log ([WI-021](evaluations/inspect-ai.md#strongest-counter-evidence)) |
| DSPy | **Implemented** — `Evaluate` applies a caller metric to a devset, retains row results, and aggregates scores | **Implemented** — `ReAct` emits a trajectory; `BootstrapFewShot` accepts metric-passing traces as demos and marks a compiled student | **Implemented** — JSON/PKL/program artifacts record state and dependency versions; deterministic `DummyLM` tests bound local behavior | One trainset supplies teacher traces and leftover demos; no required held-out set, uncertainty estimate, provider seed, or cost ledger ([WI-027](evaluations/dspy.md#reproducibility-leakage-and-cost)) |

**Within-track conclusion — Opinion** — Inspect AI is primarily an evidence-producing evaluator;
DSPy is an optimizer whose metric changes a program artifact. Their typed scores, logs, and limits
are comparable as evaluation-contract fields, but a score from one cannot prove the other's
optimization claim. Both reject the shortcut “a passing score is a trustworthy general improvement.”

## Within-track comparison: interoperability protocols

| Subject | Authority and discovery | Lifecycle and result | Identity, trust, and delivery | Strongest limit |
| --- | --- | --- | --- | --- |
| MCP | **Normative** — versioned schema/specification defines initialize/version/capability negotiation and client/server roles | **Normative** — tools, resources, prompts, sampling, elicitation, progress/cancellation, and structured errors cross a session/transport | **Normative** — hosts own user authority, roots, tokens, and model decisions; negotiated features are not proof of implementation safety | Transport and capability contracts do not define application identity, consent UI, or exactly-once side effects ([WI-025](protocols/mcp.md#compatibility-and-evolution)) |
| A2A | **Normative** — Agent Card selects interface, version, capabilities, security declaration, and optional signature | **Normative** — Message may create a Task; task states, streamed/push updates, artifacts, cancellation, and continuation are explicit | **Normative** — server authenticates/authorizes and scopes visibility; context/task ids are opaque; duplicate push and disconnect are possible | `AUTH_REQUIRED` is not a grant; task history/streams and webhook delivery are not complete audit or exactly-once guarantees ([WI-026](protocols/a2a.md#authentication-authorization-and-trust-boundaries)) |

**Within-track conclusion — Opinion** — MCP and A2A are commensurable at the level of negotiated
capability, explicit lifecycle, error, and trust boundaries. They are not substitutes: MCP centers
host-mediated capabilities and context; A2A centers independent-agent task ownership and artifacts.
Normative text establishes requirements, not conformance of an arbitrary implementation.

## Cross-track boundary table

| Term | Product meaning | Evaluation meaning | Protocol meaning | Synthesis result |
| --- | --- | --- | --- | --- |
| State | Session stores, Git commits, memory files, event rows | Run/sample status, checkpoints, typed scores, compiled demos | Task state, protocol session, capability/version state | **Not commensurable** — owner, retention, and replay semantics differ |
| Session | Letta/goose/ADK continuity identity, often with filesystem or event scope | Inspect run context or DSPy in-memory call/compile context | MCP connection/session or A2A context/task grouping | **Analogy only** — shared name, different lifecycle and authority |
| Memory | Agent-owned files/metadata versus repository/documentary state | Prompt examples, traces, logs, and evaluator evidence | Protocol messages/resources/artifacts carried across a boundary | **Not commensurable** — persistence and truth claims are different |
| Handoff | Child/remote loop ownership plus continuation envelope or ACP context | Solver execution or compiled-program transition | A2A task/message delegation; MCP capability call | **Commensurable boundary only** — ownership and state crossing must be stated |
| Tool | Product extension/provider capability with local permissions | Solver tool call or mocked model/tool execution | MCP tool; A2A opaque remote capability | **Analogy only** — transport, authority, and result semantics differ |
| Approval | Product UI/action-required/confirmation event bound to a call | Usually a scorer/limit outcome, not human authority | MCP human-in-the-loop guidance; A2A `AUTH_REQUIRED` state | **Not commensurable** — a pending state is not authenticated authority |
| Trace/log | Product messages, events, Git history, memory commit | Transcript, sample evidence, score rows, optimizer trace | Task history, status/artifact events, protocol errors | **Not commensurable** — an event stream is not automatically audit/accountability |
| Result/artifact | Commit, recipe output, event, memory revision | Score, transcript, compiled state, CSV/JSON table | MCP result/content; A2A Artifact and status event | **Commensurable output boundary only** — durability and replay must be named |
| Identity | Agent/session/repository/user/child ids | Run, sample, task, scorer, model/provider ids | Client/server, Agent Card, context/task/message ids | **Not commensurable** — identifiers do not transfer trust or ownership by themselves |
| Ownership | Who may mutate memory, repository, session, or continuation | Who owns metric, dataset, model call, artifact, and test set | Client/server/host/agent/transport responsibility | **Commensurable as a required field** — the concrete owner remains track-specific |

**Contradiction — Opinion from equivalent boundaries** — None is claimed between equivalent
normative/implemented statements. The apparent contradictions (“session is durable” versus “session
is in-memory”, or “approval is authentication” versus “approval is a pending state”) disappear once
the owner and evidence type are restored; treating them as one claim would be a category error.

## Candidate adjudication

Each row below is one candidate from exactly one extraction. The evidence column links to the
extraction's pinned catalogue-consequence section; the provenance register above supplies the full
SHA and authority type.

### WI-020 — Letta Code

| Candidate | Verdict | Evidence and reason |
| --- | --- | --- |
| `session-handoff` | confirmed | **Implemented** — [WI-020](products/letta-code.md#10-catalogue-consequence) shows narrative metadata/prompt projection; it confirms the catalogue warning that this is not a machine checkpoint. |
| `prompt-writes-artifact` | confirmed | **Implemented** — Letta's Git memory commit returns author/revision; this matches the existing durable-artifact definition, without claiming truth or rollback. |
| `ownership-changing-handoff` | confirmed | **Implemented** — child tags, continuation envelope, and statelessness make continuation ownership explicit; host launch policy stays outside the pattern. |
| `replay-safe-side-effect` | confirmed | **Implemented** — sync conflict/retry evidence supports the existing warning that persistence is not exactly-once external effect. |
| `candidate: memory-layer-separation` | track-specific | **Implemented** — useful Letta vocabulary for conversation metadata, prompt state, memory files, and repository state; this corpus does not establish one universal memory API. |
| `candidate: agent-memory-ownership` | track-specific | **Implemented** — agent-scoped roots and cross-agent denial are strong product evidence, but not a cross-track guarantee for protocols or evaluators. |

### WI-021 — Inspect AI

| Candidate | Verdict | Evidence and reason |
| --- | --- | --- |
| `bounded-agent-loop` | confirmed | **Implemented** — [WI-021](evaluations/inspect-ai.md#catalogue-consequences-deferred-to-wi-028) records per-sample message/token/turn/time/working/cost limits; this confirms the existing bounded-loop definition. |
| `event-stream-not-audit-log` | confirmed | **Implemented/Documented** — Inspect events and crash-loss behavior match the catalogue warning that events are inputs to audit, not accountability by themselves. |
| `isolation-boundary-declaration` | confirmed | **Implemented** — sandbox provider/cleanup and current-user subprocess authority reinforce the existing isolation-boundary definition. |
| `deterministic-model-substitution` | confirmed | **Implemented** — mock model outputs exercise agent/evaluation paths; this confirms substitution as bounded test evidence, not provider equivalence. |
| `typed-output-gate` | confirmed | **Implemented** — typed `Score`/`EvalScore`/`EvalMetric`/`EvalResults` confirm structure-versus-truth separation. |
| `replay-safe-side-effect` | confirmed | **Opinion grounded in implementation** — retry/requeue/checkpoint paths can repeat tools; this confirms the catalogue warning, not a guarantee of idempotence. |

### WI-022 — Aider

| Candidate | Verdict | Evidence and reason |
| --- | --- | --- |
| `narrow-anchor` | track-specific | **Implemented** — Aider's path and exact search/replace controls are a code-edit product mechanism; they support the broader `narrowest-anchor-loop` without warranting a second generic id. |
| `structural-gate` | confirmed | **Implemented** — dirty-file/ignored-file/commit verification gates repository mutation and fits the existing structural-gate meaning. |
| `land-candidate` | track-specific | **Implemented** — an automatic Git commit is a useful repository candidate, but “land” depends on this product's review/undo workflow and is not a universal completion state. |
| `agent-facing-interface` | confirmed | **Implemented** — commit results, lint/test output, and edit errors are model-visible bounded artifacts, matching the catalogue interface definition. |
| `prompt-writes-artifact` | confirmed | **Implemented** — model response → exact edit → commit hash is a direct confirmation of the durable-prompt-artifact pattern. |
| `replay-safe-side-effect` | confirmed | **Opinion grounded in implementation** — retries can repeat shell/tests/commits; this confirms the existing warning and keeps review/idempotence explicit. |

### WI-023 — goose

| Candidate | Verdict | Evidence and reason |
| --- | --- | --- |
| `session-isolation` | track-specific | **Implemented** — session id reload and working-directory context are strong goose behavior, but the shared catalogue already expresses session ownership without adopting this storage design. |
| `confirmation-gate` | confirmed | **Implemented** — inspection, `goose.executable`, action-required messages, and persisted allow/deny confirm a gate while leaving identity/authentication outside it. |
| `protocol-escape-hatch` | confirmed | **Implemented** — MCP/ACP preserve a Goose loop while delegating capability or loop ownership, matching `protocol-with-escape-hatch`. |
| `agent-facing-interface` | confirmed | **Implemented** — provider errors, tool results, approvals, notifications, and recipe output are represented as bounded messages/events. |
| `handoff` | confirmed | **Implemented** — ACP context marker commits after completion and rolls back on cancellation/refusal; this is a concrete ownership-changing handoff. |
| `neighbour` | track-specific | **Opinion** — adjacent ACP/MCP identities are useful vocabulary, but addressability is not proof of shared state or a universal neighbour contract. |

### WI-024 — Google ADK

| Candidate | Verdict | Evidence and reason |
| --- | --- | --- |
| `session-isolation` | track-specific | **Implemented** — branch/isolation scopes and task-call ids constrain delegated visibility, but do not define the same session primitive as goose or Letta. |
| `confirmation-gate` | confirmed | **Implemented** — persisted function-call-id confirmation and resumed invocation confirm request-bound approval; they do not establish authentication or safe execution. |
| `schema-evolution` | track-specific | **Implemented** — v0 pickle/v1 JSON migration and compatibility windows are an ADK persistence contract, not a universal agent pattern from this corpus. |
| `evaluation-boundary` | track-specific | **Implemented** — EvalSet/inference/metric results are distinct from runtime events; this is useful within the evaluation track, not a cross-track score guarantee. |
| `protocol-escape-hatch` | confirmed | **Implemented** — `RemoteA2aAgent` maps external protocol behavior into local events, confirming the escape-hatch boundary while WI-026 owns protocol meaning. |

### WI-025 — MCP

| Candidate | Verdict | Evidence and reason |
| --- | --- | --- |
| `protocol-escape-hatch` | confirmed | **Normative** — [WI-025](protocols/mcp.md#candidate-pattern-consequences-deferred-to-wi-028) defines JSON-RPC/stdio/HTTP capability transport across process/network boundaries. |
| `capability-negotiation` | track-specific | **Normative** — initialize/version/capability negotiation is central MCP vocabulary; A2A has analogous cards, but this corpus does not justify a transport-neutral catalogue id. |
| `confirmation-gate` | confirmed | **Normative** — MCP recommends human deny paths while leaving UI and identity to the application; this confirms the catalogue's non-authentication warning. |
| `agent-facing-interface` | confirmed | **Normative** — tools/list/call, resources, prompts, sampling, elicitation, and errors are structured interfaces with named sides. |
| `external-authority` | confirmed | **Normative** — roots, authorization, sampling, and elicitation assign filesystem, token, model, and user decisions to explicit owners, matching the existing `external-authority-precedence` definition. |

### WI-026 — A2A

| Candidate | Verdict | Evidence and reason |
| --- | --- | --- |
| `handoff` | confirmed | **Normative** — [WI-026](protocols/a2a.md#candidate-pattern-consequences-deferred-to-wi-028) transfers task/context identity across an opaque-agent boundary without transferring internal state. |
| `neighbour` | track-specific | **Normative** — Agent Cards, Messages, Tasks, Artifacts, and declared capabilities make independent agents addressable, but the current catalogue has no generic neighbour id; addressability is retained as protocol vocabulary. |
| `explicit-output` | confirmed | **Normative** — Artifacts are named task outputs that may stream/append; this confirms explicit output designation while delivery durability remains separate. |
| `confirmation-gate` | confirmed | **Normative** — `AUTH_REQUIRED` delegates an authorization request but explicitly does not grant credentials or consent. |
| `audit-trail` | track-specific | **Normative** — task ids/timestamps/history aid traceability, but incomplete history and duplicate/lost delivery prevent a general audit-trail guarantee; the catalogue's event-stream warning is the safer mapping. |
| `protocol-escape-hatch` | confirmed | **Normative** — JSON-RPC/gRPC/HTTP bindings carry one abstract task model across process/network boundaries, confirming the escape-hatch boundary. |

### WI-027 — DSPy

| Candidate | Verdict | Evidence and reason |
| --- | --- | --- |
| `evidence` | track-specific | **Implemented** — [WI-027](evaluations/dspy.md#candidate-pattern-consequences-deferred-to-wi-028) retains example/prediction/metric rows and a ReAct trajectory; the catalogue has no generic `evidence` id, and retention/provenance remain the deciding boundary. |
| `semantic-gate` | track-specific | **Implemented** — a caller metric selects demonstrations, but metric validity is application-owned and not a universal semantic truth gate. |
| `bounded-loop` | confirmed | **Implemented** — ReAct `max_iters`, Bootstrap rounds/demo limits, and executor max errors confirm the existing `bounded-agent-loop` meaning. |
| `explicit-output` | confirmed | **Implemented** — compiled state/demos and optional CSV/JSON results are explicit artifacts, with data/credentials/external effects excluded. |
| `structural-gate` | confirmed | **Implemented** — matching predictor structure and `_compiled` state confirm structural compatibility as a separate gate from correctness. |
| `test-substitution` | contradicted | **Opinion rejected by the pinned evidence** — a metric can select a trace without an independent held-out test; treating optimization feedback as test substitution would reverse the extraction's leakage warning. |

## Catalogue reconciliation and downstream boundary

**Opinion** — No edit to `pattern-catalog.md` is warranted by these rows. Confirmed candidates map
to existing definitions (`bounded-agent-loop`, `event-stream-not-audit-log`, `agent-facing-interface`,
`external-authority-precedence`, `ownership-changing-handoff`, `prompt-writes-artifact`,
`protocol-with-escape-hatch`, `structural-gates`, `typed-output-gate`, `explicit-output-designation`,
and the `resumable-approval-state`/`approval-bound-to-request` pair). The
track-specific candidates are deliberately not promoted: doing so would turn one product's storage
or one protocol's lifecycle into a guarantee for another track. The single contradicted candidate,
`test-substitution`, is retained as a warning in the DSPy extraction and is not added to the catalogue.

**Boundary** — No module or CLI change follows from this synthesis. Existing [WI-029](../../backlog/items/WI-029-apply-framework-patterns-to-modules.md)
remains the only implementation-facing follow-up and is not silently expanded; any future adoption
of follow-on evidence must be a separately planned work item with its own catalogue/ADR decision.

## Findings and final conclusions

1. **Confirmed across tracks — Opinion.** Explicit ownership, bounded loops, structured outputs,
   and evidence retention recur, but only when the owner and guarantee are carried with the noun.
2. **Track-specific — Implemented/Normative.** Durable memory/session stores, evaluator scores and
   compiled demos, MCP capabilities, and A2A tasks/artifacts cannot be merged into one state model.
3. **Contradicted shortcut — Opinion.** A metric or event stream is not a held-out test or audit
   trail merely because it is durable or typed.
4. **Strongest counter-evidence — Implemented/Normative.** Letta memory commits, Inspect crash
   recovery, DSPy trainset reuse, MCP host authority, and A2A duplicate delivery each leave a
   different unrecovered boundary. No subject supplies a universal exactly-once, authenticated,
   human-accountable agent loop.

The synthesis therefore confirms the catalogue's boundary-first vocabulary, keeps new nouns
track-specific unless a current definition already covers them, and closes without changing
`modules/`, CLI code, or the canonical catalogue.
