---
description: >-
  How to specify invocation ownership, state crossings, protocol escape hatches, approval identity,
  and the allow-list of public outputs. Loads when a workflow calls another agent, pauses for a human,
  delegates a capability, or exposes progress to a caller.
paths:
  - "{{plan_path}}/**/*.md"
  - "{{path}}/**/*.md"
enforcement: review-only
---

# Invocation boundaries

Treat a composed invocation as a contract, not as a tool-shaped call:

- **Ownership:** name who owns continuation, which state crosses the boundary, what the callee may
  mutate, and whether its result returns to the caller.
- **Protocol:** name the protocol, callback, adapter, or capability check that handles cases the
  local abstraction does not own. A small interface without an escape hatch is a closed assumption.
- **Approval:** persist a stable pending request id and the exact validated arguments; bind the
  authorized decision server-side, expose an explicit approve/deny response path, and consume it
  once. A caller-supplied boolean is not proof that the surfaced action was approved.
- **Output:** declare an allow-list of caller-facing artifacts and statuses. Graph connectivity,
  tool visibility, or event emission must not disclose internal progress by accident.

These rules describe repository-facing workflow contracts. They do not provide an approval service,
transport, event stream, sandbox, or authority model.
