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
| **6** | Dogfood | 🟡 Detection [verified on all four](design/detection-verification.md); rungs runs on itself; **a real install into a source repo is outstanding** |
| **7** | Distribution | ⬜ npm publish, docs site, module registry |

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

**Phase 6.** `rungs add` has been dry-run against `rift-forge` (adopts 16
validators) and `axiom-mesh` (adopts 7 PowerShell validators, no root
`package.json` added). Neither has been written to. The remaining test is a real
install, diffed against what that repo built by hand.

**Phase 7.** Publishing, a docs site, and a module registry so third-party
modules are possible — the format is a plain directory precisely so that does
not need a format change.

## Known open items

- `docauth-scope-headers` and the module docs: **closed** 2026-08-14.
- `concurrency-no-integration-checkout` fires on any repo with its integration
  branch checked out. Correct by design; it stays red until a repo genuinely
  adopts worktrees.
- ADR-0004's `unknown` state is unreachable with the current signature model.
  Either a gap worth closing or a state worth deleting; not yet decided.
