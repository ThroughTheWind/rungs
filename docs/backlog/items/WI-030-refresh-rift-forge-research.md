---
id: WI-030
title: Refresh Rift Forge research from the candidate branch
type: docs
status: done
branch: feature/WI-030-refresh-rift-forge-research
created: 2026-08-15
updated: 2026-08-15
related: [WI-009, WI-017, WI-029]
epic:
children: []
---

## Proposal (rationale)

The existing Rift Forge extraction was surveyed on 2026-08-14 against a detached working tree and
records 3,236 commits, 401 branches, 51 live worktrees, 13 skills, 69 scripts, and 102 live work
items. The local `candidate/0.1.0` branch has since advanced materially and is the branch the source
repo calls its active candidate. Those claims are now stale unless re-derived from that ref.

This item refreshes the extraction against the candidate branch, preserving the original research
boundary while making the evidence reproducible at a full commit SHA. It is a research correction,
not a module or product change.

## Decision

`accepted` — 2026-08-15. The local `candidate/0.1.0` branch is the requested authority; its full
SHA and divergence from the stale remote-tracking ref will be recorded before any conclusion is
drawn.

## Plan

### Requirements

- Pin the local `candidate/0.1.0` ref to a full commit SHA, record its read date, branch/ref, commit
  count, and the candidate-vs-remote-ref relationship.
- Re-read the candidate's own instructions, backlog/session/worktree workflow, skills, gates,
  release posture, and generated-artifact rules before updating the extraction.
- Recompute every headline inventory claim retained in the refreshed extraction with a named command
  and date; distinguish current candidate facts from historical observations.
- Record changed, retired, and newly introduced practices with file paths and commit evidence, while
  marking interpretation as **Opinion** in the first person.
- Check direct dependent research claims for the old Rift Forge counts and update or explicitly mark
  each one stale; do not silently leave contradicted numbers in the synthesis/index.
- State the candidate checkout's licence evidence explicitly; do not infer a licence from metadata.

### Impacts

- Primary artifact: `docs/research/repos/rift-forge.md`.
- Possible direct dependent updates under `docs/research/` where the old Rift Forge counts or branch
  posture are repeated; no changes to `modules/`, CLI source, or the Rift Forge checkout.
- Site content and link-check surface change because research documents are published as wiki pages.
- Research claims may change pattern confidence in a later synthesis, but this item does not edit the
  pattern catalogue or shipped modules.

### Approach

Use a temporary detached worktree at the local `candidate/0.1.0` ref so the source checkout and its
existing worktrees are not switched or mutated. Run the candidate's own inventory and self-test
commands where dependencies permit, supplementing with read-only Git/tree measurements. Compare the
new evidence against the 2026-08-14 extraction, then update only claims that the candidate checkout
supports. If the local candidate and `origin/candidate/0.1.0` diverge, treat the requested local
candidate ref as the authority and record the divergence rather than blending the trees.

### Acceptance criteria / tests

1. `docs/research/repos/rift-forge.md` identifies `candidate/0.1.0`, a full SHA, read date, source
   checkout, and licence evidence, and every retained headline count has a reproducible command/date.
2. The refreshed document covers the current candidate's setup, working practices, failure/retirement
   evidence, pain-point table, and extraction verdict; changed or retired practices are not hidden by
   copying the old narrative forward.
3. A repository-wide search finds no unqualified stale Rift Forge headline count in direct research
   dependents; each changed claim is updated or labelled historical/stale with a reason.
4. The source checkout remains unchanged and no `modules/` or CLI implementation files change.
5. `rungs check`, site build, and site link/type checks pass with zero broken links; the refresh's
   evidence and limitations are recorded in the work item review.

### Out of scope

- Editing or merging the Rift Forge candidate branch, its working tree, or its remote.
- Re-running the six public-framework extractions or changing `pattern-catalog.md`/modules/; open a
  follow-up item if refreshed evidence changes a catalogue decision.
- Reconstructing every historical branch or every product feature; only claims used by the extraction
  and its direct dependents are in scope.

## Execution

`completed` — 2026-08-15. Candidate anchor established before editing:

- Local `candidate/0.1.0` is `4a51848cfc9a2acbcdeddcd028418572406e2950`, 3,585 commits, dated
  2026-08-15, with tip `Merge WI-790: route coverage rows to live owners`.
- `origin/candidate/0.1.0` is the older `159f9f030c32df6828c16b3637ae572513d34d4e` (3,262
  commits). The requested local candidate is authoritative; the remote-tracking divergence is
  recorded rather than blended.
