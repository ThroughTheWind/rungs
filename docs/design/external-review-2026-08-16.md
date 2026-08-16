# External review, 2026-08-16 — record and adjudication

> **Authoritative for:** what an outside reviewer said about rungs on 2026-08-16, and which of
> those claims survived checking against this checkout. **Not authoritative for:** what rungs is
> (that is [`product-brief.md`](product-brief.md)), any decision it recommends (those are ADRs),
> or the work that acts on it ([WI-037](../backlog/items/WI-037-act-on-external-review.md)).

An unsolicited review of the public repo and the docs site arrived on 2026-08-16. It is recorded
here rather than summarized into a backlog item, because **the parts that were wrong are as useful
as the parts that were right** — and a review that only survives as the items it produced cannot be
re-read when a later decision contradicts it.

## What this document treats the review as

**A claim about this repo, not evidence about it.** The reviewer read the public README, the docs
site, and a handful of linked documents from outside; every statement below was re-derived against
the working tree on 2026-08-16 before being retained. Where the review and the checkout disagree,
the checkout is what shipped.

Two limits on the source, stated once so no row has to repeat them:

- **It could not run the tool.** Every claim about behaviour is inferred from prose. This is why
  three of its sharpest observations are directionally right and mechanically wrong — it describes
  capabilities as missing that exist but are unreachable, which is a different defect with a much
  cheaper fix.
- **Its adoption evidence is a snapshot with no date and no command.** "0 stars and 0 forks" is
  the kind of number [CLAUDE.md](../../CLAUDE.md) requires a date and a command for. It is not
  retained as a measurement; it is retained as the reviewer's read of *earliness*, which is not in
  dispute — first publication was 2026-08-14.

## The reviewer's scores

Reproduced because they are the review's own summary of itself. **These are opinion, unmeasured,
and this document does not adopt them** — there is no instrument here that produces a 6.5.

| Area | Reviewer's score |
| --- | ---: |
| Core problem | 8.5/10 |
| Product concept | 8/10 |
| Technical design | 8.5/10 |
| Differentiation | 7/10 |
| Current onboarding | 6/10 |
| Messaging | 6.5/10 |
| Adoption readiness | 4.5/10 |
| Long-term potential | 8/10 |

The scores are also, notably, the thing this repo's own [ADR-0005](../decisions/ADR-0005-self-instrumentation.md)
refuses to emit about anyone else's repo. That symmetry is not an argument against the reviewer —
it is the reason §"Where the review argues against an accepted decision" exists below.

---

## 1. Adjudication

Verdicts: **retained** (accurate and actionable) · **partly** (the observation holds, the proposed
remedy does not) · **rejected** (checked and false, or blocked by an accepted decision) ·
**noted** (opinion, plausible, not acted on).

