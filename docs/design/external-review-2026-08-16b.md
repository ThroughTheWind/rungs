# External review #2, 2026-08-16 — record and adjudication

> **Authoritative for:** what the same outside reviewer said after the WI-037 work shipped, and
> which of those claims survived checking. **Not authoritative for:** what rungs is (that is
> [`product-brief.md`](product-brief.md)), any decision it recommends (those are ADRs), or the work
> that acts on it ([WI-048](../backlog/archive/WI-048-act-on-second-external-review.md)).
>
> The first review and its adjudication are
> [`external-review-2026-08-16.md`](external-review-2026-08-16.md). Read that first: this one is a
> re-assessment of the same product by the same reader, and most of its value is in the delta.

A second review arrived on 2026-08-16, after [WI-037](../backlog/archive/WI-037-act-on-external-review.md)
closed. It is recorded on the same terms as the first: **a claim about this repo, not evidence about
it**, re-derived against the working tree and against the live site before anything was retained.

## What changed in the reviewer's access

The first review could only read prose. This one reads **shipped behaviour** — the deployed site,
the published version surface, and the implementation history of WI-038 — and its two sharpest
observations come from that history rather than from the product. That is a different and better
class of evidence, and it is why more of this review survives checking than the last one.

It still could not run the tool. Every claim about what a command prints is inferred.

## The reviewer's scores

Reproduced as the review's summary of itself. **Opinion, unmeasured, not adopted** — the same
position [ADR-0005](../decisions/ADR-0005-self-instrumentation.md) takes about grading anyone's
repo, including ours.

| Area | Review #1 | Review #2 |
| --- | ---: | ---: |
| Core problem | 8.5 | 8.5 |
| Product concept | 8 | 8.5 |
| Technical design | 8.5 | 9 |
| Differentiation | 7 | 8 |
| Onboarding | 6 | 7.5 |
| Messaging | 6.5 | 7.5 |
| Adoption readiness | 4.5 | 6.5 |
| Long-term potential | 8 | 8.5 |

---

## 1. Adjudication

