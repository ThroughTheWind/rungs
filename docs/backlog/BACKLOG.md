# Backlog

The board. One row per live work item, grouped by status. Items live in
[`items/`](items/); finished work moves to [`archive/`](archive/).

<!-- NEXT-ID: WI-069 -->
<!-- Claim from this marker and bump it on your own branch. `rungs check` refuses a duplicate. -->

## In progress

| Id | Title | Type | Branch |
| --- | --- | --- | --- |
| [WI-061](items/WI-061-imperative-staleness-detection.md) | Detect imperatives and stale command references in agent instructions | feature | — |

## Review

| Id | Title | Type | Branch |
| --- | --- | --- | --- |
| [WI-035](items/WI-035-public-release.md) | Prepare and execute the public rungs release | chore | — |
| [WI-060](items/WI-060-release-0.2.0.md) | Prepare the v0.2.0 release and close the release-integrity findings it surfaced | chore | `feature/WI-060-release-0.2.0` |
| [WI-062](items/WI-062-concurrency-phantom-commands.md) | Decide what the concurrency module is — four commands, or the manual protocol it actually documents | chore | `feature/WI-062-concurrency-loop` |

## Planned

| Id | Title | Type |
| --- | --- | --- |

## Accepted

| Id | Title | Type |
| --- | --- | --- |
| [WI-064](items/WI-064-arena-lab-dogfood-bootstrap.md) | Bootstrap Arena Lab as the first direct Rungs consumer | epic |
| [WI-067](items/WI-067-ref-only-integration-branch.md) | Reconcile backlog state when the integration branch has no local ref | feature |
| [WI-068](items/WI-068-existing-repo-consumer-journey.md) | Gate the packaged existing-repository consumer journey | feature |

## Proposed

| Id | Title | Type |
| --- | --- | --- |
| [WI-063](items/WI-063-external-module-roots.md) | Resolve modules from roots outside the package, and record where each installed module came from | feature |

[WI-061](items/WI-061-imperative-staleness-detection.md), accepted 2026-08-17 — **the first
capability here opened because outsiders assumed it already existed.** A third external review, a
distribution plan, built four of its headline finding categories on detectors rungs does not have;
reviewer #2 had earlier read the same capability off a landing-page console block that was
fabricated, deleted by [WI-046](archive/WI-046-console-provenance.md) and now refused by
`site-transcripts-real`. Nine gates declare `applicability = "repo-content"` and what they produce
on a foreign repo is broken links, stale paths, population counts and a line budget — none of it
the thing being assumed. Two of the four categories have local measured provenance and are in
scope: imperatives (the shell-editing rule `rift-forge` broke nine times before it became a hook)
and stale command references ([F-015](FINDINGS.md) — `rungs backlog archive` named in three files
shipped to every consumer, and unimplemented). The other two are deferred until the first two have
a measured false-positive rate, because an imperative detector is a regex over prose and a regex
over prose is the shape that produced 46.6% in [WI-042](archive/WI-042-link-line-references.md).

[WI-037](archive/WI-037-act-on-external-review.md) is the second fixed epic — opened 2026-08-16 from
the first assessment of this project by someone who did not build it, recorded and adjudicated in
[`docs/design/external-review-2026-08-16.md`](../design/external-review-2026-08-16.md). Eighteen
claims were checked against the working tree; four became work. Its own first requirement is that
**it adds no module and no pattern** — every child makes an existing capability reachable,
reconciles a surface that contradicts another surface, or puts a decision in front of a person.

**Done under WI-037:** [WI-040](archive/WI-040-public-surface-first-command.md), 2026-08-16 — the
first command now agrees across the landing page, the README and getting-started, and both surfaces
show what `doctor` returns before what `rungs` installs. It found more than it was opened for: two
of the three landing-page consoles showed **fabricated output**, labelled `REAL OUTPUT` by the
component that rendered them. The external reviewer had read one of those blocks as shipped
capability, which is where the review's best claim came from. Three findings opened
([F-011](FINDINGS.md), F-012, F-013), none folded in.

[WI-038](archive/WI-038-doctor-explain-detectors.md), 2026-08-16 — `rungs doctor --explain` runs the
existing detectors over repos that never installed anything. No new detector was written; the
analysis had simply been gated behind installing the thing it exists to justify. On `hexguard` it
reports the **same incidents the research recorded by hand** — 99 near-identical workflows and 275
audit documents, against the 98 and 268 in the provenance — plus 112 broken links, all 114 findings
hand-triaged to 0 mis-framed and 0 wrong. Getting there required a rule the plan did not have: on a
repo that is not ours, only **convention-free** engines run, because the first version produced 71
findings that were true about our conventions and meaningless about their repo.

