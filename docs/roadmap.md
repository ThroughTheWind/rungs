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
| **5** | CLI | ✅ Ten commands, ~4,700 lines (`wc -l src/*.ts`, 2026-08-17); gate count on [the versions page](https://docs.rungscli.com/versions/), derived rather than typed |
| **6** | Dogfood | 🟡 Detection [verified on all four](design/detection-verification.md); rungs runs on itself; WI-031 added the portable findings-closure gate; WI-034 verified a clean packed-consumer journey; a clean consumer installed from the **public registry** on 2026-08-17; **writing to a repo rungs did not scaffold, and a platform matrix, remain** |
| **7** | Distribution | 🟡 Published as `@rungs/cli` (first published 2026-08-14 at v0.1.0; current published version on [the versions page](https://docs.rungscli.com/versions/); v0.2.0 released from [`package.json`](../package.json), tagged `release/0.2.0` and live on npm) · docs site builds and deploys ([`site/`](../site/README.md)) · **module registry outstanding** |

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
portable self-declared-finding-closure gate. WI-034 then exercised a clean
git-backed consumer from a packed artifact, including a safe failure path.

The **public-registry install landed with v0.2.0 on 2026-08-17** — `npm view
@rungs/cli dist-tags` returns `latest: 0.2.0`, and a clean consumer installed that
artifact and ran the binary. That command proves the package resolves and executes;
it says nothing about the two tests still outstanding. **Nothing has been written to
a repo rungs did not scaffold** — every `add` against a source repo so far has been a
dry run — and only Windows is verified, so the platform matrix is unmeasured rather
than passing.

**Phase 7.** Publishing and the docs site have landed: `@rungs/cli` is on npm
(v0.1.0 first published 2026-08-14; the current published version is tracked on
[the versions page](https://docs.rungscli.com/versions/) rather than copied here, and the
cut followed the [release runbook](design/release-runbook.md))
and [`site/`](../site/README.md) builds from a pristine checkout and
deploys. What remains is the **module registry**, so third-party modules are
possible — the format is a plain directory precisely so that does not need a
format change.

## A second corpus — proposed, not a phase

[WI-009](backlog/archive/WI-009-public-agent-framework-corpus.md), opened 2026-08-15, proposes
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

## What no phase covers: somebody else's repository

Phases 6 and 7 are both about **mechanism** — a consumer that installs, a package that
resolves, a site that deploys. Neither is about a **user**, and no row in the table above
is. Naming that here, because "distribution" quietly coming to mean "we published a
tarball" is the cheapest way this project fools itself.

It is the gap both external reviews named as the limiting risk
([review #2, claim 16](design/external-review-2026-08-16b.md)), and the one
[the census](design/explain-census-2026-08-16.md) closes by admitting it cannot test:
2,291 findings, 0 wrong, across six repositories **built by the same operator**. That
measures survival across eleven project *shapes*, not across other people. Its §5 goes
further — nobody has asked whether a surviving finding is one its repo's owner would act
on, and from here low false positives and low value look identical.

How the gap may be closed is already decided, so a proposal meets a test rather than a
wall ([`cross-repo-evidence-2026-08-16.md`](design/cross-repo-evidence-2026-08-16.md)):
counts gathered **from users' repositories are refused permanently**; counts derived from
**public** repositories the operator reads are permitted and already happening; a count
**within one** repository stays Tier A, local and untransmitted. So the only open route is
the slow one — read public repositories, pin each to a commit, and be accountable for the
reading. That is not a phase either: it gates nothing and nothing gates it.

### The detector three readers already assume exists

**Accepted 2026-08-17:** imperative and staleness detection —
[WI-061](backlog/items/WI-061-imperative-staleness-detection.md).

The evidence for it arrived by accident, from three parties in a row. The landing page
asserted the capability in a fabricated console block for weeks — `this rule says
MANDATORY and has no gate` — deleted by
[WI-046](backlog/items/WI-046-console-provenance.md) and now refused by the
`site-transcripts-real` gate. External reviewer #2 read that block as shipped behaviour.
Then a third review, on 2026-08-17, built an entire distribution plan on four finding
categories — unenforced MUST/SHOULD, stale command references, duplicated path-scoped
rules, conflicting authority — of which **rungs detects none**.

Nine gates declare `applicability = "repo-content"` and so may read a repo that is not
ours (`grep -rho 'applicability *= *"[a-z-]*"' modules/ | sort | uniq -c`, 2026-08-17 —
which counts declarations, not what they find). What they produce on a foreign repo is
broken links, stale paths in code spans, file-population counts and a line budget. All
real; none of them the thing being assumed.

Three independent readers assuming a capability is a demand signal, and the only two
honest responses are to build it or to stop implying it. This chooses to build it.

## Known open items

- `docauth-scope-headers` and the module docs: **closed** 2026-08-14.
- `concurrency-no-integration-checkout` fires on any repo with its integration
  branch checked out. Correct by design; it stays red until a repo genuinely
  adopts worktrees.
- ADR-0004's `unknown` state is unreachable with the current signature model.
  Either a gap worth closing or a state worth deleting; not yet decided.
