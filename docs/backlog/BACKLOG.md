# Backlog

The board. One row per live work item, grouped by status. Items live in
[`items/`](items/); finished work moves to [`archive/`](archive/).

<!-- NEXT-ID: WI-044 -->
<!-- Claim from this marker and bump it on your own branch. `rungs check` refuses a duplicate. -->

## In progress

| Id | Title | Type | Branch |
| --- | --- | --- | --- |
| — | | | |

## Review

| Id | Title | Type | Branch |
| --- | --- | --- | --- |
| — | | | |

## Planned

| Id | Title | Type |
| --- | --- | --- |
| [WI-018](items/WI-018-follow-on-public-agent-research.md) | Extend public-agent research across memory, evaluation, products, and protocols | epic |
| [WI-031](items/WI-031-integrate-rift-forge-capabilities.md) | Integrate transferable Rift Forge workflow capabilities into rungs | feature |
| [WI-032](items/WI-032-sync-docs-roadmap-frontend.md) | Sync public docs, roadmap, and frontend surfaces with the current product | docs |
| [WI-033](items/WI-033-assess-quality-and-adoption-readiness.md) | Assess repo quality, improvements, and external-adoption readiness | spike |
| [WI-034](items/WI-034-remediate-readiness-findings.md) | Remediate release-readiness findings | chore |
| [WI-035](items/WI-035-public-release.md) | Prepare and execute the public rungs release | chore |

## Accepted

| Id | Title | Type |
| --- | --- | --- |
| [WI-037](items/WI-037-act-on-external-review.md) | Act on the 2026-08-16 external review | epic |

## Proposed

| Id | Title | Type |
| --- | --- | --- |
| [WI-021](items/WI-021-extract-inspect-ai.md) | Extract Inspect AI — reproducible agent evaluation and sandboxed evidence | docs |
| [WI-022](items/WI-022-extract-aider.md) | Extract Aider — git-first coding, repository context, and validation | docs |
| [WI-023](items/WI-023-extract-goose.md) | Extract goose — local extensibility, MCP/ACP, and session isolation | docs |
| [WI-024](items/WI-024-extract-google-adk.md) | Extract Google ADK — multi-language evolution, task delegation, and evaluation | docs |
| [WI-025](items/WI-025-extract-mcp.md) | Extract MCP — the tool and context interoperability boundary | docs |
| [WI-026](items/WI-026-extract-a2a.md) | Extract A2A — remote agent discovery, tasks, and artifacts | docs |
| [WI-027](items/WI-027-extract-dspy.md) | Extract DSPy — metric-driven agent program optimization | docs |
| [WI-028](items/WI-028-follow-on-research-synthesis.md) | Synthesize the follow-on research and reconcile the catalogue | docs |
| [WI-029](items/WI-029-apply-framework-patterns-to-modules.md) | Apply framework-derived patterns to shipped modules | docs |
| [WI-041](items/WI-041-decide-cross-repo-evidence.md) | Decide whether cross-repo pattern evidence is ever in scope, and record it | spike |

[WI-037](items/WI-037-act-on-external-review.md) is the second fixed epic — opened 2026-08-16 from
the first assessment of this project by someone who did not build it, recorded and adjudicated in
[`docs/design/external-review-2026-08-16.md`](../design/external-review-2026-08-16.md). Eighteen
claims were checked against the working tree; four became work. Its own first requirement is that
**it adds no module and no pattern** — every child makes an existing capability reachable,
reconciles a surface that contradicts another surface, or puts a decision in front of a person.

**Done under WI-037:** [WI-040](items/WI-040-public-surface-first-command.md), 2026-08-16 — the
first command now agrees across the landing page, the README and getting-started, and both surfaces
show what `doctor` returns before what `rungs` installs. It found more than it was opened for: two
of the three landing-page consoles showed **fabricated output**, labelled `REAL OUTPUT` by the
component that rendered them. The external reviewer had read one of those blocks as shipped
capability, which is where the review's best claim came from. Three findings opened
([F-011](FINDINGS.md), F-012, F-013), none folded in.

