---
id: ADR-0009
title: "rungs drives git for the concurrency loop, and only where the loop is the product"
status: accepted
date: 2026-08-17
---

# ADR-0009 — rungs drives git for the concurrency loop, and only where the loop is the product

- **Status:** accepted
- **Date:** 2026-08-17
- **Phase:** post-6, from [WI-062](../backlog/archive/WI-062-concurrency-phantom-commands.md), closing
  [F-026](../backlog/FINDINGS.md)
- Extends [ADR-0005](ADR-0005-self-instrumentation.md) (what the runner may do and record).

---

## Context

Every command rungs had before this one does one of two things: **write files into a repository**,
or **run gates and record the result**. `setup git` is the closest thing to an exception, and it
only writes git *config*.

The `concurrency` module documents a workflow built from four commands — `session start`, `land`,
`preflight`, `worktrees` — that create branches and worktrees, merge, run gates on a merged tree,
and move refs. **None of them existed.** They were presented in a table headed "The loop", with no
note anywhere that they were unimplemented, and `fragments/AGENTS.md` merged into the consumer's
agent entry document telling the agent to use them and *"never `git merge` by hand"*. The module
withdrew the working manual path and replaced it with three commands that fail (F-026, found by the
2026-08-17 command audit).

So the question was forced, and it is not "should we fix a doc". It is **whether rungs is allowed
to drive git at all.** A tool that merges and moves refs can lose work; a tool that writes files
and runs checks mostly cannot.

## Decision

**rungs drives git only where the git operation *is* the practice being installed, and only
through operations that are recoverable by construction.**

That admits the four concurrency commands and nothing else. Concretely, three rules:

1. **Verify before you advance, never after.** `land` merges onto a scratch `{{integ_prefix}}` ref,
   runs the gates against *that* tree, and only then moves the integration branch — with a
   compare-and-swap against the ref value it read. A refusal leaves the integration branch
   bit-for-bit unchanged.
2. **Never destroy, only refuse.** No rungs command deletes a branch, a worktree, or a commit.
   `worktrees` reports what is prunable and stops there — removing someone else's worktree is not a
   script's call. A refused `land` parks the merged tree on the scratch ref rather than discarding
   it.
3. **Never hold the integration branch.** Every operation runs from a throwaway worktree. This is
   already gated (`concurrency-no-integration-checkout`) and the gate predates the commands,
   recorded as a correction: an earlier design held the branch checked out for the whole
   verification, which blocked every other session *and* did not prevent concurrent landing
   anyway, because switching to the scratch ref releases the branch mid-run.

**What this does not license.** rungs does not rebase, force-push, push at all, delete refs, or
resolve conflicts in shared code. The last is stated in the module and is the honest one: shared-code
conflict is a *scheduling* problem, and `preflight` exists to tell you that you are about to collide,
not to fix it.

## Alternatives considered

**Rewrite the module as the manual protocol it documents** — `git worktree`, `git merge`, and
`rungs check` on the merged tree do all of this by hand. This was the recommendation in WI-062 and
is genuinely cheaper. Rejected because the module's rung-5 cost was justified by the automation: the
threshold text says every mechanism here is overhead below ~5 concurrent sessions, and what makes it
*not* overhead above that is that the loop is mechanised. A manual protocol at rung 5 is a document,
and the repo already has a name for a practice recorded without the thing that enforces it.

**Label the four commands "planned".** Rejected in WI-062 before this ADR, and worth restating: it
leaves a consumer's *agent* holding instructions it cannot follow, after the same document told it
never to merge by hand. A planned-command label is honest about the tool and useless to the reader.

**Ship them as scripts the module writes into the repo**, rather than CLI commands. Genuinely
attractive — it keeps git out of the CLI, and `eject` already proves the "materialise it into your
repo" pattern works. Rejected because these need the gate runner: `land`'s whole point is verifying
the *merged* tree, which means running the registered gates against a tree that exists only inside
the command. A script would have to shell back into `rungs check`, and the compare-and-swap window
would then span a process boundary.

**Let `land` push.** Rejected. The compare-and-swap protects a local ref update; the same guarantee
against a remote requires a different mechanism and a network failure mode. What rungs advances is
local, and what publishes it stays the operator's.

## Consequences

**Good**

- The `concurrency` module becomes true, and its rung-5 cost is again justified by what it does.
- A verified-before-advance land is a real guarantee the manual protocol cannot give: `git merge`
  into the branch and *then* testing has already moved the branch.
- The failure modes are bounded by rule 2 — the worst outcome of a bug is a refusal and a parked
  scratch ref.

**Costs, accepted**

- **rungs can now lose uncommitted work in one place:** creating a worktree from a dirty index is
  git's problem, not ours, but `land` running gates in a scratch worktree means a gate that writes
  files writes them somewhere the user will not look. Gates are supposed to be read-only; nothing
  enforces it. Recorded as the first revisit trigger.
- The CLI gains a git dependency at runtime for these four commands. It already shells to `git` for
  `setup git` and `git-state`, so this is a widening, not a new class.
- Four commands is a materially larger surface to keep honest. The gate added alongside — every
  `rungs <word>` in `modules/**` resolves to a dispatched command — is what stops this specific
  failure recurring, and it is cheap precisely because it is mechanical.

**Neutral**

- `session start` creates a worktree, which is the first time rungs writes *outside* the repository
  it was pointed at. The path is stated in the output, and it refuses rather than overwriting.

## Revisit triggers

1. **A gate writes files during `land`.** The scratch worktree makes that invisible. If it happens,
   the answer is probably to declare read-only-ness per gate — the same shape as `applicability` in
   [ADR-0007](ADR-0007-detector-applicability.md) — rather than to stop verifying on the merged tree.
2. **Someone asks for `land --push`.** That is the boundary this ADR draws; crossing it needs its
   own decision, not an extension of this one.
3. **A second module wants to drive git.** The rule above is written to be applied, not extended by
   analogy: if a module argues its git operation "is the practice", that argument gets checked
   against rules 1–3 here, and a no is a legitimate outcome.

## Admission check

Against [the rule](README.md): (1) constrains every future command that touches git ✅ · (2) the
manual rewrite, the "planned" label, module-written scripts, and pushing were all real alternatives
with stated reasons ✅ · (3) retrofitting a never-destroy rule after commands exist is far costlier
than stating it now ✅ · (4) not owned by a module doc — it governs what the *CLI* may do, and the
concurrency module is only the first case ✅ · (5) not an implementation detail; the code cannot say
why `land` verifies before advancing rather than after ✅.
