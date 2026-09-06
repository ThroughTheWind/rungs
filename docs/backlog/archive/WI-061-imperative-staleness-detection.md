---
id: WI-061
title: Detect imperatives and stale command references in agent instructions
type: feature
status: done
branch: feature/WI-061-imperative-staleness-detection
created: 2026-08-17
updated: 2026-09-06
related: [WI-038, WI-042, WI-046, WI-052, WI-053, WI-085, ADR-0007, F-015]
epic:
children: []
---

## Proposal (rationale)

**Three readers in a row have assumed rungs detects unenforced instructions, and it does not.**

The landing page asserted the capability in a console block labelled `REAL OUTPUT` whose text
nobody had ever run — `this rule says MANDATORY and has no gate` — live for weeks, deleted by
[WI-046](WI-046-console-provenance.md) and now refused by the `site-transcripts-real` gate.
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
  `--explain` shipped with under [WI-038](WI-038-doctor-explain-detectors.md) is
  unchanged: `isRunnable` excludes `kind = "command"`.
- **R5. Applicability is declared per gate**, per [ADR-0007](../../decisions/ADR-0007-detector-applicability.md).
  There is no default, and a gate that has not declared does not read a foreign repo.
- **R6. The false-positive rate is measured before the detector is believed**, on the corpus and by
  the method [WI-053](WI-053-false-positive-census.md) established: every repository not a sample,
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
  [WI-042](WI-042-link-line-references.md). Every MUST inside a quotation, an example, a
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
   [WI-008](WI-008-link-gate-checks-every-file.md) had to make for links).
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
[WI-042](WI-042-link-line-references.md). Writing the engine in the same pass as the
corpus would have been the thing this item exists to correct.

One design-relevant finding: reading candidates by hand, almost all are genuine imperatives,
because instruction files are rule documents by construction. The 46.6% risk the Impacts section
flags belongs to WI-042's *all-markdown* scope; this scope is narrower and the base rate is much
higher. That is a reason to keep the scope narrow, **not** a reason to relax R6's measurement — and
two repos in the corpus contain zero candidates, which already falsifies any future claim that
instruction files always carry unenforced rules.

Remaining, none of it started: the hand-classified oracle, R7's ADR, the two engines, and the
per-repo false-positive rates against WI-053's one-in-five threshold.

**Steps 2–5, 2026-09-06**, on `feature/WI-061-imperative-staleness-detection` under
[WI-085](../items/WI-085-existing-promises-remediation.md), in the order the Approach fixed:

1. **The oracle** — [`imperative-oracle-2026-09-06.md`](../../design/imperative-oracle-2026-09-06.md).
   The corpus grep re-run at the recorded commits produced the corpus document's counts exactly
   (134 · 31 · 24 · 10 · 10 · 0 · 0); every line was read and classified rule / not-a-rule before a
   matcher existed. **It overturned the corpus document's impression**: "almost all are genuine
   imperatives" is true of the four small files and false of `rift-forge-candidate`, where 94 of 134
   candidates are project history — a naive matcher would have shipped at 70% false positives on the
   repository that dominates the count. WI-042's shape, caught before the engine this time.
2. **R7's ADR** — [ADR-0011](../../decisions/ADR-0011-instruction-detectors-assert-no-enforcement.md).
   Building the enforcement join showed it cannot be honest even where a registry exists: a gate that
   scans a file does not enforce the rule on line 40 of it, and a rule enforced by a hook or CI never
   names the file. **R2 is narrowed by the ADR**: an imperative is never "reported as having no gate".
   The census is an evidence surface — registered with `surface = "explain"`, run by
   `doctor --explain` only, never by `check`, never converted at ejection — and its rows name a file,
   a line and the modal that matched, with no word about enforcement in either direction.
3. **The engines** — `src/instruction-engines.ts`. `imperative-census`: prose lines only (fenced
   blocks, headings, code spans, link targets and HTML comments removed), a modal counted where the
   oracle's shapes say "rule": `must`/`shall` within four words of a clause head; `never`/`always`/
   `do not` at a clause head, `never` not before a noun phrase or a past participle; conjunctions
   are not clause heads. `command-reference`: code spans and shell fences, `npm|pnpm|yarn run
   <script>` against `package.json` `scripts`, `rungs <command>` in its three spellings against the
   dispatch table, absent surface means no finding. Both `repo-content`; neither runs a command.