[WI-042](archive/WI-042-link-line-references.md), 2026-08-16 — opened *from WI-038's own failure*, and
the more useful half of it. Running `--explain` against `rift-forge` — which WI-038's review had
wrongly recorded as unavailable — showed **46.6% false positives**: 1,794 of 3,851 link findings
were `path/file.ts:387` code references pointing at files that were exactly there, in the form
[CLAUDE.md](../../CLAUDE.md) itself mandates. WI-038 had claimed 0%, measured with a triage script
that stripped `#anchor` and not `:line` — **the same assumption as the engine it was checking**, so
it could only ever confirm it. The engine now resolves as written, then retries without the
suffix; `rift-forge` drops to 2,057 findings at 0.0%, and no other repo moves by one.

[WI-039](archive/WI-039-external-tracker-paradigm.md) + [WI-043](archive/WI-043-add-honours-paradigm.md),
2026-08-16 — a repo running its work in GitHub Issues is reported as a *different paradigm* rather
than as having no backlog (0 false positives across the eight local repos that have a `.github/`
directory and track work in files), **and `add` now stops instead of installing over it**. WI-039
merged at `review` with that second half unmet, because
[ADR-0004](../decisions/ADR-0004-adoption-detection.md) state 5 — *"`add` prints the comparison and
stops"* — had never been implemented for **any** paradigm, including the `milestones` one that
shipped with the CLI. WI-043 implemented it and WI-039 then closed. The design question WI-043 was
opened to decide turned out not to be open: the ADR had already decided it, and choosing otherwise
would have amended an accepted decision from inside a bug fix.

WI-039's criterion 1 stays unmet on the record. No repo available here uses GitHub Issues as its
unit of work, so the positive case rests on a fixture built to match the signature — the circular
validation its own plan forbade. The negative evidence carries it; the gap is written down rather
than closed.

[WI-044](archive/WI-044-resolve-open-findings.md), 2026-08-16 — the findings register went from seven
open rows to one. Five fixed, two promoted ([WI-045](archive/WI-045-run-gate-self-tests.md),
[WI-046](archive/WI-046-console-provenance.md)), and one new: [F-015](FINDINGS.md), because
`rungs backlog archive` — which [README §8](README.md) tells contributors to use — **does not
exist**, so the 39 `done` items in `items/` were left where they are rather than moved by hand.

Two of the five fixes contradicted the row that proposed them, and both times measuring is what
caught it. F-001's proposed test ("commits ahead of base") would have **silently deleted the gate**,
because after any merge a branch is zero ahead. F-007's row recommended collapsing two gate ids;
implementing the check instead produced ten findings that were all false, and narrowing it — rather
than falling back to the collapse — kept a distinct measured incident the collapse would have
deleted. Gate count 20 → 21; tests 12 → 14.

[WI-047](archive/WI-047-backlog-archive-command.md), 2026-08-16 — `rungs backlog archive` now exists.
It was named in three files shipped into **every consumer repo**, two of them saying *"never by
hand"*, and `rungs backlog` answered *"unknown command"* — so the instruction was unfollowable
everywhere rungs had ever been installed. Implemented rather than documented away: rewriting §8
would have deleted the capability from every scaffolded repo to make one sentence true. This board
is the first thing it touched — **39 items moved, 135 links repointed across 37 files**, and the
site's 1,721 links are still 0 broken, which is the whole test. `items/` went from 47 files to 8.

Both of its bugs were caught by trialling on a throwaway clone rather than here: a doubled
destination path, and a version that wanted to rewrite **334** links across 58 files including
module templates — a repo-wide link reflow disguised as an archive.

[WI-048](archive/WI-048-act-on-second-external-review.md) is the third fixed epic — opened 2026-08-16
from a **second** review by the same outside reader, after WI-037 shipped. Recorded and adjudicated
in [`external-review-2026-08-16b.md`](../design/external-review-2026-08-16b.md). Most of it agrees
with decisions already made, including one the reviewer had argued against first time: they withdrew
their own recommendation for tracker adapters after reading why it was refused. Agreement produces
no work; five things did.

