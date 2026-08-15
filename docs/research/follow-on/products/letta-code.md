# Letta Code — durable memory, identity, and continual learning

## 1. Snapshot and claim boundary

| Field | Value |
| --- | --- |
| Track | Durable/local product |
| Subject role | Local CLI/desktop harness with optional cloud-backed agents |
| Repository | `letta-ai/letta-code` — https://github.com/letta-ai/letta-code |
| Pinned commit | `ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0` — [tree](https://github.com/letta-ai/letta-code/tree/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0) |
| Version represented | `@letta-ai/letta-code` `0.30.20` in [`package.json`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/package.json) |
| Date read | 2026-08-15 |
| Licence | Apache-2.0 — [`LICENSE`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/LICENSE) |
| Languages and scale | **Measured.** `git ls-files` at the pin: 1,963 tracked files; 1,706 TypeScript/JavaScript files; 692 test-named files; 127 Markdown/docs files. Command: `git -C <checkout> ls-files`, filtered by extension/name on 2026-08-15. |
| Read boundary | README/package metadata; `src/agent` memory, identity, subagent, and Git helpers; `src/backend/local` storage, prompt compilation, and tests; `src/permissions`; secrets store; selected hooks and tests. |
| Explicitly excluded | Letta Cloud service implementation, hosted UI, model-provider behaviour, external documentation beyond the README links, and executing a real model turn. |

The README documents a memory-first harness with local and cloud modes, Git-tracked MemFS,
subagents, permissions, schedules, remote environments, and secrets ([**Documented** README
feature table](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/README.md#feature-overview)). Those are selection context, not implementation claims until the pinned source below supports them.

## 2. Question and end-to-end mechanism

The selection question is: **when an agent changes long-term context, who owns the change, where is
it durably recorded, and when does a later turn see it?** The traced local path is:

1. **Implemented.** A local backend maps an agent id to `<storage>/memfs/<agent-id>/memory` and
   ensures a Git repository exists before prompt compilation
   ([`local-backend.ts#L546-L570`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local/local-backend.ts#L546-L570)).
2. **Implemented.** Repository initialization creates `main`, configures an agent-scoped author,
   writes any seed files, and commits them; subsequent memory writes stage pathspecs and commit
   through `commitMemoryWrite`
   ([`memory-git.ts#L1348-L1387`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/memory-git.ts#L1348-L1387), [`memory-git.ts#L1431-L1489`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/memory-git.ts#L1431-L1489)).
3. **Implemented.** Prompt compilation reads only committed Markdown from `HEAD`, renders system
   files and an external projection, and records the Git revision
   ([`system-prompt-compilation.ts#L62-L110`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local/system-prompt-compilation.ts#L62-L110), [`#L224-L317`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local/system-prompt-compilation.ts#L224-L317)).
4. **Implemented and Executed evidence.** On the next local turn, the backend compares the cached
   prompt's `memfsRevision` with `git rev-parse HEAD`; a changed revision recompiles the prompt.
   The pinned test writes and commits `system/persona.md`, sends a turn, and asserts that the new
   text reaches the executor
   ([`local-backend.ts#L932-L1012`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local/local-backend.ts#L932-L1012), [`local-backend.test.ts#L675-L726`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local-backend.test.ts#L675-L726)).

The mechanism therefore has a clear durability boundary: **a committed memory revision affects a
later compiled context; an uncommitted working-tree edit is not projected into that prompt.**

## 3. State and identity

| Layer | Owner and identity | Write/read path | Durability and resume | Evidence boundary |
| --- | --- | --- | --- | --- |
| Conversation or request history | Local store keyed by agent and conversation ids; messages and in-context ids are persisted in local transcript records | Local backend appends turn input/stream chunks and reloads them through `LocalStore` | **Implemented.** Transcript state survives process reload; interrupted partial assistant/tool state is repaired or removed by local-store recovery paths. The cloud transcript service is outside this read. | [`local-store.ts`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local/local-store.ts), [`local-backend.test.ts#L650-L673`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local-backend.test.ts#L650-L673) |
| Recovery/checkpoint state | Conversation record plus compiled-prompt metadata (`rawSystemHash`, `memfsRevision`, message ids) | `getOrCompileSystemPrompt` checks the stored revision before each turn | **Implemented.** The prompt cache is invalidated by a new committed MemFS revision; it is not a general transaction or rollback log. | [`local-backend.ts#L932-L980`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local/local-backend.ts#L932-L980) |
| Documentary intent | System Markdown files, especially `system/persona.md`, plus project/global/agent skills | Seeded and edited as memory files; system files are rendered into the prompt and all non-system files are exposed by path projection | **Implemented.** Intent is durable when committed in MemFS. The source does not make a separate immutable task-intent record. | [`system-prompt-compilation.ts#L224-L278`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local/system-prompt-compilation.ts#L224-L278) |
| Repository/workspace state | The host process and current working directory, not the memory Git repository | Tools act in the user workspace; memory uses a separate scoped directory | **Implemented.** Memory commits do not commit the user repository. Worktree ownership helpers track expected paths, but this extraction does not establish a sandbox guarantee. | [`subagent-launcher.ts#L76-L151`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/subagents/subagent-launcher.ts#L76-L151), [`worktree-ownership.test.ts`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/websocket/worktree-ownership.test.ts) |
| Agent-managed long-term memory | Agent id selects an isolated memory root; `git-memory-enabled` tags remote agents | Memory tools/files write Markdown and `commitMemoryWrite`; local and remote paths have different Git setup | **Implemented.** Local memory is a per-agent Git repo; cloud MemFS can clone, pull, push, and sync through a remote Git endpoint. The source does not prove semantic truth or conflict-free shared editing. | [`memory-filesystem.ts#L486-L596`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/memory-filesystem.ts#L486-L596), [`memory-git.ts#L1619-L1809`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/memory-git.ts#L1619-L1809) |

Agent identity is a routing and namespace key, not proof of authenticated human identity. Local ids
are distinguished by the `agent-local-` prefix; created-agent tags distinguish Letta Code origin,
subagents, and Git-backed memory ([`agent-tags.ts#L11-L37`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/agent-tags.ts#L11-L37), [`agent-id.ts#L1-L20`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/agent-id.ts#L1-L20)).

## 4. External interaction boundary

The memory write boundary is a local filesystem plus Git process. `commitMemoryWrite` stages
normalized pathspecs, prepares local-only or authenticated remote Git operations, commits with an
agent-scoped author, and returns the commit SHA; the source validates path encoding and rejects
unsafe relative paths during initialization ([`memory-git.ts#L1348-L1387`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/memory-git.ts#L1348-L1387), [`#L1452-L1477`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/memory-git.ts#L1452-L1477)).

For a cloud-enabled agent, enabling MemFS first reconciles the system prompt, persists the local
setting, detaches older API memory tools, adds the Git-memory tag, and clones or pulls the memory
repository. Secret initialization is best-effort and non-fatal ([`memory-filesystem.ts#L534-L588`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/memory-filesystem.ts#L534-L588)). **Opinion:** this ordering makes the prompt/memory mode explicit before remote synchronization, but it does not make a memory commit and a model turn one atomic transaction.

Secrets have a separate owner. **Implemented.** Local agents load agent-scoped values from OS-secure
Bun storage; non-local agents retrieve `agent.secrets` through the backend and keep values in an
in-memory cache. The pinned code does not establish that a secret value is absent from every model
context or shell process ([`secrets-store.ts#L354-L388`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/utils/secrets-store.ts#L354-L388)).

## 5. Composition and ownership

**Implemented.** Existing-agent subagent calls use a conversation id when supplied, or an agent id
plus `--new` to create a separate conversation for thread safety. New subagents receive type and
parent tags, are launched with a stream-json result envelope, and default to unrestricted
permission mode; fresh subagents are marked stateless so they do not clone or sync MemFS
([`manager.ts#L234-L289`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/subagents/manager.ts#L234-L289), [`headless-memfs-policy.ts#L1-L23`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/headless-memfs-policy.ts#L1-L23)).

Memory root resolution permits the current agent and, for a subagent role, its parent agent as
explicit roots. The cross-agent guard classifies both API and local memory trees and denies paths
under another agent's root, including symlink/realpath cases covered by tests
([`memory-paths.ts#L89-L172`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/permissions/memory-paths.ts#L89-L172), [`cross-agent-guard.ts#L152-L206`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/permissions/cross-agent-guard.ts#L152-L206), [`cross-agent-guard.test.ts#L650-L730`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/permissions/cross-agent-guard.test.ts#L650-L730)).

The composition boundary is therefore ownership-changing but not memory-sharing by default: a child
gets a typed launch envelope, a parent tag, and selected roots; continuation and durable memory are
still selected by the caller and backend. **Opinion:** the explicit parent/current scope is a useful
ownership contract, while `--permission-mode unrestricted` for spawned processes is a host policy
that should not be mistaken for isolation.

## 6. Human authority

**Implemented.** Permission analysis produces approval contexts for tools; strict mode sends every
tool through an approval callback, while configured allow/deny rules and read-only or memory-dir
shortcuts can bypass a prompt ([`checker.ts#L141-L150`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/permissions/checker.ts#L141-L150), [`checker.ts#L470-L542`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/permissions/checker.ts#L470-L542), [`approval-execution.ts#L192-L270`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/approval-execution.ts#L192-L270)). Approval requests carry tool-call identity and arguments into the execution step, and denials become tool results.

The source establishes a permission decision and a UI/headless round trip, but not a complete
accountability ledger. **Opinion:** a human approval is bound to a tool call inside the process, not
necessarily to an immutable outside-world effect, authenticated actor record, or retained audit
decision after the conversation storage boundary.

## 7. Durable evidence and recovery

- **Implemented.** Memory commits provide Git history and a returned SHA; remote sync reports clean,
  dirty, conflict, pushed, or failed states. This is memory-version evidence, not proof that a model
  used the content correctly or that a concurrent push was semantically merged.
- **Implemented.** Local conversations persist transcript manifests/messages and repair interrupted
  turns. The selected tests show partial assistant state is removed from the resumed in-context set
  ([`local-backend.test.ts#L650-L673`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local-backend.test.ts#L650-L673)).
- **Implemented.** The compiled system prompt records `AGENT_ID`, `CONVERSATION_ID`, prior-message
  count, raw-system hash, and MemFS revision. Those fields support reconstruction of what was
  projected, not a complete causal trace of tool effects ([`system-prompt-compilation.ts#L281-L317`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local/system-prompt-compilation.ts#L281-L317)).
- **Not established.** The pinned source does not provide exactly-once semantics for an external
  tool effect that succeeds while its following memory commit or transcript write fails. A Git
  memory conflict is reported, but no general rollback of the outside-world action is demonstrated.

## 8. Operating cost and limits

**Measured.** The checkout contains 1,963 tracked files and 692 test-named files, but this is source
scale, not runtime capacity. The local path starts Git processes for memory initialization, commits,
status/revision checks, and optional sync; the model/provider and remote service costs are outside
the pinned checkout. Context windows are selected from provider/model metadata and compaction code,
but this item did not run a model or benchmark throughput. **Not established:** CPU, memory, network,
and latency limits for a real agent turn.

## 9. Strongest counter-evidence

The strongest counter-evidence to “memory gives durable identity and safe continuity” is the split
between Git durability and execution accountability: a commit SHA versions Markdown, while an
interrupted external effect can remain ambiguous and an approval record is not shown to be a
retained, authenticated audit ledger. The source also explicitly treats fresh subagents as stateless
and allows unrestricted process permissions, so long-term memory and host isolation are separate
contracts, not one guarantee.

## 10. Catalogue consequence

This extraction proposes candidates for WI-028 and does not edit the canonical catalogue.

| Pattern id | Verdict | Evidence | Reason and claim boundary |
| --- | --- | --- | --- |
| `session-handoff` | `take-as-warning` | [`system-prompt-compilation.ts`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local/system-prompt-compilation.ts#L281-L317) | Memory metadata and prompt projection help reconstruct continuity, but are not a machine checkpoint or complete audit log. |
| `prompt-writes-artifact` | `take` | [`memory-git.ts#L1348-L1387`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/memory-git.ts#L1348-L1387) | Durable progress is an explicit Git commit with an author and returned revision. |
| `ownership-changing-handoff` | `take-as-warning` | [`manager.ts#L234-L289`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/subagents/manager.ts#L234-L289) | Child ownership, parent tags, continuation envelope, and statelessness need to be declared; unrestricted launch policy remains host-owned. |
| `replay-safe-side-effect` | `take-as-warning` | [`memory-git.ts#L1700-L1809`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/agent/memory-git.ts#L1700-L1809) | Sync reports conflicts and retries, but does not establish exactly-once outside-world effects. |
| `candidate: memory-layer-separation` | `take` | [`system-prompt-compilation.ts#L224-L317`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/backend/local/system-prompt-compilation.ts#L224-L317) | Conversation metadata, committed prompt state, memory files, and repository state are distinct layers with different owners and durability. |
| `candidate: agent-memory-ownership` | `take` | [`cross-agent-guard.ts#L152-L206`](https://github.com/letta-ai/letta-code/blob/ec4e23a85d4aa2a449ed5c7fb0801a0be1bd68d0/src/permissions/cross-agent-guard.ts#L152-L206) | Agent-scoped roots and cross-agent denial are an explicit ownership boundary, while parent sharing is opt-in and bounded. |

The strongest warning is the rejected assumption that Git-backed memory equals truth, rollback, or
human accountability. Those remain separate synthesis questions.
