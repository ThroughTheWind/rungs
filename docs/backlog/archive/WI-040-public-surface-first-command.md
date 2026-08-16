---
id: WI-040
title: Make every public surface agree on the first command, and name the vocabulary once
type: docs
status: done
branch: docs/WI-040-public-surface-first-command
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

`accepted` — 2026-08-16, as a child of [WI-037](../items/WI-037-act-on-external-review.md).

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

Branch `docs/WI-040-public-surface-first-command`, cut from `main` at `346b1de`.

### The proposal understated the defect, and this is the correction

This item was opened believing the two surfaces merely **disagreed** about the first command. They
also **fabricated the output of both commands they showed**, and that turned out to be the more
serious half.

Both hero consoles carried `date={SITE.asOf}` and a `source` command, which is the site's
convention for recorded output:

| Block | What it claimed | What the command does |
| --- | --- | --- |
| `npx @rungs/cli doctor` | *"you have an audit skill and no findings register"* · *"this rule says MANDATORY and has no gate"* · *"14 near-identical release workflows"* | Prints per-module states, matched paths, and a count. None of those three lines exists |
| `npx @rungs/cli add concurrency` | *"This repo shows 1 active session."* · *"Install anyway? [y/N]"* | Non-interactive. It skips the module and says *"Skipped — pass `--confirm-threshold` to install it."* rungs never prompts |

Verified 2026-08-16 by running both against a fresh `git init` repo with one workflow file; the
captured output is what now appears on the page.

**This inverts one of the item's own premises.** The plan's Approach says *"do not import the
review's suggested copy"* — its mock `doctor` output — on the grounds that it describes WI-038's
unbuilt behaviour. In fact the reviewer did not invent those lines: **they read them off the
landing page and reasonably concluded the capability shipped.** Claim 3 of the review, the one the
adjudication called its most valuable finding, traces directly to this block. So the instruction
was right and its reason was backwards, and the page was the source rather than the target.

The consoles were corrected here rather than deferred, because requirement 2 (*show what `doctor`
returns*) and requirement 5 (*every claim carries its date and command*) cannot be met by a block
that shows output no command produces. What was **not** taken: the mechanism that allowed it. A
`Console` with a `source` attribute asserts provenance and nothing verifies it — recorded as
[F-011](../FINDINGS.md), because a gate over the site is a different change than an editing pass.

### Changes

- **[`site/src/pages/index.astro`](../../../site/src/pages/index.astro)** — hero sub-line and page
  `description` now name `doctor`, with *"It writes nothing"* stated, since read-only is the reason
  it is safe to be first. The hero console shows real `doctor` output on an unfamiliar repo, so the
  page shows what the tool **returns** before what it **installs**. The rung-check console moved out
  of the hero into its own section with corrected, non-interactive output. The fabricated `doctor`
  section at the foot of the page is replaced by **Bring your own agent** — the comparative
  position, argued from ADR-0001 rather than from anyone's feature list.
- **[`README.md`](../../../README.md)** — opens as *"rungs CLI — repository infrastructure for
  coding agents"*; the first console is now `doctor` rather than `init . tracked`, for the same
  ordering reason; Install links the glossary; **Which agents** opens with *bring your own* and
  states that `AGENTS.md` is embraced rather than competed with.
- **[`docs/glossary.md`](../../glossary.md)** — new, routed automatically to `/wiki/glossary/` by
  [`routes.mjs`](../../../site/src/lib/routes.mjs). Nine terms, one sentence each, each handing off
  to the owning document.

### Deviations from the plan

1. **The README's first console was changed**, which the plan did not name — it lists only Install
   ordering and the opening paragraphs. Same defect as the landing page's (install shown before
   report), and leaving it would have failed requirement 1 in spirit while passing it in letter.
2. **The glossary admits nine terms, not the review's fourteen.** Five (`engine`, `ledger`,
   `render pipeline`, `admission rule`, `provenance`) do not appear on any surface a first-time
   reader meets, which §3.2 of the adjudication predicted. The page states its own admission rule so
   the next person does not add them back.
