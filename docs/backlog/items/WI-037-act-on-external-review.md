---
id: WI-037
title: Act on the 2026-08-16 external review
type: epic
status: done
branch:
created: 2026-08-16
updated: 2026-08-16
related: [ADR-0001, ADR-0002, ADR-0004, ADR-0005, ADR-0006]
epic:
children: [WI-038, WI-039, WI-040, WI-041, WI-042, WI-043]
---

## Proposal (rationale)

An outside reviewer read the public repo and the docs site on 2026-08-16 and produced the first
assessment of this project by someone who did not build it. It is recorded and adjudicated in
[`docs/design/external-review-2026-08-16.md`](../../design/external-review-2026-08-16.md); this
epic is the work that survived that adjudication.

Four things came out of it, and **only one is a capability gap**:

1. **`doctor` cannot answer the question that would sell it.** The detectors for "which of your
   agent rules say MUST and have no gate", "how many near-identical CI workflows", "which topics
   have conflicting authorities" already exist — as gates, inside modules, reachable only *after*
   installing the thing the analysis is supposed to justify. That is backwards for a retrofit-first
   tool, and the fix is smaller than the review assumed because nothing new has to be invented.
   → [WI-038](../archive/WI-038-doctor-explain-detectors.md)
2. **A repo running its work in GitHub Issues is detected as having no backlog**, so `doctor`
   proposes a Markdown one beside it. The review read this as rungs wanting to own work state; the
   real cause is a single missing `[[detect.paradigm]]` on the `backlog` module, and
   [ADR-0004](../../decisions/ADR-0004-adoption-detection.md) already shipped the mechanism.
   → [WI-039](../archive/WI-039-external-tracker-paradigm.md)
3. **The public surfaces contradict each other on the first command a new user runs.** The site
   says `add` first; the README and getting-started say `doctor` first. A reader who checks two
   sources gets two answers, and the wrong one is the one that installs files.
   → [WI-040](../archive/WI-040-public-surface-first-command.md)
4. **The review's headline strategic recommendation is refused by an accepted ADR.** Cross-repo
   pattern-frequency counts are Tier C in
   [ADR-0005](../../decisions/ADR-0005-self-instrumentation.md), permanently and including opt-in.
   That deserves a decision on the record rather than silence.
   → [WI-041](WI-041-decide-cross-repo-evidence.md)

**Why this is worth a release.** Three of the four are corrections to things that already exist,
and the epic is deliberately shaped by the review's ninth claim — that the design corpus is far
ahead of any evidence that anyone needs all of it. So the constraint below is the point of the
epic, not a caveat on it.

## Decision

`accepted` — 2026-08-16. The user supplied the review and directed that an epic be prepared for the
next release acting on it. The adjudication that selected these four from the review's eighteen
claims is [`external-review-2026-08-16.md`](../../design/external-review-2026-08-16.md) §1;
claims verdicted **rejected**, **noted**, or **partly** with the remedy declined are not in scope
here and their reasons are in that document rather than restated per item.

## Plan

### Requirements

- **The epic adds no module and no pattern.** Every child either makes an existing capability
  reachable, reconciles a surface that contradicts another surface, or puts a decision in front of
  a person. A child that finds it needs a new module has found a different item.
- Each child names the review claim it acts on by number, so the adjudication stays checkable
  rather than becoming folklore.
- No child weakens a Tier C refusal in [ADR-0005](../../decisions/ADR-0005-self-instrumentation.md)
  by implementation. WI-041 may *propose* changing it; it may not be changed by a feature landing.
- Every claim a child writes into a public surface carries its date and the command that produced
  it, per [CLAUDE.md](../../../CLAUDE.md)'s evidence rule.
- `rungs check` and the site build/link check pass at the epic boundary.

### Impacts

- **CLI:** `doctor` gains a flag and a detector path over unmanaged repos (WI-038). No new command
  is added; the review's `rungs lint agents` surface is explicitly deferred.
- **Modules:** one `[[detect.paradigm]]` block on `backlog` (WI-039). No module gains or loses a
  file, a gate, or a rung.
- **Docs and site:** the landing page, README Install, and getting-started converge on one first
  command; a glossary is added (WI-040).
- **Decisions:** ADR-0005 is either amended or explicitly reaffirmed (WI-041). Either outcome is a
  change to the decision record, not to code.