| # | Claim | Verdict | Evidence re-derived 2026-08-16 |
| --- | --- | --- | --- |
| 1 | The onboarding contradicts itself: the site says `add` first, the README and getting-started say `doctor` first | **retained** | [`site/src/pages/index.astro:57`](../../site/src/pages/index.astro) — *"Retrofit first: `npx @rungs/cli add <module>`, then `rungs doctor`"*; the same string is in the page `description` at line 47. [`README.md:62`](../../README.md) opens Install with `npx @rungs/cli doctor`. Both surfaces are current; they disagree |
| 2 | `doctor` is the strongest part and the best adoption wedge | **retained**, as positioning | Supported by the repo's own brief before the review said it: [`product-brief.md` §2](product-brief.md) — *"Retrofit is the primary case, not `init`."* The landing page does not lead with it. This is a messaging defect, not a design one |
| 3 | Pointing `doctor` at a never-installed repo yields *analysis*, which is easier to adopt than methodology | **partly — and this is the review's most valuable finding** | The premise is right and the current capability is narrower than the review assumes. See §2 |
| 4 | Mechanical gates rather than more instructions is the deepest idea here | **noted**, accurate | It is [`enforcement-declaration`](product-brief.md) in the brief and the third of three constraints in §3. The review identified the repo's own load-bearing idea from outside, which is a useful signal that the idea survives the trip |
| 5 | The restraint commitments (never green on an unimplemented gate, never overwrite, `eject`, no workflow score, no new runtime) are good tool design | **noted**, accurate | [`README.md:166-181`](../../README.md), and each traces to an ADR. No action |
| 6 | The maturity ladder is a good answer to installing complexity before having the problem | **noted**, accurate | `concurrency` refusing to install without `--confirm-threshold` is real: [`README.md:148`](../../README.md) and the module's `threshold.confirm` block |
| 7 | Too many public-facing nouns (14 listed) | **partly** | Of the 14, five (`engine`, `render pipeline`, `admission rule`, `ledger`, `provenance`) appear only in design docs and ADRs, not on the paths a first-time reader walks. The remaining nine are real and are reachable in the first screen of README plus landing page. The count is inflated; the problem is not invented |
| 8 | Documentation is written for someone who has already decided the system is valuable | **noted** | Opinion, and I think it is right. Untestable without an outside reader; a glossary and a shorter public vocabulary are the cheap probes |
| 9 | The design corpus is far ahead of the evidence that anyone needs it, and rungs risks becoming a beautiful solution whose users need 20% of it | **retained**, as a constraint on the next release | The disproportion is real and dated: 15 modules, ~80 patterns, 6 ADRs, first published 2026-08-14. The correct response is not to shrink the catalogue but to stop growing it, which the next epic adopts as an explicit non-goal |
| 10 | The backlog subsystem should become provider-neutral, with Markdown / GitHub Issues / Linear / Jira adapters | **partly — remedy rejected, gap retained** | See §3.1 |
| 11 | rungs should be the control plane, not the database — know where architecture, issues, design, specs and quality live, and enforce the relationships | **partly** | The principle is already named (`doc-authority`, rung 4, with four `docauth-*` gates) but only over documents *inside* the repo. Extending authority to external systems is a real idea and a larger product than the next release; it is recorded, not planned |
| 12 | `doctor --explain` should report repository maturity as bars — mature / partial / weak — plus a risk register | **split: risk register retained, bars rejected** | See §2 and §4.1 |
| 13 | `rungs lint agents` — check AGENTS.md, CLAUDE.md, `.cursor/rules`, `.github/instructions`, skills for duplication, contradiction, unreachable rules, stale references, rules that could become gates | **retained**, as capability; **deferred**, as a separate command | Most of these checks already exist as gates. See §2 |
| 14 | The name collides with an existing `rung` CLI for stacked PRs; brand consistently as "Rungs CLI" rather than the bare word | **retained** | The npm half is already on record: [`README.md:73-77`](../../README.md) and [ADR-0006](../decisions/ADR-0006-the-name.md). The *search and speech* half is not, and no surface currently brands the tool as anything but `rungs` |
| 15 | Do not fight Spec Kit, Agent OS, or BMAD; embrace AGENTS.md; occupy "bring whatever agent you want, we reinforce the repo underneath" | **retained**, as messaging | The AGENTS.md half is already the shipped behaviour ([ADR-0001](../decisions/ADR-0001-multi-harness-rendering.md), [`harness-landscape.md`](../research/harness-landscape.md)). The comparative half is not written down anywhere, which is why an outside reader had to construct it |
| 16 | The moat is a catalogue of empirically discovered failure patterns with cross-repo observation counts | **rejected as specified** | Directly refused by [ADR-0005](../decisions/ADR-0005-self-instrumentation.md) Tier C. See §4.2 |
| 17 | Postpone concurrency, design-sync, release, audit, and complex backlog mechanics | **partly** | These are authored and shipped; there is no ongoing spend to postpone. What the review is actually arguing for — do not *expand* the catalogue next — is retained. The maturity ladder is already the mechanism that stops a rung-1 repo installing them, and the review praised it three sections earlier |
| 18 | 0 stars, 0 forks; release candidate with public verification incomplete | **not retained as a measurement** | Undated, no command, unverifiable from a checkout. The underlying posture is accurate and already stated: [`roadmap.md:18-19`](../roadmap.md) marks Phases 6 and 7 amber with a public-registry install and the module registry outstanding |

---

## 2. The finding worth the whole review

The review says `doctor` should tell an unfamiliar repo what is wrong with it, and proposes two
surfaces for that — `doctor --explain` and `rungs lint agents`. **Both describe capability that
exists and cannot currently be reached.**

What `doctor` does today: [`src/cli.ts:77-183`](../../src/cli.ts) scans the repo once and maps
fifteen module *signatures* over the result, reporting each as `ours` / `theirs` /
`different paradigm` / `absent`, then names one next command. It answers *"which of our modules
does this repo already have an equivalent of?"* — a presence question, and it says so:

> This reports presence, never quality. It cannot tell whether an adopted system is good,
> complete, or working — only that files are where a module's files would be.
> — [`src/cli.ts:152-154`](../../src/cli.ts)

What the review asks for is a *defect* question, and the detectors for it are already written —
as gates, in the modules, reachable only after installation and only over rungs-managed content:

| Review's example output | The gate that already computes it |
| --- | --- |
| *"this rule says MANDATORY and has no gate"* | `gates-rules-declare-enforcement` |
| *"14 near-identical release workflows"* | `ci-workflow-proliferation` |
| *"oversized global context"* | `instructions-core-size` |
| *"architecture guidance exists in 4 documents; 3 topics have conflicting authorities"* | `docauth-scope-headers`, `docauth-ownership-respected` |
| *"stale references, nonexistent commands"* | `gates-links-resolve`, `gates-paths-exist` |
| *"unsupported capability mappings"* | the render report's degradation rows ([ADR-0001](../decisions/ADR-0001-multi-harness-rendering.md)) |

So the gap is not *"rungs cannot analyse a repo"*. It is **the analysis is gated behind installing
the thing the analysis is supposed to justify installing** — which is exactly backwards for an
adoption wedge, and is a much smaller fix than the review assumes. This is
[WI-038](../backlog/items/WI-038-doctor-explain-detectors.md).