4. **Measured against the oracle**, per repository (`.scratch/oracle-measure.mjs`), after two
   narrowings the first measurement forced (rift-forge-candidate stood at 45.3%, then 30.8%):

   | Repository | Candidates | Reported | False positives | Rate | Rules missed |
   | --- | ---: | ---: | ---: | ---: | ---: |
   | `hexguard` | 10 | 7 | 0 | 0% | 2 of 9 |
   | `hexguard-templates` | 10 | 9 | 0 | 0% | 1 of 10 |
   | `ai-cli` | 24 | 13 | 0 | 0% | 6 of 19 |
   | `rewind` | 31 | 18 | 0 | 0% | 7 of 25 |
   | `rift-forge-candidate` | 134 | 32 | 5 | **15.6%** | 13 of 40 |
   | `axiom-mesh`, `gridforge` | 0 | 0 | 0 | — | — |

   The five remaining false positives are the design-narrative `must` near a clause head ("The two
   must not be confusable"), which the oracle names as the residual no form can separate. Recall is
   74 of 103 rules (72%): `always` mid-sentence, `mandatory`/`required` as adjectives and `must`
   more than four words into a clause are the misses, each a deliberate narrowing. The command
   detector reported nothing on any of the seven repositories.
5. **Fixtures execute**: 7 census and 6 command fixtures in `modules/instructions/gates/core.toml`,
   all `ok` in the inventory (161 fixtures · 159 ok · 2 named unrun). The two phantom-command
   fixtures sit in fenced blocks because this repository's own `module-commands-exist` gate rightly
   refuses a phantom in a shipped table's code spans.

**Deviations.** R2 narrowed as above, by ADR. The census is `surface = "explain"` rather than a
runner gate, for the reason the ADR states; the site's derived counts and the runner's tier message
exclude it. The module moves to 1.4.0; this repo's registry block was re-registered.

## Review

Against each acceptance criterion, 2026-09-06, Windows 11, Node `v22.22.3`, npm `10.9.8`:

1. **Fixtures execute.** 7 census and 6 command fixtures run through their engines under the
   meta-gate (`rungs check` here: `gates-self-tests-both-directions` 28 examined, no unrun line) and in
   the all-module inventory (161 fixtures · 159 ok · 2 named unrun, none of them these).
2. **Seeded violation / correction.** `test/core.test.js` "the imperative census reports rows through
   explain only…": a registry-less repo with two rules and two narrative lines yields exactly two rows
   (`line 5: never`, `line 6: must`); the stale-command gate fails on `npm run lint` against a
   `package.json` without it and on `rungs verify` in a shell fence, and passes once both are corrected.
3. **`--explain` on the source repos** (captured before the programme's engine changes, ANSI stripped,
   diffed after): hexguard-templates `d24cf0aa` and rift-forge `846cfa06` show only added lines (the
   census rows); axiom-mesh `3e1508a8` gains rows and loses only its "No detector fired" sentence;
   hexguard `51b25dac` adds rows and carries the two WI-087 changes already recorded there. No
   pre-existing finding changed.
4. **Per-repository false-positive rate**, against the oracle, published in Execution: 0% on four
   repositories, 15.6% on `rift-forge-candidate`; every rate under WI-053's one-in-five, after two
   narrowings that the measurement forced and the Execution records. Recall 74 of 103 rules, stated
   as a limitation rather than hidden.
5. **No "unenforced" anywhere.** The same test runs `doctor --explain` through the CLI on a repo with
   no registry and asserts the output contains none of *unenforced*, *not enforced*, *no gate*,
   *has no gate*, *without a gate*. Checked by running it, as the criterion says.
6. **Gate count agrees.** Registry 33 entries; `derive()` 31 runner gates + 1 hook + 1 explain-only;
   README "its 31 gates run on every change — 31 pass"; claims snapshot regenerated and
   `site-claims-current` passes; the landing and versions pages name the explain-only detector beside
   the hook.

**Suite and gates.** Serial `node --test --test-concurrency=1 test/*.test.js` after rebuild:
**150 tests, 146 pass, 1 fail, 3 platform skips, 133 s** — the failure was the eject test asserting
that every declared entry converts, written before explain-only detectors existed; it now exempts
them alongside hooks and passes alone. `node src/cli.ts check`: 31 pass, 0 fail. Site:
`npm run build --prefix site` 169 pages; `npm run check --prefix site` 2,631 internal links,
0 broken.

**Pending.** The exact-SHA OS/Node matrix has not run: the branch is not pushed.