**The board was lying when that review arrived, and correcting it is why the epic contains
[WI-050](archive/WI-050-board-reconciled-gate.md).** Fourteen rows named items whose files read
`status: done` — nine under *Proposed*, five under *Planned* — and nine of them linked into
`archive/`, so the board filed work as proposed while pointing at the directory for work that can no
longer change. The reviewer asserted the framework research was done; checking them is what found
this. They were right and this file would have told them otherwise.
`backlog-merged-status` reconciles a *branch* against the status field and nothing reconciles the
*board* — the same failure one layer up, in the file every session opens first. The rows are
corrected above; the gate is WI-050's.

**Done under WI-048:** [WI-050](archive/WI-050-board-reconciled-gate.md), 2026-08-16 — the board is
now gated against the item files it names. It fires on exactly the shape that was live here when the
review arrived: *"`archive/WI-001-done.md` is under 'Proposed' but its status is 'done'"*. Gate count
21 → 22.

Its plan's requirement 4 was dropped during execution and the item records why: reporting every
undeclared heading produced **seven findings against a correct document**, because the board's
narrative sections tabulate finished work under prose headings. The typo case that requirement was
aimed at is caught precisely instead — every *declared* group must appear, so a misspelled `Propsed`
reports `Proposed` as missing rather than flagging an unfamiliar string.

[WI-049](archive/WI-049-doctor-advertises-analysis.md), 2026-08-16 — plain `doctor` now names
`--explain`, which it never did: the capability both reviews called the strongest thing here was
reachable only from `--help`. **Measuring changed the feature.** Built as specified, with a finding
count, it took plain `doctor` on `rift-forge` from **1.6s to 16.8s** — a 10× tax on the entry point
to advertise a flag, because counting means running the detectors. The plan named that fallback in
advance, so it reports the number detection already computed and runs no engine. One acceptance
criterion is recorded **unmet**: a repo where the analysis would find nothing is still told it
exists, which is incompatible with not paying the 15 seconds.

[WI-051](archive/WI-051-derive-site-claims.md), 2026-08-16 — the site's structural counts are derived
and gated instead of typed. It closes the `generate-derivable` TODO that sat directly beneath a
comment calling typed numbers *"the thing this repo has the most scar tissue about"*, in the file
that had gone stale at 20 while the registry reached 22.

Three things measurement changed. Splitting on the bare string `[[gates]]` counted the registry's own
`# [[gates]]` header examples and produced **24** — a derived number wrong in the same direction as
the typed one, which would have been worse than doing nothing. Registered and run turned out to be
different numbers, because a hook fires on a tool call rather than in the runner, so the page now
says *"23 gates register, plus 1 hook"* rather than merging them. And the run result had to be
generated too: left typed as the plan allowed, it read `23 gates register` beside `22 pass` on the
same page within minutes. The new gate caught **its own registration** as drift on its first run.

[WI-054](archive/WI-054-upgrade-registers-gates.md), 2026-08-16 — promoted from
[F-016](FINDINGS.md) and fixed the same day, because WI-050's new gate could not reach a single
existing install: `upgrade --apply` rewrote a module's files and never its gates. Reproduced end to
end on a scratch consumer first, which found a **second** defect the finding had not — the apply step
was guarded by `if (apply && stale)`, and a version that only adds a gate has no stale file, so
nothing ran at all. Registry 20 → 21 and `rungs check` 19 → 20 on that consumer. Removal was tested
rather than assumed. The record half — `.ai/rungs.toml` still names the old version — is
[F-017](FINDINGS.md), left open deliberately: the obvious fix rewrites the whole record and would
stamp our hash onto a user-diverged file, ending its protection silently.

[WI-052](archive/WI-052-detector-applicability.md), 2026-08-16 — the review's strongest technical
recommendation, and the last substantial one. *Can this detector legitimately interpret this
repository* is now a **required field on every gate**, next to its engine, with no default: an
undeclared gate does not read a foreign repo and is named. It had been two hard-coded sets of engine
names inside `explain.ts`, so a new gate inherited a reach nobody chose for it and nothing at either
declaration said so. Landed with [ADR-0007](../decisions/ADR-0007-detector-applicability.md), because
the field is required, all 41 gates changed, and third-party modules would inherit the obligation.

