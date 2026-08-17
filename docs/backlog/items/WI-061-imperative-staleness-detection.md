---
id: WI-061
title: Detect imperatives and stale command references in agent instructions
type: feature
status: in_progress
branch:
created: 2026-08-17
updated: 2026-08-17
related: [WI-038, WI-042, WI-046, WI-052, WI-053, ADR-0007, F-015]
epic:
children: []
---

## Proposal (rationale)

**Three readers in a row have assumed rungs detects unenforced instructions, and it does not.**

The landing page asserted the capability in a console block labelled `REAL OUTPUT` whose text
nobody had ever run — `this rule says MANDATORY and has no gate` — live for weeks, deleted by
[WI-046](../archive/WI-046-console-provenance.md) and now refused by the `site-transcripts-real` gate.
External reviewer #2 read that block as shipped behaviour. Then a third review, on 2026-08-17,
built an entire distribution plan on four finding categories: unenforced MUST/SHOULD, stale
command references, duplicated path-scoped rules, and conflicting authority. rungs produces none
of them.

Nine gates declare `applicability = "repo-content"` and so may read a repo that is not ours
(`grep -rho 'applicability *= *"[a-z-]*"' modules/ | sort | uniq -c`, 2026-08-17). What they find
on a foreign repo is broken links, stale paths in code spans, file-population counts and a line
budget. All real; none of them the thing being assumed.

Three independent readers converging on a capability is a demand signal that arrived by accident,
and there are only two honest responses: build it, or stop implying it. **This builds it** — and
the fabricated console block is the argument for building it carefully, since the last thing that
claimed this capability was marketing copy.

The provenance is local and measured, which is the bar [`modules/README.md`](../../../modules/README.md)
sets:

- **Imperatives.** [CLAUDE.md](../../../CLAUDE.md)'s shell-editing rule was inherited from
  `rift-forge`, which measured six occurrences and six repair passes in one session, documented it,
  was broken three more times, and only then added a `PreToolUse` hook. The rule's own text says
  *"prose has already been tried"*.
- **Stale command references.** [F-015](../FINDINGS.md): `rungs backlog archive` was named in three
  files shipped into **every consumer repo**, two of them saying *"never by hand"*, and the command
  did not exist. The instruction was unfollowable everywhere rungs had ever been installed.

## Decision

`accepted` — 2026-08-17, by explicit request, on the roadmap review that produced the demand
evidence above. Scoped to the two categories with local measured provenance; the other two are
refused here with reasons under *Out of scope*.

## Plan

### Requirements

- **R1. An imperative census.** A `repo-content` gate reports each imperative in a repo's agent
  instruction files with its file and line, and the modal verb that matched. Evidence rows, per
  [ADR-0005](../../decisions/ADR-0005-self-instrumentation.md) — never a score, never a total
  presented as a grade.
- **R2. "Unenforced" is only ever claimed where enforcement is visible.** On a repo with a gate
  registry, an imperative may be reported as having no gate. On a repo without one, the finding
  states the count and **names what it cannot see**. This is the requirement the whole item turns
  on: *"8 of 17 have no mechanical enforcement"* is not a statement anyone can make about someone
  else's repository from its markdown, and shipping it would re-commit the fabrication that started
  this.
- **R3. Stale command references.** A command named in a code span or fenced block of an
  instruction file, whose *surface exists and does not contain it*, is reported — `npm run x`
  against `package.json` `scripts`, and the same shape for any other surface that is read, never
  guessed. Absent surface means no finding, not a finding.
- **R4. Nothing is executed.** No command the repo owns is run, in either direction. The rule
  `--explain` shipped with under [WI-038](../archive/WI-038-doctor-explain-detectors.md) is
  unchanged: `isRunnable` excludes `kind = "command"`.
- **R5. Applicability is declared per gate**, per [ADR-0007](../../decisions/ADR-0007-detector-applicability.md).
  There is no default, and a gate that has not declared does not read a foreign repo.
- **R6. The false-positive rate is measured before the detector is believed**, on the corpus and by
  the method [WI-053](../archive/WI-053-false-positive-census.md) established: every repository not a sample,
  a classifier proven able to return every verdict *before* its results are read, per-repo rates,
  never pooled.
- **R7. An ADR** for R2, because *what a detector may assert about a repository whose enforcement
  surface it cannot see* is a decision that binds every future detector, not this one only.

### Impacts

- `src/engines*.ts` — two new engines. `src/explain.ts` — no change expected; the foreign-repo
  filter already reads the declared `applicability`, which is why WI-052 was worth doing.
- `modules/instructions/` — the gates and their `[provenance]`. **No new module and no new
  pattern**, the standing constraint of the last two review epics.
- `.ai/gates.toml`, the derived site claims, and the README's gate-count sentence — all now gated
  against each other, so the count moves in one change or `rungs check` goes red.