- The existing source checkout is detached at `472d45ed`; research will use a temporary worktree at
  the candidate ref and will not switch or mutate that checkout.

Evidence gathered on 2026-08-15 from the temporary candidate worktree:

- Inventory: 3,585 commits (`git rev-list --count`), first commit `21b71fa2` on 2026-07-29,
  candidate tip `4a51848c` on 2026-08-15; 433 branches; 105 registered worktrees. The candidate's
  `worktrees.mjs` report measured 80 prunable, 16 merged-but-dirty, and 13 dirty for 10+ days
  (oldest 12 days).
- Repository surfaces: 14 skills; 85 `.github/scripts/*.mjs`; 181 package scripts (58 `check:`,
  46 `test:`, 30 `report:`, 7 `gen:`); 16 specs; 25 ADRs; 163 live + 537 archived work items;
  3 active + 2 archived sprints; `CLAUDE.md` 555 lines; `PROJECT-STATE.md` 1,223 lines; 74 open
  finding rows and 200 archived finding sections.
- Candidate-vs-checkout delta: 66 commits after `472d45ed`, including WI-829's history split,
  F-323's shared status predicate and `land` preflight, F-360's self-declared-finding closure gate,
  WI-790's live triage-owner enforcement, and WI-772's product-language enforcement ledger.
- Candidate self-tests passed: `verify.mjs --self-test` (7 path/tier, 122 gate paths, cache contract),
  `land.mjs --self-test` (4 lock + 5 verdict + 8 worktree-guard + 10 status-preflight),
  `session-start.mjs --self-test` (6 unclaimed-id + 16 claim-boundary),
  `check-working-rules.mjs --self-test` (29 cases), and `check-ids.mjs` (700 items, 25 ADRs, 5
  sprints, no duplicates/dangling citations).
- `pnpm verify --fast` completed 111/113 gates. The two failures (`product-language` and
  `product-language-self`) were attributed as inherited because the temporary worktree has no
  installed `typescript` package; they are recorded as an environment limitation, not introduced by
  this research change.
- Licence evidence: candidate root has no `LICENSE`, `LICENCE`, `COPYING`, or `NOTICE`, and root
  `package.json` has no `license` field. The research therefore says licence **not established** and
  makes no all-rights-reserved or open-source inference.
- Source safety: only `docs/research/**` and this work item are changed in this repository; no files
  under the Rift Forge source checkout or `modules/`/CLI implementation files were edited.

## Review

`approved` — 2026-08-15.

### Acceptance review

1. **Met.** `docs/research/repos/rift-forge.md` pins local `candidate/0.1.0` to the full
   `4a51848cfc9a2acbcdeddcd028418572406e2950`, names the source checkout and read date, records the
   local-vs-remote divergence, and states that licence evidence is not established. Headline counts
   have named read-only commands and a 2026-08-15 measurement note.
2. **Met.** The extraction now covers current setup, 14 skills, 85 scripts, 181 package scripts,
   current gates/skills, the candidate delta (WI-829, F-323/F-360, WI-790, WI-772), failure and
   retirement evidence, current worktree pain, a refreshed pain table, and an updated verdict. The
   former 1,513-line/401-branch/51-worktree claims remain only as explicitly historical comparisons.
3. **Met.** `docs/research/README.md`, `synthesis.md`, `harness-landscape.md`, `repos/hexguard.md`,
   and `pattern-catalog.md` were searched for the old Rift Forge headline counts. Current comparison
   claims now use candidate measurements; incident counts that explain the historical design are
   labelled as pre-refresh evidence.
4. **Met.** `git -C C:\Development\Repositories\rift-forge status --short --branch` remained clean;
   no files under that checkout, `modules/`, or CLI implementation changed.
5. **Met with one recorded limitation.** `npm run rungs -- check`: 20 pass / 0 fail; site
   `npm run build`: 89 pages built (pre-existing duplicate-content-id warnings); site `npm run check`:
   0 Astro diagnostics and 1,134 internal links / 0 broken. `npm test`: 5 pass. Candidate
   `pnpm verify --fast`: 111/113 gates completed, with the two inherited missing-`typescript`
   product-language failures recorded in Execution rather than hidden.

The review is limited to research and evidence propagation. No source-repository mutation, module
change, or catalogue decision was smuggled into the item; follow-ups remain available if the refreshed
candidate evidence changes a pattern decision later.
