---
name: decompose
description: >-
  Break a request into technical concerns, decide reuse per concern (use as-is / extend locally /
  extend upstream / hand-roll), pick the planning tier, and sequence by dependency. Use when handed
  something larger than a single change, when asked to "plan this", "how should we approach this",
  "break this down", "scope this out", or before starting work whose shape is not obvious. Also use
  across a batch of related work to catch shared concerns once. For agentic or delegated work, it
  also names the bounds, continuation owner, state crossings, and terminal output/status. Executing a tracked item is
  /work-item; recording an out-of-scope observation is /record-finding.
---

# Decompose

Nine numbered steps. Other documents cite them by number — *"resolved at step 4 as extend-local"* —
so the numbering is stable and worth keeping.

## 1. Anchor

Name the narrowest concrete thing this touches: a file, a symbol, a route, a failing test. If you
cannot, the request is not yet a piece of work and the next move is a question, not a plan.

## 2. Split into concerns

List the distinct **technical** concerns, not the user-visible steps. "Persist the draft",
"debounce the input", "authorise the caller" are three concerns; "add the editor" is one story
containing them.

**Steps 3–4 run per concern.** A story with four concerns runs them four times.

## 3. Look up what exists

For each concern, search before deciding: the shared primitives, the reference implementation, the
upstream repository if there is one. **Search with the concern's vocabulary, not the story's** —
this is where a capability that already exists gets missed and rebuilt.

## 4. Decide the branch

Apply the reuse decision table. Record the branch **and the reason**, per concern. A concern whose
branch is "hand-roll" needs the second-consumer check: is this the first time, or the second?

## 5. Pick the tier

Apply the planning-tier table. **Tier 0 is a real answer** — if every concern resolved to
use-as-is, write nothing and implement.

## 6. Sequence

Order by **dependency only**, not by size or by what is interesting. If two concerns can proceed
independently, say so — that is a scheduling fact somebody will want.

For a batch: produce one combined concern table across all the work first, so a shared concern is
caught once.

## 7. Name what this does not cover

Explicitly, before starting. Out-of-scope written after the fact is a description of what you ran
out of time for.

## 8. Implement

Following the repo's engineering guidance, not this skill.

For an agentic invocation, implementation is not complete until the plan or work item records the
iteration/cost/time/context/retry bounds, the continuation owner, the state and mutation boundary,
and the terminal artifact/status for completion, truncation, empty output, and failure.

## 9. Close

Reconcile: does the spec still describe what was built? Did any concern's branch change during
execution, and is that recorded with its reason? A plan that silently stopped matching reality
reads as verified.

Name the public output allow-list and any protocol escape hatch in the close reconciliation. Internal
events or connected tools are not public output unless the contract says they are.

## Two failure modes to watch for

- **Resolving the story instead of the concerns.** One search, one answer, four concerns
  unexamined. This is the common one.
- **Deciding reuse from a memory of the codebase.** Search at decision time. A recollection of what
  exists has a shelf life, and the cost of being wrong is a duplicate primitive nobody notices for
  months.