- **Risk, and it is the main one:** an imperative detector is a regex over prose, and a regex over
  prose is exactly the shape that produced 46.6% false positives in
  [WI-042](../archive/WI-042-link-line-references.md). Every MUST inside a quotation, an example, a
  changelog entry or a code span is a candidate false positive, and the acceptance test must not
  share the engine's assumption about which — that sharing is what made WI-038's triage unable to
  fail.

### Approach

1. **Corpus first, engine second.** Before writing a matcher, collect every modal-verb line from
   the census corpus by hand and classify what a *correct* detector should say about each. That set
   is the oracle. Built the other way round, the oracle inherits the matcher's blind spots — the
   documented failure this repo exists because of.
2. **Imperative census** as a `file-scan` shaped engine: modal verbs in instruction files, code
   spans and fenced blocks excluded (a quoted MUST is not a rule — the same correction
   [WI-008](../archive/WI-008-link-gate-checks-every-file.md) had to make for links).
3. **The enforcement join, second and separately.** Where `.ai/gates.toml` exists, an imperative is
   reported alongside whether any gate names the file it lives in. Where it does not, the finding
   says so in its own text. Two gates, not one flag, so the foreign case cannot inherit the local
   case's confidence by accident.
4. **Command references** by resolving against surfaces actually read, starting with `package.json`
   `scripts` — the narrowest surface with the clearest answer, and the one F-015's incident had.
5. **Measure, then decide whether to keep each.** A class above roughly one in five on any single
   repo is not shipped; it is narrowed or dropped. WI-053's threshold, reused deliberately.

Open, and to be settled by R7's ADR: whether the foreign-repo finding is worth reporting at all
once it cannot say "unenforced". A count of imperatives with no verdict attached may be true and
useless — which is [the census's §5 question](../../design/explain-census-2026-08-16.md), arriving
here from the other direction.

### Acceptance criteria / tests

1. Both engines have self-test fixtures that **execute** under `gates-self-tests-both-directions` —
   not declared-and-unrun, which is [F-006](../FINDINGS.md) and cost four items to close.
2. Each new gate fails on a seeded violation and passes when it is corrected, verified by seeding.
3. `--explain` output on all four source repos changes **only** by the addition of the new
   detectors' findings; every pre-existing finding is byte-identical. WI-052's criterion, reused.
4. A per-repo false-positive rate is published for each new detector across the census corpus, with
   the classifier's own capability proof, as in
   [`explain-census-2026-08-16.md`](../../design/explain-census-2026-08-16.md) §3.
5. On a repo with no gate registry, no output of any command contains the word *unenforced* or any
   synonym asserting the same thing. Checked by running it, not by reading the source.
6. `rungs check` green; the gate count agrees across the registry, the site claims and the README
   in the same change.

### Out of scope

- **Duplicated path-scoped rules**, and **conflicting document authority** — the review's other two
  categories. Both are deferred rather than refused: `doc-authority` already ships
  `docauth-working-rules` on a `rule-propagation` engine for the authority case, so the question is
  whether that gate should become foreign-safe rather than whether a new detector is needed, and
  nothing here has measured it. No follow-up item is opened until R6's measurement says whether
  this item's two detectors survive contact — opening four detectors before the first two have a
  false-positive rate is the mistake this plan is arranged to avoid.
- **Any use of these findings in launch or marketing material.** The demand evidence came from a
  fabricated console block; the detector's first appearance on a public surface must be captured
  output under `site-transcripts-real`, and that is a separate change.
- **Telemetry of any kind**, including counts of what fires in users' repos.
  [ADR-0005](../../decisions/ADR-0005-self-instrumentation.md) Tier C (a), refused permanently and
  re-argued in [`cross-repo-evidence-2026-08-16.md`](../../design/cross-repo-evidence-2026-08-16.md).

## Execution

**Step 1 of the Approach only — the corpus.**
[`docs/design/imperative-corpus-2026-08-17.md`](../../design/imperative-corpus-2026-08-17.md),
2026-08-17. 102 local repositories, 110 instruction files, candidate counts per *distinct* repo
because the file count is dominated by one project's worktrees and a pooled rate would be one
document counted forty times.

**No detector has been written, deliberately.** The Approach says corpus first, engine second, and
an oracle built after the matcher inherits the matcher's blind spots — the documented failure in
[WI-042](../archive/WI-042-link-line-references.md). Writing the engine in the same pass as the
corpus would have been the thing this item exists to correct.

One design-relevant finding: reading candidates by hand, almost all are genuine imperatives,
because instruction files are rule documents by construction. The 46.6% risk the Impacts section
flags belongs to WI-042's *all-markdown* scope; this scope is narrower and the base rate is much
higher. That is a reason to keep the scope narrow, **not** a reason to relax R6's measurement — and
two repos in the corpus contain zero candidates, which already falsifies any future claim that
instruction files always carry unenforced rules.

Remaining, none of it started: the hand-classified oracle, R7's ADR, the two engines, and the
per-repo false-positive rates against WI-053's one-in-five threshold.

## Review

Not started — the item is at step 1 of 5.