| # | Claim | Verdict | Evidence re-derived 2026-08-16 |
| --- | --- | --- | --- |
| 1 | `doctor --explain` turns rungs from scaffolding into an analysis tool, and is the better adoption wedge | **noted**, accurate | It is what [WI-038](../backlog/archive/WI-038-doctor-explain-detectors.md) built and why. No action; the review is agreeing with a shipped decision |
| 2 | The implementation correctly refuses to execute repo-owned commands and restricts checks on foreign conventions | **noted**, accurate | [`src/explain.ts`](../../src/explain.ts): `isRunnable` excludes `kind = "command"`, `CONVENTION_FREE` limits `theirs` repos to `file-population`, `file-budget`, `link-integrity` |
| 3 | Every finding requiring a path plus a count or quote is the right instinct | **noted**, accurate | WI-038 acceptance criterion 2, and the two engine messages WI-038 had to rewrite to make it true |
| 4 | The WI-038 history — 46.6% false positives on `rift-forge`, and **the acceptance test sharing the implementation's assumption** — is unusually valuable evidence, and the fact it stayed documented is the point | **retained**, and it is the review's best observation | Correct on both counts, including the part that is uncomfortable: the triage script resolved `target.split('#')[0]`, exactly what the engine did, so it could only ever confirm it. Recorded in [WI-038's Review](../backlog/archive/WI-038-doctor-explain-detectors.md) and in [WI-042](../backlog/archive/WI-042-link-line-references.md) rather than amended away |
| 5 | The paradigm-detection answer is better than the tracker adapters they originally proposed; recommendation withdrawn | **noted** | The reviewer withdrawing their own headline recommendation from review #1 is the strongest signal in this document. §3.1 of the first adjudication argued it against ADR-0002 and ADR-0004; that argument is now accepted by the person it was aimed at |
| 6 | `--confirm-paradigm` recomputing the dependency closure after removing refused modules is the detail that separates a CLI that demos well from one that does not annoy people | **noted**, accurate | It is [WI-043](../backlog/archive/WI-043-add-honours-paradigm.md)'s second execution deviation, and it was a bug before it was a feature: the first version refused `backlog` and wrote `instructions` and `gates` anyway |
| 7 | The corpus is becoming an auditable chain — incident → decision → implementation → failure → verification — and the WI-038 history demonstrates rungs better than the marketing site | **retained**, as positioning | Untestable as stated, and I think it is right. It is also the first argument anyone has made for why 100+ documents on a v0.1.x project might be an asset rather than the over-engineering the first review flagged |
| 8 | The research corpus now covers 14 public frameworks, reducing the one-operator risk | **retained** — and the reviewer is more current than our own board | 14 extraction documents exist: 6 in [`research/frameworks/`](../research/frameworks/README.md), 8 in [`research/follow-on/`](../research/follow-on/README.md). All 14 items are `status: done`. **The board still files nine of them under `Proposed`** — see §2 |
| 9 | Rejecting the maturity bars was correct; "evidence without grading" is a clearer identity | **noted**, accurate | [§4.1 of the first adjudication](external-review-2026-08-16.md). Retained as a phrase worth using — it is a better three-word summary than anything currently on the site |
| 10 | "Repository infrastructure for coding agents" is the right category, better than "agentic development system" | **noted**, accurate | Shipped by [WI-040](../backlog/archive/WI-040-public-surface-first-command.md); live on the README and the site |
| 11 | **The deployed public surfaces are out of sync** — the live homepage still says *"Retrofit first"* and still shows the fabricated `doctor` and interactive `add concurrency` output | **rejected as stated, retained as a category** | Fetched `https://docs.rungscli.com/` on 2026-08-16: the hero reads *"Start read-only: `npx @rungs/cli doctor`. It writes nothing."*, the console shows the captured output, and a DOM scan returns `hasFakeDoctor: false`, `hasInteractiveAdd: false`, `hasRetrofitFirst: false`, `hasBringYourOwn: true`. WI-040 is fully deployed. **But the category is live and they missed the instance** — see §2 |
| 12 | The versions page still reads latest `0.1.2`, `0.1.3` publication pending, so this is not fully released | **retained** | Confirmed on the live page: *"LATEST 0.1.2 · published 2026-08-15"*, *"CUT 0.1.3 · npm publication pending"*. Already owned by [WI-035](../backlog/archive/WI-035-public-release.md), which is `planned`. No new item |
| 13 | The most differentiated capability is hidden behind a flag; plain `doctor` should advertise that the analysis exists | **retained** — the best actionable item in the review | Verified: `doctor` on `hexguard` prints no occurrence of the string `explain`, anywhere. The flag is discoverable only from `--help`. Their proposed shape — a short count plus the command — respects [WI-005](../backlog/archive/WI-005-doctor-next-step.md)'s one-next-command rule |
| 14 | Build a formal detector abstraction with **applicability** as a first-class field — *can this detector legitimately interpret this repository* before *did the condition fire* | **retained**, and it is the strongest technical recommendation across both reviews | The distinction exists but only as two hard-coded sets in one file: `IN_SCOPE` and `CONVENTION_FREE` in [`src/explain.ts`](../../src/explain.ts). It is a property of each detector expressed as a list of engine names somewhere else, which is exactly the shape that goes stale |
| 15 | Stop broadening; concentrate on doctor quality, brutal false-positive measurement, reproducible public claims, and outside users | **retained**, as the epic's shape | The `rift-forge` incident is the argument, and it is ours rather than theirs |
| 16 | The remaining risk is **generalisation** — the detectors must survive repos nobody involved built | **retained** | Correct, and currently unmeasured beyond four source repos plus five incidental ones. This is the gap that most limits any claim rungs makes |
| 17 | The wiki exposes 108 documents | **noted**, close enough | 112 routes on the 2026-08-16 build. The number moves with every commit, which is why nothing should quote it |
| 18 | An eventual fleet product — "which of our 300 repos have unenforced policies" — is plausible but premature to build | **noted** | Agreed, and it is the same cross-repo boundary [ADR-0005](../decisions/ADR-0005-self-instrumentation.md) Tier C refuses. [WI-041](../backlog/archive/WI-041-decide-cross-repo-evidence.md) still holds that question, still deliberately unopened |

---

## 2. What the review got wrong, and the better finding underneath it

The reviewer's *"largest visible issue"* is that the deployed site is stale. **It is not.** WI-040's
changes are live, and the specific artifacts they name — the fabricated `doctor` lines, the
interactive `add concurrency` prompt, the *"Retrofit first"* sub-line — are all absent from the page
served on 2026-08-16. They were honest that they could not tell from outside whether they were seeing
a cache; that is what it was.

**They were right about the category and looked in the wrong place.** Two surfaces do currently
contradict the repo:

**The site's status line is stale.** It reads *"20 gates register, all 20 have engines · 2026-08-15"*.
`rungs check` reports **21** since [WI-044](../backlog/archive/WI-044-resolve-open-findings.md) added
`site-vendored-unedited`. The number is typed into
[`site/src/site.config.ts`](../../site/src/site.config.ts), whose own header comment says this is
*"the thing this repo has the most scar tissue about"* and carries a `TODO (generate-derivable)`.
The dated `asOf` is doing its job — a stale number you can see — but it is stale, on the page that
argues rungs prevents exactly this.

**The board contradicts fourteen item files.** `BACKLOG.md` lists nine items under **Proposed** and
five under **Planned** whose files all read `status: done`. Nine of those rows now link into
`archive/`, because `rungs backlog archive` moved them — so the board says *proposed* about a
document filed under "cannot change any more". Every mechanism this repo has for this problem is
one level too low: `backlog-merged-status` reconciles a **branch** against a status field, and
nothing reconciles the **board** against it.

That second one is the better finding, and it is the reviewer's own thesis applied to us:
*bookkeeping about the work is not the work*. It is also the first thing an outside reader checking
claim 8 would hit — they reached the correct answer by reading the corpus, which our own board would
have talked them out of.

---

## 3. Where the review changed a decision

Nothing. Every retained claim is either a small addition to shipped behaviour (13), a formalisation
of something already implemented informally (14), or a measurement we have not done (16).

Worth recording explicitly, because it is unusual: **the reviewer withdrew their own strongest
recommendation from review #1** — provider-neutral backlog adapters — after reading the argument
against it. The first adjudication rejected that remedy on [ADR-0002](../decisions/ADR-0002-stack-and-runtime-footprint.md)
and [ADR-0004](../decisions/ADR-0004-adoption-detection.md) grounds and shipped detection instead.
That is the ADRs doing the job ADRs are for, against an outside proposal, and surviving.

## 4. What this review did not look at

- **The modules, again.** Both reviews have now evaluated the 15-module catalogue as a count. The
  central claim in [`module-catalog.md`](module-catalog.md) — that every module's provenance is a
  real incident — remains unexamined by anyone outside.
- **Whether `--explain`'s findings are *useful*.** It confirms the false-positive work and does not
  ask the harder question: of the 2,057 surviving `rift-forge` findings, how many would that repo's
  owner act on? Low false positives and low value look identical from outside.
- **The gates themselves.** 21 run on every change here and no review has read one.

## 5. What this produced

[WI-048](../backlog/archive/WI-048-act-on-second-external-review.md), an epic with five children. Same
constraint as its predecessor: **no new module, no new pattern.** Four of the five are corrections or
formalisations of things that already exist; the fifth is a measurement.