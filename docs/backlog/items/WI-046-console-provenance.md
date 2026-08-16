---
id: WI-046
title: Make the site's "real output" label provable rather than asserted
type: feature
status: proposed
branch:
created: 2026-08-16
updated: 2026-08-16
related: [WI-040, WI-044, F-011]
epic:
children: []
---

## Proposal (rationale)

Promoted from [F-011](../FINDINGS.md), 2026-08-16.

The site's `Console` component takes `date` and `source` and renders them as the literal label
**`real output · <command>`**. Nothing checks that the lines beneath it were ever produced by that
command.

This is not hypothetical. [WI-040](WI-040-public-surface-first-command.md) found **two of the three
console blocks on the landing page fabricated**, both carrying a date and a source:

- `npx @rungs/cli doctor` was shown emitting *"this rule says MANDATORY and has no gate"* — a line
  `doctor` did not produce until [WI-038](WI-038-doctor-explain-detectors.md) shipped `--explain`,
  weeks later.
- `npx @rungs/cli add concurrency` was shown prompting `Install anyway? [y/N]`. rungs is
  non-interactive; the real path skips the module and names `--confirm-threshold`.

The external reviewer read the first block, concluded the capability shipped, and built their
strongest recommendation on it. The three blocks are correct now; **the mechanism that let them
drift is untouched**, and the next console added has the same hole.

A page asserting provenance it cannot support is precisely what
[CLAUDE.md](../../../CLAUDE.md)'s evidence rule exists to prevent, on the most-read surface in the
repo — and the component's own fallback for a missing date already says *"unverified output — date
the transcript"*, so the design knew the distinction and made the wrong half the easy one.

## Decision

Undecided, and the constraint that shapes it is worth stating before anyone plans this: the
component is **vendored**. `site/src/design-system/` is generated, says "do not edit any file in this
directory", and is now sha-gated by `site-vendored-unedited`. Its source export is gitignored and
not in this checkout. So the interim F-011 suggested — rename `source` so it stops implying
provenance — cannot be done from the repo. Any fix is either a re-vendor from the design tool or
something that lives at the call sites.

## Plan

> Filled on acceptance.

### Requirements

- A console block claiming recorded output is **traceable to a captured transcript**, or it does not
  get the label.
- Adding a block with invented lines fails a gate rather than a review.
- The check works without a network and without running the CLI at build time, or if it does run the
  CLI, it does so against a fixture rather than the author's machine.

### Impacts

- [`site/src/pages/index.astro`](../../../site/src/pages/index.astro) and any other call site.
- Possibly `site/src/design-system/` — which means a re-vendor, not an edit.
- A new gate, and a place for captured transcripts to live.

### Approach

Two candidates, to be decided with the constraint above in front of whoever decides:

1. **Transcripts as data.** Captured output lives in a checked-in file per command; the page reads
   it and the component renders it. A gate re-runs the command against a fixture repo and diffs.
   Strongest, and it is the `generate-derivable` pattern the landing page's own `MODULES` array is
   already a `TODO` against.
2. **Call-site gate only.** Every `Console` carrying `source` must name a transcript file that
   exists and whose recorded command matches. Cheaper, catches invention, does not catch drift after
   the command's output changes.

### Acceptance criteria / tests

1. A console block with invented lines fails a gate.
2. The three current blocks pass without being rewritten — they are already true.
3. The gate states what it does not cover.
4. `rungs check`, `npm test`, and the site build pass.

### Out of scope

- **Re-checking the three current blocks by hand.** WI-040 did that; this is about the mechanism.
- **Any other design-system change.** A re-vendor for this reason only, if a re-vendor happens.

## Execution

Not started.

## Review

Not started.
