# Aider — git-first coding, repository context, and validation

This extraction answers WI-022's bounded product question: how one ordinary Aider edit moves from
repository context through a model response and file mutation to validation, commit, diff, and undo.
It follows the [shared spine](../SHARED-SPINE.md) and the product method's
[continuity matrix](../PRODUCT-TEMPLATE.md). It is not a benchmark or a recommendation to enable
every automatic action.

## Snapshot and read boundary

**Measured** — The source is the public [Aider-AI/aider repository](https://github.com/Aider-AI/aider/tree/5dc9490bb35f9729ef2c95d00a19ccd30c26339c)
at commit `5dc9490bb35f9729ef2c95d00a19ccd30c26339c`, read 2026-08-15. `git describe` reports
`v0.86.3.dev-53-g5dc9490b`; this is a pinned source snapshot, not a current-release claim. The
repository's [LICENSE.txt](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/LICENSE.txt)
is Apache-2.0.

**Measured** — `git -C C:\Temp\rungs-follow-on-20260815\aider ls-files` counted 691 tracked files,
147 Python files, 88 test-named/test-directory files, 160 Markdown/RST/text files, and 38 coder
implementations. These counts describe the checkout only; they do not measure model quality or the
size of a user's repository.

**Documented** — The bounded read set is `aider/main.py`, `aider/coders/base_coder.py`, edit-format
coders, `aider/repo.py`, `aider/repomap.py`, `aider/commands.py`, `aider/linter.py`, argument
defaults, and the targeted tests under `tests/basic/` for repository, repo-map, command, coder, and
main configuration behaviour. No model conversation or mutation of a real repository was run.

## The traced ordinary edit

**Implemented** — Startup parses model, repository, file, edit-format, lint/test, commit, and map
options. With Git enabled, `main()` constructs one `GitRepo` and refuses a set of files spanning
multiple Git repositories. The default path therefore begins inside one existing working tree;
`--no-git` is an explicit alternate boundary.

**Implemented** — `GitRepo.get_tracked_files()` supplies the file universe. `RepoMap.get_repo_map()`
parses syntax tags and ranks symbols from the files outside the chat, using mentioned filenames and
identifiers as hints, a token budget, refresh policy, and a cache. Files explicitly added to chat
are sent as full content; read-only files are sent as reference content. The map is a context
selection summary, not a semantic proof that the model understood the repository.

**Implemented** — `Coder.run_one()` preprocesses a user request, formats conversation + selected
files + repo map, checks the model context limit, and calls `send_message()`. Provider errors can
retry with exponential delay; context exhaustion and keyboard interrupts stop the current response
with an explicit user-visible outcome.

**Implemented** — The selected coder parses the model's declared edit format (the default model may
choose a format; `EditBlockCoder` is the concrete search/replace path). `apply_updates()` first
performs a dry-run parse, asks permission before editing files not already in chat, refuses
git-ignored files, optionally creates new files after confirmation, and applies only matching
blocks. Malformed format or non-matching search blocks become a reflected error message rather than
an assumed patch.

**Implemented** — Before changing a dirty file, `dirty_commits` can commit that file so `/undo` has
a clean parent to restore. After a successful edit, `auto_commits` commits the edited paths by
default, records the commit hash in the current Coder, and moves a compact commit result into the
conversation. `auto_lint` is enabled by default; `auto_test` is disabled by default. Lint/test
failure is shown to the user and becomes a follow-up request only after confirmation.

**Implemented** — `/commit` commits pending dirty changes; `/diff` compares the current tree with
the pre-message commit; `/undo` only removes the latest commit made by Aider in this chat, refuses
already-pushed commits, merge commits, dirty files, and files absent from the parent, then performs a
targeted checkout plus soft reset. These are user-visible Git operations, not hidden rollback.

## Product boundary matrix

| Boundary | Implementation evidence | What survives / what it does not prove |
| --- | --- | --- |
| Identity | Git branch/HEAD, commit hash, tracked path, and Coder's `aider_commit_hashes`; chat history and `commit_before_message` are in-memory/session state. | **Implemented** — a commit is durable Git identity; a Coder session's “Aider commit” set is not a durable authority after restart. |
| State | Working tree, index, `.gitignore`, `.aiderignore`, repo-map cache, current/done messages, and optional chat-history file. | **Implemented** — files/commits survive process exit through Git; repo-map/cache and live chat context can be invalidated or summarized. |
| External effects | Model provider, Git hooks, filesystem, shell commands, lint/test tools, and optional URL retrieval. | **Implemented** — shell commands require explicit confirmation; Git hooks run on commit unless `--no-verify`; provider and tool behaviour remain external. |
| Human authority | Confirmation for adding/editing files, creating files, shell commands, lint fixes, test fixes, and undo preconditions; interactive Ctrl-C. | **Implemented** — automatic editing/commit is configurable, while explicit confirmation remains a gate for ambiguous or external actions. |
| Evidence | Git diff/commit, chat messages, command output, lint/test outcomes, and optional analytics/history. | **Implemented** — Git records repository state; Aider does not produce a tamper-evident transcript of every model token or every external command outcome. |
| Recovery | `/undo`, Git history, `/reset`, `/drop`, `/clear`, and optional restored chat history. | **Implemented** — undo is guarded and scoped to the latest Aider commit; it is not a general restore of arbitrary user edits or provider state. |

