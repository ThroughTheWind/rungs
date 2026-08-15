**Authoritative for:** the phase sequence this project was built in, and what remains.
**Not authoritative for:** what rungs does — that is the [README](../README.md) — or any design decision, which is an ADR.

# Roadmap

Seven phases, each gating the next. Phases 0–5 are complete; the sequence is kept
because **the order was the method**: nothing was designed before the thing it
depended on was measured.

| Phase | | |
| --- | --- | --- |
| **0** | Initialize | ✅ Repo, docs skeleton, working rules |
| **1** | Extract, per repo | ✅ Four autopsies on one fixed template → [`research/repos/`](research/repos/) |
| **2** | Synthesize | ✅ Convergences, divergences, [eight failure modes](research/synthesis.md), the maturity ladder, [~80 patterns](research/pattern-catalog.md) |
| **3** | Product definition | ✅ [Product brief](design/product-brief.md) + [ADRs 0001–0005](decisions/README.md) |
| **4** | Module catalogue | ✅ [Fifteen modules specified](design/module-catalog.md), then [authored](../modules/README.md) |
| **5** | CLI | ✅ Nine commands, 39 gates, ~2,800 lines |
| **6** | Dogfood | 🟡 Detection [verified on all four](design/detection-verification.md); rungs runs on itself; WI-031 added the portable findings-closure gate; **a real install into a source repo is outstanding** |
| **7** | Distribution | 🟡 Published as `@rungs/cli` (first published 2026-08-14 at v0.1.0; v0.1.1 in [`package.json`](../package.json) on 2026-08-15) · docs site builds and deploys ([`site/`](../site/README.md)) · **module registry outstanding** |

## What each phase produced that the next one needed

- **1 → 2.** Four repos on one template, so they could be compared column by
  column rather than read as four essays.
- **2 → 3.** The failure modes, which became module *dependencies* — `audit`
  requires `findings` requires `backlog` because one repo produced 268 audit
  documents with nowhere to close them.
- **3 → 4.** The module format, without which the catalogue could not be written.
  ADR-0005 was argued out of numeric order because it set the gate-shipping
  contract and Phase 4 could not proceed without it.
- **4 → 5.** Fifteen authored modules, which produced **sixteen corrections to
  the module format** — every one found by writing a module, none by reading.
- **5 → 6.** A CLI that runs, which produced fifteen more corrections, including
  four to the research itself.

## What is left

**Phase 6.** `rungs add` was dry-run against the refreshed `rift-forge` candidate
(the 2026-08-15 research records the candidate's 85 scripts and the validators
that are eligible for adoption) and `axiom-mesh` (7 PowerShell validators, no
root `package.json` added). Neither has been written to. WI-031 integrated the
portable self-declared-finding-closure gate; the remaining test is a real install,
diffed against what that repo built by hand.

**Phase 7.** Publishing and the docs site have landed: `@rungs/cli` is on npm
(v0.1.0 first published 2026-08-14; local package metadata is v0.1.1 on
2026-08-15) and [`site/`](../site/README.md) builds from a pristine checkout and
deploys. What remains is the **module registry**, so third-party modules are
possible — the format is a plain directory precisely so that does not need a
format change.

## A second corpus — proposed, not a phase

[WI-009](backlog/items/WI-009-public-agent-framework-corpus.md), opened 2026-08-15, proposes
extracting six public agent frameworks — SWE-agent, LangGraph, the OpenAI Agents
SDK, Pydantic AI, the Microsoft Agent Framework and OpenHands.

**It is deliberately not Phase 8.** The seven phases are a sequence in which each
gated the next; this gates nothing and nothing gates it. It is a second *axis* on
work Phase 1 already did, and it is proposed rather than accepted — so it appears
here as a pointer, not a row in the table above.

Why it exists: the four extracted repos share an author, so every convergence in
[`pattern-catalog.md`](research/pattern-catalog.md) is currently one operator
agreeing with themselves. Six independently-built repos are the cheapest test of
which patterns are portable and which are one person's habits.

Two things distinguish it from Phase 1. The corpus is read for **architecture**,
which [`research/README.md`](research/README.md) names as the first corpus's
explicit non-goal — so it gets its own directory and template rather than
redefining `docs/research/` in place. And the sources **move and are licensed**:
every extraction pins a commit SHA, because a date alone does not make a count
reproducible when other people are pushing.

It ends at the catalogue. Any change to [`modules/`](../modules/README.md) that
the evidence warrants is a separate item.

## Known open items

- `docauth-scope-headers` and the module docs: **closed** 2026-08-14.
- `concurrency-no-integration-checkout` fires on any repo with its integration
  branch checked out. Correct by design; it stays red until a repo genuinely
  adopts worktrees.
- ADR-0004's `unknown` state is unreachable with the current signature model.
  Either a gap worth closing or a state worth deleting; not yet decided.