One caveat the review does not raise and the item must carry: several of these gates read
rungs-shaped inputs. Running them over an arbitrary repo will produce findings whose *evidence* is
sound and whose *framing* assumes conventions the repo never adopted. Under-report deliberately —
[ADR-0004](../decisions/ADR-0004-adoption-detection.md) already made that choice for detection
signatures and the reason carries over unchanged.

---

## 3. Where the observation holds and the remedy does not

### 3.1 The backlog and external trackers

The review's question — *"why isn't this Linear/Jira/GitHub Issues?"* — is fair, and its proposed
answer (a provider-neutral work model with four adapters) breaks two accepted decisions:

- [ADR-0002](../decisions/ADR-0002-stack-and-runtime-footprint.md): **a scaffolded repo acquires no
  new language runtime.** A Linear or Jira adapter needs credentials, network access and a client
  in the consumer repo. That is not a module; it is a different product with a different trust
  posture.
- [ADR-0004](../decisions/ADR-0004-adoption-detection.md) already answers the ownership worry a
  different way: **adoption is a mapping, not a migration.** `add` records where a repo's
  equivalent lives and never rewrites it.

What is genuinely missing is one link in that chain. The `backlog` module declares exactly one
`[[detect.paradigm]]` — `milestones`
([`modules/backlog/module.toml:103`](../../modules/backlog/module.toml)) — so a repo running its
work in GitHub Issues today is detected as having *no* backlog, and `doctor` proposes installing a
Markdown one beside it. **That is the review's fear, and it is real; the adapter layer is not the
fix.** A paradigm signature is, and it is the mechanism ADR-0004 already shipped for this exact
case. [WI-039](../backlog/items/WI-039-external-tracker-paradigm.md).

### 3.2 Vocabulary

Retained narrowly: a public glossary and one pass over the first screen of each public surface.
Not retained: renaming internal concepts. The nouns the review objects to are mostly load-bearing
in design documents, where precision beats approachability, and the repo's own
[one-definition-per-concept rule](../../CLAUDE.md) means a rename is a repo-wide edit for a
readership that never sees the term.

---

## 4. Where the review argues against an accepted decision

Both belong to [ADR-0005](../decisions/ADR-0005-self-instrumentation.md), and neither is a
near-miss. **A person has to decide these; an epic must not adopt them by writing an item.**

### 4.1 The maturity bars

The review is explicit that it does not want a health score —

> Not some fake AI-generated "health score." Actual evidence. Actual files. Actual invariants.

— and then draws one:

```text
Agent instructions       ████████████ mature
Validation enforcement   ███░░░░░░░░  weak
Decision authority       ████░░░░░░░░ fragmented
```

`mature` / `partial` / `weak` / `fragmented` over incommensurable signals is the composite score
ADR-0005 Tier C refuses permanently, and the ADR names the failure mode precisely: *"a probe
encoding a guess is a gate that is confidently wrong."* The half of the mockup underneath it —
`HIGH: 17 imperative rules have no mechanical enforcement`, with the files — is judgement-free,
countable, and exactly what §2 retains.

**Disposition: take the risk register, refuse the bars.** No revisit trigger fires here; ADR-0005's
triggers are about the *ledger*, not about grading a foreign repo.

### 4.2 Cross-repo pattern counts

The review's proposed moat is a catalogue keyed by observation frequency:

```text
P-026 unenforced imperative
observed across: 312 repositories
```

ADR-0005 Tier C refuses *"any network transmission or cross-repo aggregation, including opt-in"*,
with the stated reason that an opt-in network path *"would make every other guarantee here
conditional."*

This is the review's headline strategic recommendation colliding with an accepted decision. It is
not resolvable by an implementation item, and it should not be quietly declined either — the review
is describing the one thing here that would be hard to copy. **Disposition: open it as a decision,
not as work.** [WI-041](../backlog/items/WI-041-decide-cross-repo-evidence.md) puts the question,
its cost, and the ADR's stated reason in front of a person; the honest outcomes are an ADR
amendment with a new trust posture, or a written refusal that stops the idea returning every
quarter.

---

## 5. What the review did not look at

Recorded so the next reader does not mistake this document for a full assessment:

- **Nothing about the modules' contents.** Fifteen modules, and the review evaluates the catalogue
  as a count. The claim under test in [`module-catalog.md`](module-catalog.md) — that each module's
  provenance is a real incident — is the repo's central claim and went unexamined.
- **Nothing about the research.** ~80 patterns and four autopsies, cited as volume. The single
  most consequential weakness in this repo is already on record and the review did not find it:
  the four source repos **share an author**, so every convergence is one operator agreeing with
  themselves ([`BACKLOG.md`](../backlog/BACKLOG.md), WI-009's rationale). An outside reviewer
  landing on that would have been worth more than the messaging notes.
- **No execution.** No `doctor` run, no `init`, no gate output — see the limits stated at the top.

## 6. What this produced

[WI-037](../backlog/items/WI-037-act-on-external-review.md), an epic with four children, targeted
at the next release. The epic's own constraint is the review's ninth claim: **it adds no module and
no pattern.** Everything in it either makes an existing capability reachable, corrects a surface
that contradicts another surface, or puts a decision in front of a person.
