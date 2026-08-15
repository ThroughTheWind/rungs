# Durable/local product track template

Use with [the shared spine](SHARED-SPINE.md) for Letta Code, Aider, goose, and Google ADK. This
track admits **Implemented**, **Executed**, **Measured**, **Documented**, and **Opinion** claims.
Protocol text consumed by a product may be labelled **Normative** only for what that protocol
requires, never as evidence that the product conforms.

## P1. Default product path

Trace one default user request from ingress through model/runtime decisions, external actions,
observations, durable writes, caller-facing output, and termination. Put optional backends,
extensions, delegation, and hosted-only behaviour in separate paths.

Required questions:

- Which component owns the loop and terminal state?
- Where do commands run, and which host surfaces cross that boundary?
- Which artifact remains when the happy path, process, or external action fails?
- Which test executes the default path rather than only constructing its components?

## P2. Continuity-layer matrix

Complete all five shared-spine state rows. For each applicable layer additionally record:

| Layer | User or agent can write? | Retrieval/selection rule | Scope and isolation | Forget/delete path | Survives |
| --- | --- | --- | --- | --- | --- |
| Conversation history | | | | | `{{turn / process / machine / account}}` |
| Recovery state | | | | | |
| Documentary intent | | | | | |
| Repository state | | | | | |
| Agent-managed long-term memory | | | | | |

Do not infer long-term memory from a conversation store, embeddings from a search API, learning from
persistence, or identity isolation from a generated id. Trace the write and read paths.

## P3. Repository change and validation

Where the product edits a repository, trace context selection → proposed edit → filesystem write →
validation → diff/commit/revert. Record Git/worktree semantics separately from process, filesystem,
credential, and network isolation. If repository change is not a product concern, mark this section
not applicable with the reason.

## P4. Extension and evolution boundary

Trace one extension, plugin, tool protocol, sub-agent, or public-language binding from discovery to
invocation and failure. Separate stable public contract, capability negotiation, compatibility
policy, and current implementation. For multi-language subjects, show whether tests establish
semantic parity or only similar surface names.

## Product counter-evidence prompt

Search for the shortest path that bypasses the proposed durability, isolation, validation, or
extension boundary. A documented feature with no implementation/test evidence and an optional path
mistaken for the default are first-class counter-findings.
