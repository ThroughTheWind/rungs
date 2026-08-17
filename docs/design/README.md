# Design

What the CLI is, and how it is specified.

| Document | Status |
| --- | --- |
| [`product-brief.md`](product-brief.md) | **Written 2026-08-14.** What it is · scaffold model · module boundary · output contract · CLI surface · upgrade story · non-goals · decisions |
| [`module-catalog.md`](module-catalog.md) | **Written 2026-08-14.** The 15-module set: rung · deps · params · what each ships · install profiles · **the corpus expectation matrix** (Phase 6's acceptance criterion) |
| `cli-surface.md` | **Never written.** Planned for Phase 5 as detailed command behaviour beyond the brief's summary; Phase 5 closed without it. The nine commands are specified in [`product-brief.md`](product-brief.md) §6 and their current behaviour is `rungs --help`. Recorded rather than deleted — a planned document that was not needed is a finding about the plan |
| [`parameters.md`](parameters.md) | **Written 2026-08-15.** What a module parameter is and how to set one. Deliberately lists none of them — `rungs modules --params` renders the list from the manifests, so there is no second inventory to go stale |
| [`rift-forge-capability-matrix.md`](rift-forge-capability-matrix.md) | **Written 2026-08-15 for WI-031.** Evidence-pinned portability decisions for the refreshed Rift Forge candidate; one adopted engine and explicit deferred adapter boundaries |
| [`WI-032-claim-inventory.md`](WI-032-claim-inventory.md) | **Written 2026-08-15 for WI-032.** Source/date/command inventory for synchronized README, roadmap, module, and frontend claims |
| [`cross-repo-evidence-2026-08-16.md`](cross-repo-evidence-2026-08-16.md) | **Written 2026-08-16 for [WI-041](../backlog/items/WI-041-decide-cross-repo-evidence.md).** Whether rungs may hold evidence gathered across repositories — the case *for* at its strongest, the three things the phrase covers, and why only one is refused. Produced the amendment to ADR-0005 Tier C |
| [`explain-census-2026-08-16.md`](explain-census-2026-08-16.md) | **Written 2026-08-16 for [WI-053](../backlog/items/WI-053-false-positive-census.md).** The measured false-positive rate of `doctor --explain` across every repository on this machine — 2,291 findings, 0 wrong — with the classifier's own self-test, per-repo SHAs, and an explicit statement of what a one-operator corpus cannot prove |
| [`external-review-2026-08-16b.md`](external-review-2026-08-16b.md) | **Written 2026-08-16 for [WI-048](../backlog/items/WI-048-act-on-second-external-review.md).** The same reviewer's re-assessment after WI-037 shipped, adjudicated against the working tree *and the live site*. Records the one claim that was wrong — the deployed site is current — and the two surfaces that genuinely were stale, which they missed |
| [`external-review-2026-08-16.md`](external-review-2026-08-16.md) | **Written 2026-08-16 for [WI-037](../backlog/items/WI-037-act-on-external-review.md).** An outside review of the public repo and docs site, recorded in full and adjudicated claim by claim against the working tree — retained, partly, rejected, noted — including the two places it argues against an accepted ADR |
| [`release-runbook.md`](release-runbook.md) | **Written 2026-08-17 while preparing v0.2.0.** The concrete release procedure for *this* repository — version decision, gating, changelog assembly, the surfaces no gate checks, and the irreversible tag/publish steps. Six traps, each one measured here rather than imagined. The portable procedure it defers to is [`cut-release`](../../modules/release/skills/cut-release/SKILL.md) |
| [`release-readiness.md`](release-readiness.md) | **Assessed 2026-08-15 for WI-033.** Evidence record, not an approval: the dimension-by-dimension adoption assessment that found the clean-consumer bin failure v0.1.1 then fixed |
| [`detection-verification.md`](detection-verification.md) | Detection results against all four source repos — Phase 6's acceptance evidence |
| [`web-design-system-prompt.md`](web-design-system-prompt.md) | **Written 2026-08-14.** Phase 7 working artifact, authoritative for nothing: the brief for a design system covering the landing page, the wiki, and contribute. The system it produces is what becomes authoritative |

Decisions live in [`../decisions/`](../decisions/README.md). The one that settles the output
contract is [ADR-0001](../decisions/ADR-0001-multi-harness-rendering.md).
