---
id: WI-040
title: Make every public surface agree on the first command, and name the vocabulary once
type: docs
status: planned
branch:
created: 2026-08-16
updated: 2026-08-16
related: [WI-037, WI-032, WI-007, ADR-0006]
epic: WI-037
children: []
---

## Proposal (rationale)

Acts on **claims 1, 2, 7, 8, 14 and 15** of the
[2026-08-16 external review](../../design/external-review-2026-08-16.md).

The two public surfaces disagree about the first command a new user runs, and the disagreement is
current on both:

| Surface | Says |
| --- | --- |
| [`site/src/pages/index.astro:57`](../../../site/src/pages/index.astro) (and the page `description`, line 47) | *"Retrofit first: `npx @rungs/cli add <module>`, then `rungs doctor`"* |
| [`README.md:62`](../../../README.md), [`docs/getting-started.md`](../../getting-started.md) | `npx @rungs/cli doctor` |

**`doctor` first is the correct one** and is not a preference: it is read-only, it is what
[`product-brief.md` §2](../../design/product-brief.md) means by *"retrofit is the primary case"*,
and [WI-005](WI-005-doctor-next-step.md) already made it end by naming the command to run next. The
landing page tells a first-time visitor to start with the command that writes files.

Three smaller surface defects the review found, folded in because they are one editing pass over
the same pages and separating them would mean three passes over the same paragraphs:

- **Nothing brands the tool as anything but the bare word `rungs`**, while a separate `rung` CLI
  for stacked PRs exists in the same ecosystem. The npm half of this is already on record
  ([`README.md:73-77`](../../../README.md), [ADR-0006](../../decisions/ADR-0006-the-name.md)); the
  search-and-speech half is not, and costs a consistent noun phrase to fix.
- **The public vocabulary is large.** The review counted fourteen nouns; five of them appear only
  in design documents, so the honest count is nine on the first screen. Nine is still enough to
  make a landing page read as documentation for someone who already decided.
- **The comparative position is written nowhere.** How rungs relates to AGENTS.md, Spec Kit, Agent
  OS and BMAD is settled in practice — [ADR-0001](../../decisions/ADR-0001-multi-harness-rendering.md)
  and [`harness-landscape.md`](../../research/harness-landscape.md) — but an outside reader had to
  reconstruct it, and reconstructed it correctly, which means it is cheap to state and we are
  making people do it.

## Decision

`accepted` — 2026-08-16, as a child of [WI-037](WI-037-act-on-external-review.md).

## Plan

### Requirements

- The first command is **identical** on the landing page, in README Install, and in
  getting-started, and it is `doctor`.
- The landing page shows what `doctor` *returns* before it shows what rungs *installs*.
- A glossary defines each public-facing term **once** and everything else links to it — the
  [one-definition-per-concept rule](../../../CLAUDE.md) applies to the public surface exactly as it
  does to the pattern catalogue.
- A short, factual comparative section: what rungs does that a spec-driven framework does not, and
  that AGENTS.md is embraced rather than competed with. **Named tools are described from their own
  documentation or not at all** — no capability claim about another project without a citation.
- Every count or status claim touched carries its date and command, per
  [CLAUDE.md](../../../CLAUDE.md) and the precedent in
  [`WI-032-claim-inventory.md`](../../design/WI-032-claim-inventory.md).
- Consistent branding as the noun phrase, not the bare word, on titles and metadata.

### Impacts

- [`site/src/pages/index.astro`](../../../site/src/pages/index.astro): hero sub-line, page
  `description`, and the ordering of the doctor console block.
- [`README.md`](../../../README.md): Install ordering and the opening paragraphs.
- [`docs/getting-started.md`](../../getting-started.md): confirm it already leads with `doctor`;
  change nothing that [WI-007](WI-007-first-hour-guide.md) settled about the first hour.
- A new glossary page, routed by the existing wiki content config — no hand-maintained route
  ([`site/src/content.config.ts`](../../../site/src/content.config.ts)).
- **Sequencing:** WI-038 changes what `doctor` prints. Whichever lands second updates the console
  block; do not paste `doctor` output into a surface before WI-038's output is settled.

### Approach

**Reconcile, do not rewrite.** The tagline the review singled out as containing the correct
strategy — *"Your repo already stands. Reinforce it."* — stays. The defect is that the line beneath
it points at `add`.

**Write the glossary from the terms already used**, not from the design documents. A term that
appears on a public surface gets an entry; a term that appears only in an ADR does not, and if that
makes the public list short, that is the finding.

**Do not import the review's suggested copy.** Its mock `doctor` output ("12 MUST rules have no
enforcement") is a description of WI-038's unbuilt behaviour. Putting it on a page before it runs
would be a claim with no command behind it — the exact failure
[CLAUDE.md](../../../CLAUDE.md)'s evidence rule exists to prevent, on the most-read page in the
repo.

### Acceptance criteria / tests

1. All three surfaces are read after the change and name the same first command; the reading is
   recorded in Review with the three paths.
2. `grep` for `add <module>` in the site's hero and description returns nothing.
3. The glossary defines every term used on the landing page above the fold, and no term is defined
   in two places.
4. Each named third-party tool's description cites that tool's own documentation.
5. `npm run build` and `npm run check` in [`site/`](../../../site/README.md) pass with 0 broken
   links; `rungs check` passes.
6. Any count or status claim edited carries a date and the command that produced it.

### Out of scope

- **Renaming the tool or the package.** ADR-0006 settled it; this is branding consistency only.
- **Renaming internal concepts** (`engine`, `ledger`, `admission rule`, `render pipeline`,
  `provenance`). §3.2 of the adjudication declines it: they are load-bearing where precision beats
  approachability, and a rename is a repo-wide edit for a readership that never meets the term.
- **A visual redesign.** The design system is vendored and versioned
  ([`site/src/design-system/VENDORED.md`](../../../site/src/design-system/VENDORED.md)); this item
  edits content, not components.
- **Any claim about `doctor`'s future output.** WI-038's, after it runs.
- **Adoption metrics, comparisons, or positioning claims that need a number** — nothing deferred,
  these are simply not made.

## Execution

Not started.

## Review

Not started.
