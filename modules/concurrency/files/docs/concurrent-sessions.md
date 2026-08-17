**Authoritative for:** the loop many sessions share: where to branch from, when to verify, how to land, and which conflicts are the tooling’s problem.
**Not authoritative for:** the backlog lifecycle those branches carry, and the gates the loop runs.

# Concurrent sessions

**Read the threshold first.** Below roughly five sessions working at once on one integration
branch, everything here costs more than it returns. It is a real tooling surface with its own
failure modes.

Every rule assumes one thing: **many sessions work at once, in separate worktrees, off one shared
branch, and they cannot see each other's work.**

## The loop

| | |
| --- | --- |
| `rungs session start <branch>` | Cuts from `{{green_prefix}}<branch>` — the last merge that was actually verified — not the tip. Falls back to the tip and **says so** |
| `rungs check` | The fast tier. Run it constantly |
| `rungs preflight` | The integration branch moved: did it change files *you* changed? That, not the commit count, predicts a conflict |
| `rungs land <branch>` | merge → verify **the merged tree** → fast-forward → move the green ref |
| `rungs worktrees` | What is finished and prunable. **Reports only** — removing someone else's worktree is not a script's call |

## Do not run the full tier before landing

`land` runs it on the merged tree itself. A separate full run beforehand proves nothing land will
not prove — and it is not merely wasted time: **the integration branch moves while it runs**, so
the pre-verify is what widens the window the merge then conflicts in.

Measured in one session: three of five land attempts refused, every one after a 4–12 minute
pre-verify, every one on the same generated artifacts. The attempt that landed did merge → resolve
→ regenerate → land with nothing in between.

So: **fast tier constantly, full tier at the boundary.** Reach for it early only to answer a
deliberate question, never as a ritual.

## A failure is attributed, never just counted

`land` re-runs each failing gate against the merge base in the throwaway worktree it already has,
and reports each failure as **inherited** (already red before you started — stated, never blocking)
or **INTRODUCED** (yours — blocks). Anything it cannot attribute also blocks: **we do not land on an
unknown.**

Attribution is **per finding, not per gate.** The first implementation compared gate ids, which
made an already-red gate a blind spot: a branch could add new broken links and land them as
inherited, because that gate was red either way. Measured on a scratch repo, and fixed the same
day — a gate you have not fixed does not excuse the new violations of it you bring.

This is not politeness about blame. *A gate that is red for reasons you did not cause and cannot
fix is a gate you learn to bypass, and a bypassed gate reports nothing.*

> **Attribution makes a red gate survivable, which also removes the pressure to fix it.** One repo
> ran 11 of its last 15 CI runs red on two permanently-broken jobs. The ledger's ageing signal
> exists for exactly this: fix them or delete them.

## Land, then move the tip — in that order

`land` merges into a scratch `{{integ_prefix}}…` ref, verifies **that** tree, and only then
fast-forwards with a compare-and-swap. Two things follow:

- **The integration branch cannot go red from a merge nobody verified** — the ref update is
  unreachable otherwise, and a refusal leaves it bit-for-bit unchanged with the merged tree parked
  for you to fix.
- **Concurrent landing is refused, not silently merged.** A real lock names its holder and start
  time and is taken over if the holder died.

**Nothing keeps the integration branch checked out.** If something needs it checked out, that is a
bug in whatever it is doing.

## Three things to know when a land refuses

- **Your worktree is untouched.** `land` does all its work in a throwaway worktree of its own, so
  whatever you had checked out is still checked out. A refusal costs you nothing to recover from.
- **Check the exit code of `land` itself.** Piping it through `tail` or `grep` reports *that*
  command's status, so a refused land reads as success.
- **Reconcile generated artifacts by regenerating, never by merging text.** Take one side, re-run
  the producer, and re-pin what moved with the reason at the pin.

## What conflicts, and which of it is the tooling's problem

| Class | Handling |
| --- | --- |
| **Id ledgers** — boards, registers, indexes | The driver takes the higher `NEXT-ID` and keeps both claim comments. **It resolves nothing else** — a row that moved section is handed back, because a union merge would keep both copies of it |
| **Generated artifacts** | The driver **always refuses** and prints the regenerate command |
| **Shared code** | **Not a tooling problem — a scheduling one.** Give a hot surface one owner at a time and batch same-surface work behind one session. `preflight` tells you when you are about to collide |

That third row is the honest one: it names the class this will not automate and prescribes
scheduling instead.

## Worktree lifetime is item lifetime

Delete the branch when it lands. `rungs worktrees` measures whether that happened and flags
worktrees that are merged and clean — and, more usefully, ones that are merged **and dirty**, where
uncommitted work is sitting in a branch that has already landed.
