---
id: WI-023
title: Extract goose — local extensibility, MCP/ACP, and session isolation
type: docs
status: in_progress
branch: feature/WI-023-extract-goose
created: 2026-08-15
updated: 2026-08-15
related: [WI-016, WI-017, WI-019, WI-025, WI-028]
epic: WI-018
children: []
---

## Proposal (rationale)

The fixed corpus is predominantly Python and treats provider, tool, and composition protocols from
inside libraries. It does not center a native local harness whose public contract spans desktop,
CLI, API, model providers, agent-client providers, MCP extensions, reusable recipes, and
session-isolated execution.

[goose](https://github.com/aaif-goose/goose) is selected to test that surface and add a Rust
implementation. The earlier `block/goose` URL currently redirects to the Agentic AI Foundation
organization; the extraction must pin and record the canonical ownership at read time rather than
silently using an obsolete URL.

## Decision

`accepted` — 2026-08-15. Accepted as the local extensibility child of
[WI-018](WI-018-follow-on-public-agent-research.md), after WI-019.

## Plan

### Requirements

- Pin canonical repository SHA, licence, date, measured scale, and the crates/UI boundary actually read.
- Trace one local request from CLI or API through provider selection, tool discovery, an MCP
  extension call, result return, session state, and user-visible control.
- Distinguish direct model providers from ACP-backed agents and MCP-backed capabilities, including
  who owns the loop and continuation in each case.
- Trace permission, confirmation, secret, environment-variable, working-directory, and optional
  sandbox boundaries.
- Examine one recipe or repeatable workflow and state what it persists, parameterizes, and isolates
  by session identity.
- Map results to skills, neighbour, handoff, session, protocol escape-hatch, and agent-facing-interface candidates.

### Impacts

- One durable/local-product extraction and index row.
- Implementation evidence that complements the normative MCP study in WI-025; neither item may
  substitute a product's behaviour for the protocol contract.

### Approach

Read the local CLI path as primary and use the desktop/API only to establish shared versus separate
runtime state. Follow one first-party or minimal test MCP extension rather than surveying the
extension ecosystem. Treat ACP as a change of loop ownership and make that boundary explicit.

### Acceptance criteria / tests

1. One request and MCP tool result are traced through named Rust symbols and executable tests.
2. Provider, ACP, and MCP roles are distinguished by ownership, state, and failure propagation.
3. Permission, secret, filesystem, and sandbox defaults are evidenced rather than inferred from UI labels.
4. One recipe/session path establishes what prevents or permits cross-run collisions.
5. Opinion is labelled; protocol and catalogue synthesis remain WI-025/WI-028; gates and site links pass.

### Out of scope

- Auditing third-party MCP extensions or provider implementations.
- Comparing model quality or extension popularity.
- Treating optional macOS sandbox behaviour as the cross-platform default.
- Catalogue, module, or CLI changes.

## Execution

Started 2026-08-15 on `feature/WI-023-extract-goose`. Read-only source snapshot is pinned
to goose commit `3810898a7447ec3299be72e223d3570a7aabf0ab` while the extraction is written.

## Review

Not started.
