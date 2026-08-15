# {{Framework name}}

<!--
Use this template with docs/research/frameworks/README.md. Remove instructional comments when the
extraction is complete. Every factual claim needs pinned evidence or an explicit claim label:
Documented, Measured, or Opinion.
-->

## 1. Snapshot

Identify the exact source boundary so another reader can reconstruct every citation and count.

| Field | Value |
| --- | --- |
| Repository | `{{owner/repository}}` — `{{repository URL}}` |
| Pinned commit | `{{full 40-character SHA}}` — `{{permalink to tree at SHA}}` |
| Date read | `{{YYYY-MM-DD}}` |
| Licence | `{{SPDX identifier or “not established”}}` — `{{pinned licence-file permalink}}` |
| Languages | `{{measured or source-evidenced languages}}` |
| Measured scale | `{{result}}` — `{{command, run date, and scope}}` |

The SHA is required because a date cannot reconstruct a moving repository. Run measurements against
that checkout and say exactly what each command proves; do not use an adjacent metric as evidence.

## 2. The core loop

Trace one agent turn from input through model decision, action, observation, and termination, naming
the pinned files, functions, and executable tests that establish the path.

<!-- Distinguish the default path from optional orchestration and extension hooks. -->

## 3. State and persistence

Describe the in-memory state, persisted state, storage boundary, and resume semantics, including what
survives a process crash and what is replayed rather than restored.

<!-- If persistence is absent, name the search boundary that supports the absence claim. -->

## 4. Tools and the outside world

Follow a tool from declaration through schema/validation, invocation, isolation or sandboxing,
result handling, and failure return to the agent.

<!-- Separate framework guarantees from application-supplied policy. -->

## 5. Composition

Explain whether the pinned implementation composes agents through handoffs, sub-agents, graphs, or
another boundary, and identify what data and control cross that boundary.

<!-- “No composition primitive” requires a named search boundary. -->

## 6. The human in the loop

Trace interruption, approval, rejection, editing, and steering mechanisms, or state the bounded
evidence for their absence.

<!-- Record when human input is durable state versus transient process input. -->

## 7. The abstraction bargain

Mark as **Opinion** the judgement about what the framework makes easy, what it makes hard, and what
it deliberately leaves to applications; keep the implementation evidence beside each judgement.

<!-- This is the designated opinion section, not an exemption from evidence for its premises. -->

## 8. What rungs takes

Map findings to the canonical catalogue without redefining patterns or changing the catalogue in a
per-framework extraction.

| Pattern id | Verdict | Pinned evidence | Reason |
| --- | --- | --- | --- |
| `{{pattern-id or proposed new id}}` | `take / take-as-warning / leave` | `{{permalink or labelled opinion}}` | `{{what this framework changes about the existing claim}}` |

<!--
Use a proposed new id only as a synthesis input; WI-017 decides catalogue changes after all six
extractions. End with the strongest counter-evidence, not only the practices that agree with rungs.
-->

