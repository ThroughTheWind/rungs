# A2A — opaque-agent discovery, task ownership, and artifact delivery

This extraction answers WI-026's bounded question: what survives when one independently operated,
opaque agent discovers another, authenticates, submits work, receives progress/artifacts, and
reaches a terminal task state. It follows the protocol track template. It is not an SDK audit,
production identity-provider audit, or comparison with MCP; WI-028 owns cross-protocol synthesis.

## Snapshot and normative authority

**Measured** — The source is the public [a2aproject/A2A repository](https://github.com/a2aproject/A2A/tree/1eb4aa03b07589d3a00ce7deab0dde679120ed30)
at commit `1eb4aa03b07589d3a00ce7deab0dde679120ed30`, read 2026-08-15. `git describe --tags
--always` reports `v1.0.1-43-g1eb4aa0`; the pinned checkout is therefore a post-tag source
snapshot. The versioned specification document identifies `1.0.0` as the latest released protocol
version at this read boundary; patch/repository tag context is not substituted for the protocol
version.

**Measured** — The bounded checkout measurement was:

```text
git -C C:\Temp\rungs-follow-on-20260815\a2a ls-files
  132 tracked files
   45 Markdown files
    1 Protocol Buffer source
    5 JSON files
```

The counts describe tracked paths at the pin. They do not measure SDK implementations, server
availability, production identity, task latency, or interoperability with non-pinned agents.

**Normative** — [`specification/a2a.proto`](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/specification/a2a.proto)
is the canonical protocol data model and request/response source. The specification says generated
JSON is a non-normative build artifact and SDKs/schemas must be regenerated from the proto. The
versioned [specification](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/docs/specification.md)
defines abstract operations, task semantics, versioning, auth responsibilities, and the JSON-RPC,
gRPC, and HTTP+JSON bindings. The repository's [LICENSE](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/LICENSE)
is Apache-2.0.

**Documented** — No SDK, TCK, sample agent, or remote endpoint was pinned or executed. The
`specification/json/` README explicitly says its generated JSON is non-normative and transient;
the proto and specification are the read boundary. Claims about “enterprise ready” are treated as
positioning unless backed by the normative requirements below.

## Agent Card discovery and interface selection

**Normative** — An A2A server must make an Agent Card available. The card describes name,
description, provider, ordered supported interfaces, protocol version, capabilities, skills,
default input/output modes, security schemes/requirements, optional tenant routing, and optional
signatures. Clients may discover it through the well-known URI
`/.well-known/agent-card.json`, a registry, or direct configuration. The first supported interface
is preferred; its URL, binding, protocol version, and tenant value are used for subsequent requests
([Agent Card requirements](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/docs/specification.md#83-protocol-declaration-requirements),
[proto AgentCard](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/specification/a2a.proto#L362-L399)).

**Normative** — The card's optional capabilities gate streaming, push notifications, extended
authenticated cards, and extensions. A client should inspect the card before using those features;
the server must return a capability error if a requested operation was not declared. An extension
marked `required` is a compatibility boundary: a client that does not declare support must be
rejected rather than silently ignoring it.

**Normative** — Cards may be signed with JWS. If signing is used, the content must be canonicalized
with JCS and clients verifying signatures must reconstruct field presence correctly; clients should
verify at least one signature before trusting a card. Signing is optional, so an unsigned card is a
discovery description, not cryptographic proof of provider identity ([card signing](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/docs/specification.md#84-agent-card-signing)).

**Normative** — A2A protocol versions are negotiated as `Major.Minor` (for example, `1.0`); patch
versions do not affect compatibility and must not be used for negotiation. Clients send
`A2A-Version` on each request, and servers process the requested major/minor or return
`VersionNotSupportedError`. The source says an empty value is interpreted as `0.3`; a client that
requires newer features should request them explicitly rather than silently falling back
([versioning](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/docs/specification.md#36-versioning)).

## One task lifecycle through the JSON-RPC binding

**Normative** — The JSON-RPC binding uses JSON-RPC 2.0 over HTTP(S), PascalCase A2A methods, and
SSE for streaming. The lifecycle below is a single bounded interaction; the remote agent's internal
memory, tools, prompts, and planning remain opaque.

```text
fetch Agent Card
  -> choose supported interface + declared auth + A2A-Version
  -> SendMessage(Message)
  -> direct Message OR Task(submitted/working)
  -> poll GetTask, SubscribeToTask, or receive push updates
  -> status/artifact updates, optional input/auth interruption
  -> completed | failed | canceled | rejected
```

**Normative** — `SendMessage` may return a direct `Message` for a simple interaction or a `Task`
for asynchronous work. With `return_immediately=false`/unset, the operation waits for a terminal
state or interrupted `INPUT_REQUIRED`/`AUTH_REQUIRED` state; with `return_immediately=true`, it
returns after task creation and the client must poll, subscribe, or use push notifications. A task
is immutable after `COMPLETED`, `FAILED`, `CANCELED`, or `REJECTED`; a refinement starts a new task
within the same context.

**Implemented in the normative model** — The proto names stable task identity (`id`), conversational
grouping (`context_id`), current `TaskStatus`, artifacts, optional history, and metadata. States
are `SUBMITTED`, `WORKING`, `COMPLETED`, `FAILED`, `CANCELED`, `INPUT_REQUIRED`, `REJECTED`, and
`AUTH_REQUIRED`. The server creates a new task id; clients treat server-generated context ids as
opaque ([Task and states](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/specification/a2a.proto#L174-L233)).

**Normative** — `SendStreamingMessage` begins with either one `Message` (then closes) or a `Task`
followed by `TaskStatusUpdateEvent` and `TaskArtifactUpdateEvent` objects. The stream must close at
a terminal state. Events must be delivered in generation order; multiple active streams receive the
same ordered events, but a stream disconnect does not change task lifecycle.

**Normative** — `GetTask` retrieves current status, artifacts, and bounded history; `ListTasks`
uses cursor pagination, returns only tasks visible to the authenticated client, and must apply
authorization scoping; `CancelTask` attempts cancellation and returns updated state, but success is
not guaranteed if work already completed or cannot be canceled. `SubscribeToTask` begins with the
current Task to avoid a polling/subscription race and ends at a terminal state.

## Artifacts, context, and continuation

**Normative** — Messages are communication turns; Artifacts are task outputs. A task artifact has a
unique id within the task, name/description, one or more parts (text, raw bytes, URL, or structured
data), and optional metadata/extensions. The specification recommends returning outputs as
artifacts rather than status messages. A `TaskArtifactUpdateEvent` can append chunks to an existing
artifact and mark the final chunk ([artifact model](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/specification/a2a.proto#L297-L359)).

**Normative** — `contextId` groups related tasks and messages. A client may continue a specific task
with `taskId`, start another task in an existing context with `contextId`, and reference prior work
with `referenceTaskIds`. Mismatched `contextId`/`taskId` is rejected; if only task id is supplied,
the agent infers the context. Context expiration and internal history policy are implementation
choices that should be documented.

**Strongest delivery limitation** — Task history is not a complete transcript guarantee. Agents may
omit transient or pre-task messages, clients may miss streamed status updates after disconnect, and
clients must not treat messages as reliable delivery for critical information. A client that needs
durable output should retrieve the terminal Task/artifacts or use a negotiated persistence mechanism;
the protocol does not make an external artifact store transactional.

## Progress, push, retries, and duplicate delivery

**Normative** — Push notification configuration registers a webhook URL, task id, optional token,
and authentication info. The agent POSTs `StreamResponse` payloads for status/artifact updates until
task completion or explicit deletion. Webhook delivery uses plain HTTP regardless of the selected
agent binding. Clients should process notifications idempotently and verify their source; agents may
retry with exponential backoff. Duplicate deliveries are therefore possible and exactly-once
delivery is not established ([push notifications](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/docs/specification.md#43-push-notification-objects)).

**Normative** — Get/List/extended-card operations are naturally idempotent. Send Message may be
idempotent when an agent uses the client-created `messageId` to detect duplicates. Cancel Task is
idempotent, although a duplicate may return `TaskNotFoundError` if the task was purged. The protocol
does not define a universal idempotency key, retry budget, deduplication store, or compensation for
an already-applied external side effect.

## Authentication, authorization, and trust boundaries

| Boundary | What A2A specifies | What remains outside the protocol |
| --- | --- | --- |
| Agent Card | Declares security schemes, scopes, interfaces, and optional signature | Authenticity unless transport trust or a verified signature is used |
| Client | Discovers requirements, obtains credentials out of band, sends them on each request, and should verify TLS/card identity | Credential issuance, user identity proofing, local secret handling |
| Server | Must authenticate every request, authorize by identity/policy, scope task visibility, and avoid leaking unauthorized-resource existence | Exact policy, tenant model, downstream permissions, revocation semantics |
| Task | Can enter `AUTH_REQUIRED` and explain required authorization | Credential scope, representation, validity, revocation, and what operation it authorizes |
| Artifact/message | Carries content and metadata across the boundary | Whether content is truthful, safe, non-sensitive, or free of prompt/data injection |

**Normative** — Production HTTP deployments must use HTTPS (gRPC uses TLS); clients should verify
the server certificate. Credentials are transmitted through binding-appropriate headers/metadata,
not as an A2A payload identity field. The server must reject invalid/missing credentials and must
not reveal whether an unauthorized task exists. Authorization is server policy and may consider
skills, actions, data rules, and scopes ([auth and authorization](https://github.com/a2aproject/A2A/blob/1eb4aa03b07589d3a00ce7deab0dde679120ed30/docs/specification.md#7-authentication-and-authorization)).

**Normative** — `AUTH_REQUIRED` is a task state, not an authorization grant. The agent must explain
what is needed, and the client may negotiate, obtain, or delegate credentials. The source explicitly
says the protocol does not define the authorization decision's scope, validity, or revocation and
that an agent must not assume the state transition authorizes a particular operation or future
messages. This is a strong boundary against treating a handoff marker as consent.

**Normative** — The media-type security section requires schema validation, sanitization of
user-provided content, file-reference validation against SSRF, auth enforcement, and protection of
sensitive history/artifacts. These are implementation obligations; they do not prove that an
arbitrary remote agent has implemented them. Prompt/data injection remains possible because the
protocol intentionally carries exchanged content without exposing internal reasoning or tools.

## Compatibility and failure semantics

**Normative** — Capability mismatches have explicit errors: unsupported streaming/push/extended-card
operations, required extension support, unsupported content types, invalid agent responses, and
unsupported versions. Generic failures separate authentication, authorization, validation, resource
not-found, and system/unavailability categories. Bindings must preserve error code/message/details
semantics; JSON-RPC maps details to `error.data` and A2A-specific codes occupy a reserved range.

**Normative** — Retry guidance is intentionally partial. Servers may include retry hints for
temporary failures and should log errors; clients must combine protocol idempotency rules with their
own retry policy. A streaming connection can be lost while the task continues, and push delivery
can duplicate or fail. The durable recovery primitive is `GetTask`/task identity, not an exactly-once
stream.

**Not established** — The pinned source contains JSON-RPC, gRPC, and HTTP+JSON binding descriptions,
but no executable server/TCK was used here to establish cross-binding equivalence. The proto says
bindings must be functionally equivalent; this extraction does not verify an SDK or remote endpoint.

## Candidate pattern consequences (deferred to WI-028)

| Candidate | Evidence | Provisional disposition |
| --- | --- | --- |
| `handoff` | **Normative** — Agent Card discovery selects a remote interface; task/context ids cross the boundary without sharing internal state. | Candidate; distinguish ownership transfer from state transfer. |
| `neighbour` | **Normative** — Opaque agents collaborate through Messages, Tasks, Artifacts, and declared capabilities. | Candidate; compare with in-process sub-agent evidence only after boundary alignment. |
| `explicit-output` | **Normative** — Artifacts are the task output unit and may stream/append chunks independently of Messages. | Candidate; include delivery gaps and artifact-store policy. |
| `confirmation-gate` | **Normative** — `AUTH_REQUIRED` delegates an authorization request to the client but does not define the credential or grant. | Candidate; never equate the state with authenticated approval. |
| `audit-trail` | **Normative** — Task ids, status timestamps, artifacts, and optional history support traceability; history/stream delivery is incomplete. | Candidate with an explicit evidence-retention boundary. |
| `protocol-escape-hatch` | **Normative** — JSON-RPC/gRPC/HTTP bindings carry one abstract task model across process/network boundaries. | Candidate; reconcile with MCP only in WI-028. |

No catalogue, module, or CLI file changed. WI-024 owns ADK's internal adapter/runtime evidence,
WI-025 owns MCP, and WI-028 owns cross-protocol reconciliation.
