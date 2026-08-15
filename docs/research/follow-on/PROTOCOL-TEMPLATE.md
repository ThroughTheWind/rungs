# Interoperability protocol track template

Use with [the shared spine](SHARED-SPINE.md) for MCP and A2A. This track admits **Normative**,
**Implemented**, **Executed**, **Measured**, **Documented**, and **Opinion** claims, but their
authorities never collapse into one another. Pin the normative specification and each inspected
reference implementation separately.

## R1. Authority table

Every load-bearing protocol claim is classified before comparison:

| Claim | Authority class | Requirement level or status | Evidence | What remains application policy |
| --- | --- | --- | --- | --- |
| `{{claim}}` | `{{normative requirement / optional capability / reference implementation / application policy}}` | `{{MUST / SHOULD / MAY / negotiated / implementation choice}}` | `{{pinned spec or source/test}}` | `{{authorization, storage, UI, deployment, etc.}}` |

- **Normative requirement:** cite the versioned specification at the pinned commit and preserve its
  requirement level.
- **Optional capability:** show how support is advertised, negotiated, discovered, or rejected.
- **Reference implementation:** describe only the pinned implementation and its executable tests;
  do not promote its choices into protocol requirements.
- **Application policy:** name the host-owned decision instead of calling the protocol incomplete
  for deliberately leaving it open.

## R2. Discovery, identity, and version negotiation

Trace endpoint/peer discovery, participant and request/task identity, capability advertisement,
version selection, extension namespaces, and incompatibility handling. Record which identities are
stable across reconnect/retry and which authenticate or authorize an actor rather than merely
correlate messages.

## R3. Lifecycle and state machine

Describe valid request, session, task, stream, cancellation, completion, and failure transitions.
For resumable or long-running operations, trace durable identity, status retrieval, reconnect,
deduplication, and terminal-state rules. Distinguish protocol state from a reference server's
storage choice.

## R4. Messages, content, and artifacts

Trace schema validation, content types, tool/context payloads, artifacts, partial/streamed results,
ordering, size/truncation, and error shapes. Record which fields are opaque application content and
which have normative semantics.

## R5. Effects, retries, and cancellation

Follow one effect-bearing request through timeout, retry, cancellation, duplicate delivery, and
late result. State whether the specification defines idempotency or only correlation, and what an
implementation must do with an ambiguous outside-world effect.

## R6. Trust and human authority

Separate transport security, peer authentication, authorization, credential forwarding, consent,
delegation, approval binding, and audit retention. A protocol identity or signed transport does not
by itself establish that a human authorized the exact action.

## R7. Conformance and extension evidence

Locate normative examples, schemas, conformance suites, compatibility tests, and extension rules.
State what each can prove. Passing one reference suite is evidence about the tested surface, not
universal interoperability or secure application policy.

## Protocol counter-evidence prompt

Search for a normative-sounding claim that is optional, a reference behaviour absent from the
specification, an identifier mistaken for authentication, or retry/cancellation text that leaves
effect outcome ambiguous.