[WI-038](items/WI-038-doctor-explain-detectors.md), 2026-08-16 — `rungs doctor --explain` runs the
existing detectors over repos that never installed anything. No new detector was written; the
analysis had simply been gated behind installing the thing it exists to justify. On `hexguard` it
reports the **same incidents the research recorded by hand** — 99 near-identical workflows and 275
audit documents, against the 98 and 268 in the provenance — plus 112 broken links, all 114 findings
hand-triaged to 0 mis-framed and 0 wrong. Getting there required a rule the plan did not have: on a
repo that is not ours, only **convention-free** engines run, because the first version produced 71
findings that were true about our conventions and meaningless about their repo.

[WI-042](items/WI-042-link-line-references.md), 2026-08-16 — opened *from WI-038's own failure*, and
the more useful half of it. Running `--explain` against `rift-forge` — which WI-038's review had
wrongly recorded as unavailable — showed **46.6% false positives**: 1,794 of 3,851 link findings
were `path/file.ts:387` code references pointing at files that were exactly there, in the form
[CLAUDE.md](../../CLAUDE.md) itself mandates. WI-038 had claimed 0%, measured with a triage script
that stripped `#anchor` and not `:line` — **the same assumption as the engine it was checking**, so
it could only ever confirm it. The engine now resolves as written, then retries without the
suffix; `rift-forge` drops to 2,057 findings at 0.0%, and no other repo moves by one.

[WI-039](items/WI-039-external-tracker-paradigm.md) + [WI-043](items/WI-043-add-honours-paradigm.md),
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

WI-041 sits under Proposed rather than Planned on purpose: it is the one claim that collides with
an accepted ADR ([ADR-0005](../decisions/ADR-0005-self-instrumentation.md) Tier C refuses cross-repo
aggregation, including opt-in), and a spike that assumes its own outcome is not a spike.

WI-009's eight children are one fixed epic —
[WI-009](items/WI-009-public-agent-framework-corpus.md) — opened 2026-08-15. The four extracted
repos share an author, so every convergence in
[`pattern-catalog.md`](../research/pattern-catalog.md) is currently one operator agreeing with
themselves; six independently-built public frameworks are the cheapest test of which patterns are
portable. Order is template → SWE-agent (which corrects the template) → the middle four in any
order → OpenHands → synthesis.

**The epic is the decision that matters.** These six are read for *architecture*, which
[`research/README.md`](../research/README.md) names as the existing corpus's explicit non-goal — so
this is a second research axis with its own directory and template, not more of the first.

[WI-018](items/WI-018-follow-on-public-agent-research.md) is an accepted follow-on, not an expansion
of WI-009. It begins after WI-017 and gives durable memory, evaluation/optimization, local products,
and interoperability protocols separate evidence tracks before reconciling them once.

**Done since:** [WI-008](items/WI-008-link-gate-checks-every-file.md) — promoted from F-005.
Link checking covered 72 of 89 files; a single `{{token}}` anywhere in a document exempted every
link in it. Now per-link, with code spans excluded because a quoted link is not a link.

---

## The first-user path — WI-001…007, closed 2026-08-15

Opened from one assessment of what a person meets between `npx @rungs/cli doctor` and their first
work item, worked in id order, all merged. Each was reproduced by running the tool before it was
opened and re-verified before it was closed.

| Id | What it fixed |
| --- | --- |
| [WI-001](items/WI-001-infer-project-name.md) | Every scaffold's entry document opened `# AGENTS.md — ` with a dangling dash. The default now states its own derivation |
| [WI-002](items/WI-002-set-flag-parsing.md) | `--set k=v` silently became a positional and `--into` ate it, reporting the user's path as an unknown module |
| [WI-003](items/WI-003-render-reports-what-it-cannot-reemit.md) | `.ai/rungs.toml` told every scaffolded repo to do something no command performs |
| [WI-004](items/WI-004-help-completeness.md) | `--help` omitted a real command and three real flags, and exited 1 |
| [WI-005](items/WI-005-doctor-next-step.md) | The advertised entry point ended on fifteen `absent` lines with nothing to do next |
| [WI-006](items/WI-006-parameter-reference.md) | 43 parameters documented nowhere; now rendered from the manifests by `rungs modules --params` |
| [WI-007](items/WI-007-first-hour-guide.md) | No page addressed the reader holding a fresh scaffold |

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