The criterion the item turns on is that it is a **move, not a retune**: `--explain` output is
byte-identical before and after on all four source repos, `rift-forge`'s 2,057 findings included.
Three values, each with real members — `repo-content` 8, `our-artifacts` 7, `our-schema` 26. A
boolean was rejected because it merges the two "no" cases, which is precisely the distinction that
explains a false positive to whoever reads it.

[WI-053](archive/WI-053-false-positive-census.md), 2026-08-16 — closes the epic with
[the census](../design/explain-census-2026-08-16.md): **2,291 findings across 6 repos, 0 wrong, 0
unclassified**, every one re-derived from the repository rather than from the engine that produced
it. The classifier was proven able to return every verdict *before* its results were believed —
including the exact `:line` case that defeated WI-038's triage — because a 0% rate from a check that
cannot fail is what started all of this.

Three findings about the method, none predicted. **82 directories are not 82 repos**: 63 are one
project's worktrees, and censusing them would have manufactured a sample four times the truth.
**A count against a live repo needs a commit, not a date** — `rift-forge` moved 2,057 → 1,994 in a
few hours because it took a docs merge at 19:00. And **silence has two causes**: four of the sixteen
quiet repos had *zero modules in scope* and were never examined, which is not the same as clean.

The result is deliberately undersold in its own §4. Every repo here was built by the same operator,
so it measures survival across eleven project *shapes*, not across other people — which is the test
the review actually asked for and the one thing this machine cannot run.

**[WI-048](archive/WI-048-act-on-second-external-review.md) is closed.** Four of its five children were
changed by measurement rather than by their plans, which is the epic's most useful output: a finding
count that cost `doctor` 10× its run time, a board requirement that flagged seven correct documents,
a "dated measurement" exemption that reintroduced the incoherence it existed to remove, and a corpus
four times smaller than its directory listing.

[WI-055](archive/WI-055-upgrade-updates-record.md), 2026-08-16 — the other half of the upgrade defect:
`.ai/rungs.toml` kept naming the old version, so a repo on 1.2.0 described itself as 1.1.0 and the
same upgrade was offered forever. Fixed **surgically** rather than by the obvious route, because
`writeInstallRecord` re-derives the whole record and hashes every emitted file that exists — it
would have stamped our hash onto a **diverged** file, flipping it to `current` so the next upgrade
overwrote an edit [ADR-0004](../decisions/ADR-0004-adoption-detection.md) promises never to touch. A
stale version number is cosmetic; discarding a user's edit is not. Verified with a divergence in
place: the hash survived **and** the file was still reported as diverged, because either alone
proves nothing.

[WI-045](archive/WI-045-run-gate-self-tests.md) sits at **review, not done**, 2026-08-16. The fixture
runner exists and is unit-tested, and it is **deliberately not wired into the gate**. Wired, it
reported 17 failures and every one inspected was its own harness: fixtures assume sibling files the
temp repo does not have, tokens were substituted with a placeholder that broke scan/file
correspondence, and the table section was narrowed by gate id. Twelve were proven artifacts and
fixed; **five remain untriaged** ([F-018](FINDINGS.md)).

A gate that cries wolf is deleted faster than the gate it was checking, so `rungs check` stays
honest at 23 pass and the claim that fixtures execute is not made until it is true. The counting
also corrected this item's own premise: **114 self-tests, 29 text and 85 structured across 23
shapes**, not the ~8 it estimated. The durable fix is probably a fixture format that carries its
context — a `setup` block — which is an ADR-0003 question rather than more harness.

[WI-056](archive/WI-056-triage-selftest-mismatches.md), 2026-08-16 — triaged the self-test mismatches
from 17 to 7, and **all four causes fixed were real defects in the gate set, not the harness**: the
`adr` module declared no gate for its own fully-specified `[sections]` table (F-007's shape, third
time), two fixtures were labelled for a gate that checks frontmatter while describing sections,
`adr-required-fields` was left with no `pass` fixture at all, and `[frontmatter_schema.reciprocal]`
was configured and implemented nowhere. The new `adr-sections-present` gate then found a *fifth*:
`non_empty` read any section made of subsections as empty, which is the normal shape of a long ADR.
Gate count 23 → 24.

**The recommendation in [F-018](FINDINGS.md) changed as a result.** It said *triage each by hand*;
having done a round, the advice is now to stop. Every round finds something real — so the runner is
worth having — but every round also moves which fixtures fail, and a gate whose failures shift under
it cannot block a merge. The cause is structural: a fixture describes a *fragment* and an engine
needs a *scenario*. The format needs a `setup` block, which is an ADR-0003 change.

