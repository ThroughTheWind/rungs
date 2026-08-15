# Follow-on extraction — shared comparison spine

<!--
Copy this file and exactly one track template into each WI-020…WI-027 extraction. Remove comments
when complete. Every material claim carries one evidence label defined in README.md: Normative,
Implemented, Executed, Measured, Documented, or Opinion.
-->

# {{Subject}}

## 1. Snapshot and claim boundary

| Field | Value |
| --- | --- |
| Track | `{{durable/local product · evaluation/optimization · interoperability protocol}}` |
| Subject role | `{{product/runtime · evaluator · optimizer · normative protocol · reference implementation}}` |
| Repository or normative source | `{{owner/repository and URL}}` |
| Pinned commit | `{{full 40-character SHA and tree permalink}}` |
| Version represented | `{{release/specification version if established; otherwise “commit only”}}` |
| Date read | `{{YYYY-MM-DD}}` |
| Licence | `{{SPDX id or “not established”, plus pinned licence-file link}}` |
| Read boundary | `{{directories, packages, specifications, tests, and commands inspected}}` |
| Explicitly excluded | `{{hosted/current behaviour, packages, transports, integrations, or claims not inspected}}` |
| Measured scale | `{{result — command, date, checkout/ref, and path scope}}` |

Snapshot each additional repository or normative authority in a separate table. Never use one
repository's pin to imply that a second moving source was frozen.

## 2. Question and claim register

State the work item's selection question, the end-to-end mechanism being traced, and the claim that
would falsify the selection hypothesis.

| Claim | Label | Pinned or reproducible evidence | Scope and limit |
| --- | --- | --- | --- |
| `{{one material claim}}` | `{{Normative / Implemented / Executed / Measured / Documented / Opinion}}` | `{{permalink or command}}` | `{{what this does and does not establish}}` |

Use the register for the extraction's load-bearing claims, not every sentence. Prose still keeps its
evidence adjacent.

## 3. State and identity

Trace identifiers, ownership, mutable state, persistence, and resume semantics. Keep these layers
separate even when the subject calls several of them “memory” or “session”:

| Layer | Owner and identity | Write/read path | Durability and resume | Evidence boundary |
| --- | --- | --- | --- | --- |
| Conversation or request history | | | | |
| Recovery/checkpoint state | | | | |
| Documentary intent or task description | | | | |
| Repository/workspace state | | | | |
| Agent-managed long-term memory | | | | |

Use “not applicable” with a reason where a layer is outside the subject. “Not found” additionally
requires a bounded absence search.

## 4. External interaction boundary

Follow one external interaction from declaration or negotiation through validation, execution,
result/error return, cancellation, retry, and recovery. Name process, filesystem, network,
credential, and trust boundaries that the source actually establishes; label host/application
policy separately.

## 5. Human authority

Trace interruption, steering, approval, rejection, editing, and attribution. Distinguish durable
pending state from authenticated authority, authorization policy, user interface, and retained
decision evidence. If the subject supplies only some of these, name the missing owner.

## 6. Durable evidence and recovery

Inventory only artifacts that can reconstruct or assess a run: events, trajectories, checkpoints,
logs, task inputs, tool results, artifacts, scores, aggregates, and provenance. For each, state:

- when it is written and what becomes durable together;
- identity, ordering, retention, and replay/deduplication semantics;
- whether it proves execution history, recovery state, evaluation evidence, or accountability; and
- what an interrupted outside-world effect leaves ambiguous.

An event stream is not automatically an audit log, and a checkpoint is not documentary intent.

## 7. Operating cost and limits

Record applicable model/tool calls, retries, concurrency, storage, executor/sandbox requirements,
external services, and explicit termination budgets. Performance claims require an Executed or
Measured record with inputs and environment. A passing test is not a benchmark.

## 8. Strongest counter-evidence

Present the strongest pinned fact, executable result, or bounded absence that weakens the work
item's selection hypothesis. State whether it narrows the claim, contradicts it, shows an optional
path was mistaken for a default, or demonstrates that the subject is not commensurable with its
track.

## 9. Catalogue consequence

Do not edit the catalogue in a subject extraction.

| Pattern id | Verdict | Evidence | Reason and claim boundary |
| --- | --- | --- | --- |
| `{{existing id or candidate: proposed-id}}` | `{{take / take-as-warning / leave / not commensurable}}` | `{{pinned link or labelled opinion}}` | `{{what WI-028 should adjudicate}}` |

End with the strongest warning or rejected analogy, not only practices that agree with rungs.
