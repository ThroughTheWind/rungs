# MCP — the negotiated tool and context boundary

This extraction answers WI-025's protocol question: which lifecycle, capability, tool, progress,
cancellation, human-input, identity, and trust responsibilities cross the MCP client/server
boundary. It treats the versioned specification and schema as normative evidence. It does not
audit a server, infer product adoption, or compare MCP with A2A; WI-028 owns cross-protocol
synthesis.

## Snapshot, authority, and read boundary

**Measured** — The normative source is the public [Model Context Protocol specification repository](https://github.com/modelcontextprotocol/specification/tree/4df2d6b6e3588efb46e7542d98498e5c630a0a86)
at commit `4df2d6b6e3588efb46e7542d98498e5c630a0a86`, read 2026-08-15. `git describe --tags
--always` reports `2026-07-28-87-g4df2d6b6`; the full SHA, rather than that abbreviated
description, freezes this read boundary.

**Measured** — The bounded checkout measurement was:

```text
git -C C:\Temp\rungs-follow-on-20260815\mcp-spec ls-files
  945 tracked files
  433 Markdown/MDX files
  274 JSON files
```

The counts describe tracked paths at the pinned commit. They do not measure SDK coverage, server
quality, transport performance, security, or ecosystem adoption.

**Normative** — This extraction selects the versioned `docs/specification/2025-11-25/` pages and
`schema/2025-11-25/schema.ts` as the protocol contract. The stable overview says all
implementations **MUST** support the base protocol and lifecycle; other components are optional
by application need. The TypeScript schema is named the source of truth, with the JSON schema
generated from it ([overview](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/basic/index.mdx),
[TypeScript schema](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/schema/2025-11-25/schema.ts),
[JSON schema](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/schema/2025-11-25/schema.json)).

**Normative** — The repository's [LICENSE](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/LICENSE)
records a licensing transition: new code and specification contributions are Apache-2.0,
documentation excluding specifications is CC-BY-4.0, and some earlier contributions remain MIT.
The selected versioned specification is therefore cited as the repository's specification work,
while the licence notice is not treated as a claim that every historical file has one licence.

**Documented** — `docs/specification/draft/` and the versioned `2026-07-28` directory are present
at the same commit but are outside this normative read boundary. Draft or later-version text can
show evolution, but it is not silently substituted for `2025-11-25`. No SDK or conformance suite
was needed to establish the selected protocol requirements, so no separate implementation source
is claimed.

## One request lifecycle: initialize, discover, call, report, stop

**Normative** — MCP messages are JSON-RPC 2.0 requests, responses, and notifications. Requests
carry a non-null string/integer id unique to the requestor's session; responses echo that id;
notifications carry no id and receive no response. Protocol errors use the JSON-RPC `error` object;
successful operations use `result` ([base message rules](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/basic/index.mdx)).

**Normative** — Initialization must be the first client/server interaction. The client sends
`initialize` with a supported protocol version, client capabilities, and implementation info. The
server responds with its selected version, capabilities, server info, and optional instructions;
the client then sends `notifications/initialized`. Before that notification, normal requests are
not allowed (apart from narrowly permitted ping/logging behavior). Both sides must use only the
negotiated version and capabilities ([lifecycle](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/basic/lifecycle.mdx)).

**Normative** — Version negotiation is asymmetric but explicit: the client should offer its latest
supported version; the server echoes it when supported or chooses another version it supports. If
the client cannot support the server's response, it should disconnect. For HTTP, every subsequent
request carries `MCP-Protocol-Version`; a missing header can be treated as `2025-03-26` for
backwards compatibility. The `2024-11-05` HTTP+SSE transport is deprecated in favor of Streamable
HTTP ([transport version header and compatibility](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/basic/transports.mdx)).

**Normative** — A tool-capable server declares the `tools` capability. The client calls
`tools/list` to discover tool names, descriptions, input/output schemas, annotations, and optional
pagination/caching metadata. The client calls `tools/call` with the discovered name and arguments.
The server returns content and optionally structured content; an output schema constrains server
results and clients should validate them ([tools](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/server/tools.mdx)).

**Normative** — Tool failures have two distinct surfaces. A malformed/unknown request is a JSON-RPC
protocol error; a valid call whose execution fails returns a normal result with `isError: true`.
Clients should expose tool execution errors to the model for possible self-correction, while
protocol errors are less likely to be recoverable. This distinction keeps request-shape failure
separate from the server's business or external-API failure.

```text
initialize -> initialized
  -> tools/list (capability-gated discovery)
  -> tools/call(name, arguments)
  -> complete result OR isError=true OR input_required result
  -> optional progress/cancellation/elicitation rounds
  -> JSON-RPC response or transport shutdown
```

**Normative** — The server may return an `InputRequiredResult` for a multi-round tool call. The
client retries with `inputResponses` and optional opaque `requestState`, using a fresh JSON-RPC id.
This is a protocol-level continuation, not a promise that a server's external side effects are
transactional ([tools multi-round section](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/server/tools.mdx)).

## Transport, identity, and shutdown

**Normative** — stdio launches the server as a child process; newline-delimited UTF-8 JSON-RPC is
read from stdin and written to stdout, while stderr is optional logging and must not be treated as
the protocol. Streamable HTTP uses one MCP endpoint with POST for client messages and optional GET
SSE for server messages. A client must accept JSON and `text/event-stream`; a server may return a
single JSON response or an SSE stream and may resume a stream with `Last-Event-ID` ([transports](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/basic/transports.mdx)).

**Normative** — Streamable HTTP sessions are optional. A server may issue an
`MCP-Session-Id`; if it does, the client must send it on later requests, a server may terminate
the session with 404, and the client must initialize a new session. The id should be globally
unique and cryptographically secure; session ids and event cursors are transport/session identity,
not user identity or proof of authorization.

**Normative** — Disconnect is not cancellation. A client that wants to cancel an in-progress
request sends `notifications/cancelled` for a request id it believes is still active. Receivers
should stop work and free resources, but races permit completion before cancellation arrives; late
responses may be ignored. Task-augmented requests use `tasks/cancel` instead ([cancellation](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/basic/utilities/cancellation.mdx)).

**Normative** — Progress is opt-in. A sender includes a unique active `progressToken`; the receiver
may emit increasing progress values and an optional total/message, and must stop notifications
after completion. Progress is observability, not a commit or lease. Implementations should bound
timeouts even when progress arrives ([progress](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/basic/utilities/progress.mdx),
[lifecycle timeouts](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/basic/lifecycle.mdx)).

**Normative** — Shutdown has no MCP close message. stdio uses stream close and process termination
with bounded escalation; HTTP closes its associated connections. The transport owns delivery and
process/socket teardown; the application owns whether an in-progress tool side effect can be
stopped or compensated.

## Capability ownership and human authority

| Boundary | Normative protocol responsibility | Deliberately left to host/application policy |
| --- | --- | --- |
| Client | Initiates lifecycle, advertises capabilities, discovers/calls tools, presents server requests, and may expose roots/sampling/elicitation | User identity, UI, approval policy, model choice, local filesystem enforcement |
| Server | Declares server capabilities, serves tools/resources/prompts, validates inputs, returns protocol/tool errors, and may request client features only when negotiated | Business authorization, side-effect rollback, data governance, model/provider trust |
| Transport | Carries JSON-RPC, enforces stream/header/session rules, and signals disconnect | Network perimeter, process sandbox, TLS deployment, OS privileges |
| Authorization server | For optional HTTP auth, discovers/ authenticates resource owners and issues tokens | Identity proofing, account policy, consent UX implementation |
| Application/host | Mediates model use, user consent, secrets, roots, and tool display | The protocol does not make a host's UI or policy safe by itself |

**Normative** — Tools are model-controlled in the interaction model, but the protocol does not
mandate a particular UI. The tools page says applications should keep a human able to deny tool
invocations, show exposed tools and inputs, and present confirmations. Tool annotations are
untrusted unless they come from a trusted server. Therefore a declared tool name, description,
annotation, or schema is not an authorization decision.

**Normative** — Roots are client-provided `file://` URIs that tell servers which workspace roots
the client intends to expose. The client advertises `roots`, answers `roots/list`, and sends
`notifications/roots/list_changed` when the list changes. Roots communicate boundaries but do not
enforce filesystem access; clients must validate URIs and access controls, and servers should
respect roots ([roots](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/client/roots.mdx)).

**Normative** — Sampling lets a server request an LLM generation from the client, keeping model
access and permissions on the client side. Sampling is capability-gated; tool-enabled sampling
requires `sampling.tools`. The specification recommends a human review/deny path and says the
client can edit prompts and review tool calls/results. It does not grant a server the client's
model credentials or make the returned generation trusted ([sampling](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/client/sampling.mdx)).

**Normative** — Elicitation lets a server request user input through the client. Form mode is
in-band structured data; URL mode sends the user to an external URL without exposing the sensitive
form contents to the MCP client. Servers must not use form mode for passwords, API keys, access
tokens, or payment credentials; clients must identify the requesting server, offer decline/cancel,
and obtain consent for URL navigation ([elicitation](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/client/elicitation.mdx)).

**Normative** — Authorization is optional overall and defined for HTTP transports. HTTP
implementations should follow the MCP OAuth-based discovery and protected-resource rules; stdio
implementations should instead obtain credentials from the environment. When HTTP authorization is
used, the server validates tokens for itself and must not pass a client token through to an
upstream API. The authorization server's identity/consent implementation is outside MCP
([authorization](https://github.com/modelcontextprotocol/specification/blob/4df2d6b6e3588efb46e7542d98498e5c630a0a86/docs/specification/2025-11-25/basic/authorization.mdx)).

## Compatibility and evolution

**Normative** — Required versus optional behavior is visible in the versioned contract:

- Base JSON-RPC and lifecycle are required for every implementation.
- Tools, resources, prompts, logging, completions, roots, sampling, elicitation, tasks, and
  experimental features are capability-negotiated options.
- `MUST` is a protocol requirement; `SHOULD` is a strong recommendation with an explicit reason;
  `MAY` is permitted behavior. Application UI and policy guidance remains non-normative even when
  the specification recommends it.
- The 2024-11-05 HTTP+SSE transport is a deprecated predecessor. The 2025-11-25 Streamable HTTP
  pages describe compatibility and the fallback `MCP-Protocol-Version` behavior.

**Strongest compatibility counter-example** — A client can successfully complete `initialize`,
receive a `tools` capability, and still be unable to safely call a tool: the server may return a
valid but untrusted tool annotation, the root list may be only advisory, the user's approval may be
handled by an application outside the protocol, or an HTTP transport may be misconfigured despite
the protocol's Origin/authentication requirements. Conversely, a tool call can return
`isError: true` after valid protocol negotiation without being a protocol failure. Capability
negotiation and JSON-RPC validity are therefore not proof of authorization, sandboxing, or external
effect success.

**Not established** — The pinned repository contains a later `2026-07-28` directory and draft
work, but this extraction does not infer their final status, migration guarantees, or compatibility
with `2025-11-25`. It also does not establish any SDK's handling of cancellation, retries, roots,
or consent because no SDK was pinned or executed.

## Candidate pattern consequences (deferred to WI-028)

| Candidate | Evidence | Provisional disposition |
| --- | --- | --- |
| `protocol-escape-hatch` | **Normative** — JSON-RPC/stdio/HTTP carry negotiated requests across a process or network boundary. | Candidate; distinguish transport from capability ownership. |
| `capability-negotiation` | **Normative** — initialize declares versions/capabilities; both sides must use only negotiated features. | Candidate; reconcile with existing catalogue wording. |
| `confirmation-gate` | **Normative** — tools and sampling should provide a human deny path, but UI/identity remain application responsibilities. | Candidate with an explicit non-authentication boundary. |
| `agent-facing-interface` | **Normative** — tools/list, tools/call, resources, prompts, sampling, elicitation, and errors are structured interfaces. | Candidate; do not collapse server, client, and host authority. |
| `external-authority` | **Normative** — roots, authorization, sampling, and elicitation keep filesystem, token, model, and user decisions on named sides of the boundary. | Candidate; verify against product evidence in WI-028. |

No catalogue, module, or CLI file changed. WI-026 owns full A2A semantics and WI-028 owns
cross-track reconciliation.