[WI-041](archive/WI-041-decide-cross-repo-evidence.md), 2026-08-16 — the one review claim that
collided with an accepted ADR, and **the expected outcome was wrong**. Separating the three things
"cross-repo evidence" means showed that
[ADR-0005](../decisions/ADR-0005-self-instrumentation.md) Tier C's wording forbade research this
repo was **already doing**: "cross-repo aggregation" read plainly covers the fourteen public
frameworks extracted under WI-009 and WI-018, each pinned to a commit SHA. One sentence in the ADR
forbade the method another part of the repo required, and it had been there since 2026-08-14.

The bullet now refuses what it always meant — data gathered **from users** — while reading public
sources stays permitted. The local ledger is unchanged. Reopening the refused half is a
three-condition test in the ADR's revisit triggers rather than a wall, because the proposal is
reasonable and has already arrived twice. The argument, with the case *for* stated at its strongest,
is [`cross-repo-evidence-2026-08-16.md`](../design/cross-repo-evidence-2026-08-16.md).

[WI-057](archive/WI-057-selftest-setup.md), 2026-08-16 — **its own premise was wrong, and that is the
result.** F-018 had recommended giving the fixture format a `setup` block, because a fixture
describes a fragment while an engine needs a scenario. Reading all seven remaining fixtures showed
**not one of them needed a sibling file**: the recommendation had been generalised from a single
example without checking the rest, and would have produced an ADR-0003 format change for a problem
living in fifty lines of integration code.

What they actually needed: three were fixtures orphaned when the skill schema moved modules, two
were harness gaps (an array-form table, an ignored `table =` key), one is
[F-019](FINDINGS.md) — `extensions_allowed_from` configured and unread, the **fifth** rule of that
kind — and the last localised the real defect. `session-sections-present` returns `ok, ok` when the
runner is called **directly** with the same table and blocks, and `mismatch` through `gateMeta`:
same inputs, different answer. So the runner is sound and the wiring is not, and every earlier round
had been attributing wiring artifacts to fixtures. 7 → 3, and F-018 is now a bounded debugging task
with an oracle rather than an open format question.

[WI-058](archive/WI-058-skill-extensions.md), 2026-08-16 — closes [F-019](FINDINGS.md), the most
complete instance of a rule configured and unread: `[skills.work-item] extensions = { disable-model-invocation = true }`
was declared in a manifest, documented in [`modules/README.md`](../../modules/README.md), and
implemented at **four** layers' worth of nowhere — not parsed into `Manifest`, not emitted into the
`SKILL.md`, not read by the gate that polices it. `work-item` creates branches and merges, and the
stated reason for opting it out of model invocation had been inert since it was written.

Implemented at all four. The injection happens at emit, so the source skill stays spec-pure per
[ADR-0001](../decisions/ADR-0001-multi-harness-rendering.md) and the extension stays attached to the
module that took the portability cost. **Two code paths emit skills** — `emittedFiles` and
`addModule` — and patching only the first left `add` writing the un-extended file, so an install and
an upgrade would have produced different content for the same skill; found by installing into a
scratch repo and seeing the key still absent. Tests 22 → 24.

[WI-059](archive/WI-059-selftest-wiring.md), 2026-08-16 — **self-test fixtures now execute on every
`rungs check`**, closing [F-018](FINDINGS.md) and, with it, F-006 which started the chain four items
ago. ok 17 · mismatch 0 · unrun 45, and a fixture that disagrees with its engine fails the gate.

**F-018's own diagnosis was wrong, and checking it was the first step.** It claimed the runner was
sound and the wiring broken — on evidence from a direct call I had made with `engine = 'sections'`,
inferred from the gate's *name*, where the registry says `frontmatter-schema`. The two paths were
never running the same thing.

Four defects then fell out, all one family. `session-sections-present` declared an engine whose
table its own module does not contain, so it scanned nothing and **passed by examining nothing since
it shipped** — the session handoff's seven required sections had never been checked, and
`pass … 0ms` with no examined count had been printed on every run all along. `[register_schema.open]`
was read by nothing, so the Open table's Sev/Pri/Evidence rules had never been enforced. The table
matcher was a substring test, so `resolve-open-findings` inside a *filename* made a Closed section
match the Open schema. And the runner did not bridge `opted_in`.

45 fixtures still have no builder and are named on every run rather than skipped — the honest
position is that 17 of 62 executable fixtures assert something and the rest visibly do not.