- **Risk — the one worth naming:** WI-038 runs rungs-shaped detectors over repos that never adopted
  rungs conventions. Sound evidence in a wrong frame reads as a false positive and is the fastest
  way to lose an adoption wedge. The mitigation is ADR-0004's existing bias — under-report
  deliberately — and it is an acceptance criterion, not a note.

### Approach

**Sequence: 040 → 038 → 039, with 041 independent.** WI-040 first because it is the cheapest, it
is a contradiction rather than a gap, and it settles what `doctor` is *for* before WI-038 changes
what it prints. WI-039 after WI-038 because a paradigm signature is most valuable where it changes
what `--explain` says, and WI-038 will surface whether one signature or several are needed. WI-041
is a decision item with no code and no dependency; it can run at any point and must not block a
release.

**Where the review is followed against instinct:** its judgement that the catalogue should stop
growing is adopted as this epic's first requirement, even though the follow-on research corpus
([WI-018](WI-018-follow-on-public-agent-research.md)) is already accepted and pointed the other way.
Those coexist — WI-018 produces evidence, this epic ships nothing new from it — but the tension is
recorded rather than resolved, because deciding it now would be deciding it without the evidence.

**Open:** whether `--explain` is the right surface at all, or whether the detector output belongs in
plain `doctor` with the flag controlling verbosity. WI-038 decides it against real output; the epic
does not pre-empt it.

### Acceptance criteria / tests

1. All four children reach `done`, or a child is closed with a written reason that names the review
   claim it drops.
2. `rungs doctor --explain` (or whatever surface WI-038 lands) runs against at least two of the four
   source repos and produces evidence rows with file paths, and **no score, grade, bar, or
   composite** anywhere in its output.
3. A repo whose work lives in GitHub Issues is reported as a different paradigm, not as absent, and
   `doctor` does not propose a Markdown backlog beside it.
4. The first command a new user is told to run is identical on the landing page, in README Install,
   and in getting-started; verified by reading all three after the change.
5. ADR-0005 carries a dated outcome for the cross-repo question — amended or reaffirmed — and
   [`external-review-2026-08-16.md`](../../design/external-review-2026-08-16.md) §4.2 links to it.
6. `rungs check` passes and the site builds with 0 broken links at the epic boundary.

### Out of scope

- **A `lint agents` command.** WI-038 delivers the capability; whether it deserves its own command
  name is a surface question that needs the output to exist first. No item is opened yet — the
  decision has no owner and no evidence, and opening a placeholder would make it look planned.
- **Adapters for Linear, Jira, or GitHub Issues.** Rejected in
  [`external-review-2026-08-16.md`](../../design/external-review-2026-08-16.md) §3.1 against
  [ADR-0002](../../decisions/ADR-0002-stack-and-runtime-footprint.md); WI-039 takes detection only.
  Nothing deferred — this is a refusal, not a postponement.
- **Extending `doc-authority` to systems outside the repo** (the review's "control plane, not
  database"). Recorded in §1 claim 11 as a larger product than a release. No item.
- **Renaming the tool, or any internal concept.** [ADR-0006](../../decisions/ADR-0006-the-name.md)
  settled the name; WI-040 takes branding consistency only.
- **New modules, new patterns, new research subjects.** Requirement 1 of this epic.
- **Anything the adjudication verdicted `noted`.** Those are on record in §1 and produce no work.

## Execution

**Closed 2026-08-16.** All six children `done` — WI-040, WI-038, WI-042, WI-039, WI-043, and
finally [WI-041](WI-041-decide-cross-repo-evidence.md), whose decision arrived last because it was
deliberately left for a person and produced an amendment to
[ADR-0005](../../decisions/ADR-0005-self-instrumentation.md) rather than the expected reaffirmation.

Landed in sequence order: WI-040, then WI-038.

**A fifth child was added mid-epic.** [WI-042](../archive/WI-042-link-line-references.md) came out of WI-038's
own post-merge correction — `--explain` was reporting `path/file.ts:387` code references as broken
links, 46.6% of all findings on `rift-forge`. It qualifies under this epic's first requirement (it
changes one resolution rule in an existing engine; no module, no pattern) and it had to land before
the epic could claim WI-038 worked. Adding it rather than folding it into WI-038 is the scope rule
working: WI-038 is `done` and its Review carries the correction rather than a rewrite.

## Review

Not started.
