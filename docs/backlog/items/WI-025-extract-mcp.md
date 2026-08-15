---
id: WI-025
title: Extract MCP — the tool and context interoperability boundary
type: docs
status: planned
branch:
created: 2026-08-15
updated: 2026-08-15
related: [WI-013, WI-017, WI-019, WI-023, WI-026, WI-028]
epic: WI-018
children: []
---

## Proposal (rationale)

The framework corpus follows tools through in-process declarations and adapters, but rungs also
targets harnesses whose tools, prompts, and resources arrive across a process or network boundary.
Without studying that protocol boundary, catalogue language about tools and skills risks assuming
shared memory, shared trust, or shared lifecycle that does not exist between a client and server.

The [Model Context Protocol specification repository](https://github.com/modelcontextprotocol/modelcontextprotocol)
is selected as the normative subject. The question is not which products support MCP; it is what
the protocol makes explicit about discovery, capability negotiation, lifecycle, identity, errors,
human input, cancellation, and trust, and what it deliberately leaves to hosts and applications.

## Decision

`accepted` — 2026-08-15. Captured as the tool/context protocol child of
[WI-018](WI-018-follow-on-public-agent-research.md), after WI-019.

## Plan

### Requirements

- Pin specification repository SHA, licence, protocol version, date, schema files, and read boundary.
- Identify the normative authority at that pin and label documentation, examples, generated
  schemas, and implementation tests according to what each can prove.
- Trace one connection from lifecycle or per-request negotiation through capability discovery,
  one tool call, result/error return, progress or cancellation, and shutdown or stateless completion.
- State the identity, authorization, consent, roots/filesystem, secret, sampling, and elicitation
  responsibilities assigned to client, server, transport, and application.
- Record version negotiation, deprecation, and compatibility semantics, including failure when
  capabilities or versions do not align.
- If an official SDK or conformance suite is needed to establish executable behaviour, pin it as a
  separate source; never present SDK behaviour as a normative requirement without the specification.

### Impacts

- One interoperability-protocol extraction and index row.
- Candidate evidence for agent-facing interfaces, protocol escape hatches, external authority,
  capability negotiation, permissions, and failure propagation; WI-028 adjudicates.

### Approach

Read the normative schema and specification before any SDK. Follow one narrow tool-call path and
use resources, prompts, sampling, or elicitation only where they change ownership or human-authority
boundaries. Record protocol-version transitions as retired or superseded practice rather than
silently describing only the survivor.

### Acceptance criteria / tests

1. Snapshot identifies the exact normative version and every separately pinned implementation source.
2. One request lifecycle is traced across client, server, transport, and application responsibilities.
3. Required, optional, negotiated, deprecated, and application-policy behaviours are visibly distinct.
4. Trust and human-authority claims state what the protocol enforces versus merely carries.
5. The strongest compatibility or security counter-example is recorded; catalogue changes wait for WI-028.
6. `rungs check` and site links pass.

### Out of scope

- Surveying MCP servers, registries, or product adoption.
- Security auditing any particular third-party server.
- Treating one SDK's convenience API as the protocol definition.
- Comparing MCP with A2A inside this extraction; that belongs to WI-028.
- Catalogue, module, or CLI changes.

## Execution

Not started.

## Review

Not started.