[WI-046](archive/WI-046-console-provenance.md), 2026-08-16 — the site's `real output` label is now
**earned rather than asserted**, closing [F-011](FINDINGS.md). Transcripts are captured by running
each command against a fixture the capture script builds itself, committed, and checked by the
`site-transcripts-real` gate: every displayed line must appear in the capture, in order. Gate count
24 → 25.

Tested with the *actual* fabricated line — `this rule says MANDATORY and has no gate` — which was
live on the landing page for weeks and which an outside reviewer read as shipped capability. The
gate refuses it.

Two things surfaced alongside. The third console block was **not output at all**: its own `source`
read *"the procedure, not a transcript"* while the component rendered `REAL OUTPUT` above it, so it
is now a plain block with a caption saying what it is. And the versions page carried a hand-typed
table of module versions with **three already wrong** — `backlog`, `adr` and `session`, all bumped
this week — now derived from the claims snapshot. Same class WI-051 fixed for gate counts, on a page
it had missed.

WI-009's eight children are one fixed epic —
[WI-009](archive/WI-009-public-agent-framework-corpus.md) — opened 2026-08-15. The four extracted
repos share an author, so every convergence in
[`pattern-catalog.md`](../research/pattern-catalog.md) is currently one operator agreeing with
themselves; six independently-built public frameworks are the cheapest test of which patterns are
portable. Order is template → SWE-agent (which corrects the template) → the middle four in any
order → OpenHands → synthesis.

**The epic is the decision that matters.** These six are read for *architecture*, which
[`research/README.md`](../research/README.md) names as the existing corpus's explicit non-goal — so
this is a second research axis with its own directory and template, not more of the first.

[WI-018](archive/WI-018-follow-on-public-agent-research.md) was a follow-on, not an expansion of
WI-009. It gave durable memory, evaluation/optimization, local products, and interoperability
protocols separate evidence tracks before reconciling them once. **Closed 2026-08-17** — all ten
children had been `done` for some time while the epic still read `planned`, which nothing checks.

**Done since:** [WI-008](archive/WI-008-link-gate-checks-every-file.md) — promoted from F-005.
Link checking covered 72 of 89 files; a single `{{token}}` anywhere in a document exempted every
link in it. Now per-link, with code spans excluded because a quoted link is not a link.

---

## The first-user path — WI-001…007, closed 2026-08-15

Opened from one assessment of what a person meets between `npx @rungs/cli doctor` and their first
work item, worked in id order, all merged. Each was reproduced by running the tool before it was
opened and re-verified before it was closed.

| Id | What it fixed |
| --- | --- |
| [WI-001](archive/WI-001-infer-project-name.md) | Every scaffold's entry document opened `# AGENTS.md — ` with a dangling dash. The default now states its own derivation |
| [WI-002](archive/WI-002-set-flag-parsing.md) | `--set k=v` silently became a positional and `--into` ate it, reporting the user's path as an unknown module |
| [WI-003](archive/WI-003-render-reports-what-it-cannot-reemit.md) | `.ai/rungs.toml` told every scaffolded repo to do something no command performs |
| [WI-004](archive/WI-004-help-completeness.md) | `--help` omitted a real command and three real flags, and exited 1 |
| [WI-005](archive/WI-005-doctor-next-step.md) | The advertised entry point ended on fifteen `absent` lines with nothing to do next |
| [WI-006](archive/WI-006-parameter-reference.md) | 43 parameters documented nowhere; now rendered from the manifests by `rungs modules --params` |
| [WI-007](archive/WI-007-first-hour-guide.md) | No page addressed the reader holding a fresh scaffold |

Three of the items corrected a measurement in their own proposal during execution — an exit code
read from a pipeline, a count read from a truncated `head`, a link count taken on memory. Those
corrections are in the items, marked, rather than amended away.

Five findings were opened rather than folded in: F-001 (the merged-status gate fires on a
commitless branch, hit on four of seven items) and F-005 (`gates-links-resolve` passes on a broken
relative link) are the two worth acting on next. See [FINDINGS.md](FINDINGS.md).

## Deferred

| Id | Title | Revisit when |
| --- | --- | --- |
| — | | |

---

Rejected and completed items keep their files — see [`archive/`](archive/). A rejection is part of
the record, with its reason; deleting one loses the answer to "why not?" and invites the same
proposal again.