3. **[F-012](../FINDINGS.md) recorded, not fixed.** The README and ADR-0005 Tier B both say `doctor`
   quotes a never-fired gate's incident; the implementation prints it from `check`. A real
   surface/spec mismatch, but it is about which command owns a behaviour, not about which command
   comes first — a different item's question.

## Review

Verified 2026-08-16 on `docs/WI-040-public-surface-first-command`.

**1 · All three surfaces name the same first command.** Read after the change:

| Surface | First command shown |
| --- | --- |
| [`site/src/pages/index.astro`](../../../site/src/pages/index.astro) — hero sub-line, page `description`, hero console | `npx @rungs/cli doctor` |
| [`README.md`](../../../README.md) — first console block and Install | `npx @rungs/cli doctor` |
| [`docs/getting-started.md`](../../getting-started.md) | `npx @rungs/cli doctor` — already correct, unchanged |

Confirmed rendered: `http://localhost:4321/` shows *"Start read-only: `npx @rungs/cli doctor`. It
writes nothing."* directly beneath the headline, with the `doctor` console beside it. **Met.**

**2 · No `add <module>` in the hero or description.** `grep -n "add &lt;module&gt;\|add <module>"
site/src/pages/index.astro` → no matches. **Met.**

**3 · Glossary defines every above-the-fold term, none twice.** [`docs/glossary.md`](../../glossary.md)
routes to `/wiki/glossary/` (page title *"Glossary — rungs wiki"*, loaded). Nine terms; each row
hands off to the owning document rather than restating it, and the page states its own admission
rule. **Met.**

**4 · Named third-party tools cite their own documentation.** Nothing on the changed surfaces makes
a capability claim about another project. The comparative section describes only what **rungs**
does and does not do, and the one external convention named — `AGENTS.md` — is described from
[ADR-0001](../../decisions/ADR-0001-multi-harness-rendering.md) and
[`harness-landscape.md`](../../research/harness-landscape.md), which are this repo's own dated
research. **Met, by making no comparative claim that needed a citation** — a narrower reading than
the criterion anticipated, and the honest one.

**5 · Build, links, gates.** `npm run build` → 106 routes (was 105; the glossary). `npm run check`
→ 1,598 internal links, 0 broken. `node src/cli.ts check` → **20 pass · 0 fail · 0 unimplemented ·
0 error**. **Met.**

**6 · Every claim edited carries a date and a command.** Both consoles now carry `date="2026-08-16"`
and a `source` naming the exact invocation and the repo it ran against. The output was captured, not
composed — see Execution. **Met.**

### Not verified, and why

**Visual rendering was checked structurally, not visually.** `astro dev` serves no stylesheet on
Windows — 49 consecutive 403s on one page load — so the local page is unstyled and a screenshot
would show nothing useful. Content, section order, and the glossary link were confirmed through the
DOM instead: the six sections read `Status · Extracted · Install profiles · The 15 modules · The
rung check · Bring your own agent`, in that order. The cause is a pre-existing Windows path bug in
[`site/astro.config.mjs:10`](../../../site/astro.config.mjs), unrelated to this item and recorded as
[F-013](../FINDINGS.md); the production build emits the stylesheet normally.

### What this item found and did not fix

- [F-011](../FINDINGS.md) — the `Console` component renders the literal label **`REAL OUTPUT ·
  <command>`** for text nobody verified. Observed directly on the rendered page. The three blocks
  are now true; the mechanism is unchanged.
- [F-012](../FINDINGS.md) — README and ADR-0005 say `doctor` quotes a never-fired gate's incident;
  `check` is what prints it.
- [F-013](../FINDINGS.md) — the Windows dev-server stylesheet 403.

None was folded in. Each is a different change than an editing pass over public copy, and F-011 in
particular is the one worth a gate — a page that asserts provenance it cannot support is the exact
failure this repo exists to argue against, and it had shipped.