## Dirty trees, ignored files, generated files, and branches

**Implemented** — Aider detects the repository from the requested paths and rejects multiple roots.
`subtree_only` narrows the tracked-file view; `.gitignore` and `.aiderignore` filter candidate files;
`--add-gitignore-files` is an explicit opt-in for adding ignored files. An ignored path is skipped
by the edit authorization path even if the model mentions it.

**Implemented** — Dirty files are not silently overwritten without a policy decision. With the
default `dirty_commits=True`, the file is committed before an edit; `--no-dirty-commits` removes
that safety net, and `--no-auto-commits` also disables automatic post-edit commits (and forces dirty
commits off during construction). Generated or ignored files are therefore governed by Git/Aider
ignore rules and user confirmation, not by a semantic classifier.

**Implemented** — Aider operates on the current branch and commits locally. It does not create a
separate worktree or branch for the ordinary loop. A commit may be annotated with an Aider committer
or `Co-authored-by` trailer depending on flags; commit verification is enabled by default and can
be disabled explicitly.

## Validation and termination

**Implemented** — The normal loop terminates when the model reply is complete, after an optional
reflection cycle for malformed edits, failed lint, failed tests, or file-mention context. Reflection
is bounded by `max_reflections` (three in the inspected Coder default). Model context exhaustion,
provider failure after retries, EOF, and repeated Ctrl-C are terminal user-visible outcomes.

**Implemented** — `auto_lint` runs configured language linters after edited files; `auto_test` runs
the configured test command only when enabled. A failed linter/test does not automatically mean the
edit is reverted: the user is asked whether to send the errors back to the model. If fixes are
accepted, the linter/test loop can create another Aider commit.

**Documented** — The tests exercise Git diffs containing both index and working-tree changes,
repo-map refresh modes and identifier hints, malformed/failed edit blocks, ignored files, default
commit flags, and `/undo` refusal cases. They are executable evidence for these paths, not proof
that every supported language or Git hook behaves identically.

## Continuity and restart

**Implemented** — `Coder.clone()` carries selected files, read-only files, message history, Aider
commit hashes, command state, usage counters, and file watcher state into a new coder (used by the
lint fixer and alternate edit formats). Optional chat-history restoration reads the configured
history file and summarizes it when it exceeds the model context budget.

**Implemented** — Git commits, the working tree, branch, index, and remote status survive a process
restart because they are repository state. In-memory `aider_commit_hashes`, `last_aider_commit_hash`,
pending reflection, and the exact model/tool exchange do not. `/undo` after restart therefore cannot
prove that the target commit was made by this Aider session and refuses it.

**Opinion** — The durable unit is the Git commit, not the chat run. That is a useful coding-product
boundary, but it makes commit granularity, commit attribution, hooks, and user review part of the
evidence contract rather than an implementation detail.

## Strongest counter-evidence

**Implemented** — Aider's default `auto_commits=True` can make a model-produced edit durable before a
human inspects the complete diff. The safety relies on Git history and `/undo` preconditions; it does
not make a bad edit correct or prevent a hook/tool side effect.

**Implemented** — The repo map ranks syntax tags and symbol references under a token budget. It can
omit relevant code, include stale cached context, or be disabled (`--map-tokens 0`); its presence is
not evidence of complete repository understanding.

**Implemented** — Shell commands and lint/test commands execute on the user's machine after a
confirmation boundary, not inside a sandbox. Aider records returned text in chat but does not provide
a capability policy or rollback for arbitrary command side effects.

**Opinion** — Aider is “git-first” in the precise sense that Git state is the durable outcome and
undo/dirty-file safety is expressed through Git. It is not a transactional patch system: model,
filesystem, hooks, tests, and user choices can still produce effects outside the commit.

## Catalogue consequences (deferred to WI-028)

| Candidate | Evidence | Provisional disposition |
| --- | --- | --- |
| `narrow-anchor` | **Implemented** — edit authorization uses in-chat paths, explicit confirmation, and exact search/replace matches; repo-map context is bounded by hints and token budget. | Candidate; compare with existing narrow-context wording. |
| `structural-gate` | **Implemented** — dirty-file commit, Git-ignored rejection, commit verification, and guarded undo gate repository mutation. | Candidate; distinguish repository invariants from schema validation. |
| `land-candidate` | **Implemented** — automatic commit creates a durable candidate, while `/undo`, diff, hooks, and user review remain visible. | Candidate; compare with WI-016 land semantics. |
| `agent-facing-interface` | **Implemented** — commit result, lint/test output, and edit errors are fed back into the chat as model-facing artifacts. | Candidate; likely confirms existing interface pattern. |
| `prompt-writes-artifact` | **Implemented** — a model response becomes an exact file edit and then a Git commit, with the commit hash returned to the conversation. | Candidate; compare with durable artifact findings. |
| `replay-safe-side-effect` | **Opinion** — retries/reflections can repeat lint, tests, shell commands, or commits; idempotence and review remain user workflow obligations. | Warning only; no catalogue edit here. |

No catalogue, module, or CLI file changed. WI-028 owns reconciliation across the product track.
