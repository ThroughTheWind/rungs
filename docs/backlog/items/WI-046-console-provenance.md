---
id: WI-046
title: Make the site's "real output" label provable rather than asserted
type: feature
status: done
branch: feature/WI-060-console-provenance
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

This is not hypothetical. [WI-040](../archive/WI-040-public-surface-first-command.md) found **two of the three
console blocks on the landing page fabricated**, both carrying a date and a source:

- `npx @rungs/cli doctor` was shown emitting *"this rule says MANDATORY and has no gate"* — a line
  `doctor` did not produce until [WI-038](../archive/WI-038-doctor-explain-detectors.md) shipped `--explain`,
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

Branch `feature/WI-060-console-provenance`, cut from `main` at `77ec2ed`. Approach 1 — transcripts
as data — because approach 2 catches invention and not drift, and drift is what put a fabricated
`doctor` block on the landing page for weeks.

- [`site/scripts/transcripts.mjs`](../../../site/scripts/transcripts.mjs) **builds its own fixture
  repos** and runs the real command in them. A transcript captured against the author's working tree
  is not reproducible by anyone else, which is the same defect one step along.
- `npm run transcripts` writes `site/src/generated/transcripts.json` (committed, so a pristine
  checkout builds); `npm run check:transcripts` verifies the pages against it, registered as the
  `site-transcripts-real` gate. Gate count 24 → 25.

### The invariant is subset-in-order, not equality

A console box is narrow and the hero shows six lines of a forty-line `doctor` run. Requiring equality
would force the page to print everything; requiring nothing would be the status quo. So: **every
displayed line must appear in the capture, in order.**

Two refinements came from the gate rejecting honest blocks:

- **The `cmd` line is a prompt echo**, not output. Checking `npx @rungs/cli doctor` against its own
  output failed every block.
- **Substring, not equality per line.** `add concurrency` prints its refusal and the
  `--confirm-threshold` hint on one line; the page wraps it across two. Real text, rejected by an
  exact match. The looser rule still makes fabrication impossible — see Review 1.

### The third block was not output at all

`versions.astro` carried a `Console` whose own `source` read *"the procedure, not a transcript"*
while the component rendered **`REAL OUTPUT`** above it — honest in its text, contradicted by its
chrome. It is a summary of `cut-release/SKILL.md`, so it is now a plain `<pre>` with a caption
saying so. The component is vendored and could not be changed; the call site could.

### One thing found in passing

`versions.astro` also carried a hand-typed table of fifteen module versions, and **three were already
wrong** — `backlog`, `adr` and `session` were bumped this week. Now derived from the claims snapshot,
which gained a `version` field. Same class WI-051 fixed for gate counts, on a page it had missed.

## Review

Verified 2026-08-16.

**1 · A console block with invented lines fails the gate.** Tested with the *actual* fabricated line
— the one that was live on the site and that an external reviewer read as shipped capability:

```
check-transcripts: 1 console line(s) claim output that was never produced:
  index.astro: "this rule says MANDATORY and has no gate" is not in the captured
  output of `npx @rungs/cli doctor`
```

Restored, passes. **Met** — and this is the strongest available test, because it is the failure that
actually happened rather than an invented one.

**2 · The current blocks pass without being rewritten.** Both landing-page consoles match their
captures unchanged. The two matcher refinements were made because the gate was wrong about honest
blocks, not because the blocks were wrong. **Met.**

**3 · The gate states what it does not cover**, on every run:

```
It does not check that the capture is current — re-run `npm run transcripts` for that.
It matches each line as a substring, so a page may wrap or trim a long emitted line.
It says nothing about lines a page chose to omit: a subset is allowed, by design.
```

**Met.**

**4 · Gates, tests, build.** `rungs check` **25 pass · 0 fail · 0 unimplemented · 0 error**;
`npm test` 24 pass; site builds 128 routes, 2,042 links, 0 broken. Confirmed in the browser: the
landing page shows exactly two `real output ·` labels, both transcript-backed, and the versions page
shows **none** — its procedure block renders with the caption *"Summarised from
modules/release/skills/cut-release/SKILL.md. Not command output."*, and the module table now reads
`adr 1.1.0`, `backlog 1.1.0`. **Met.**

### What is still asserted rather than proved

The capture's **freshness**. `check-transcripts` reads the committed transcript rather than
re-running the CLI, because a gate that `rungs check` runs must not invoke its own runner and must
work in a pristine checkout. So a command whose output changes goes stale until someone runs
`npm run transcripts` — and the diff is at least visible in review, which the previous state was not.
Stated in the gate's own output rather than left for a reader to discover.
