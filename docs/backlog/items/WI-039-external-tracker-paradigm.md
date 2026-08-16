---
id: WI-039
title: Detect an external issue tracker as a different paradigm, not as an absent backlog
type: feature
status: done
branch: feature/WI-039-external-tracker-paradigm
created: 2026-08-16
updated: 2026-08-16
related: [WI-037, WI-038, WI-043, ADR-0002, ADR-0004]
epic: WI-037
children: []
---

## Proposal (rationale)

Acts on **claims 10 and 11** of the
[2026-08-16 external review](../../design/external-review-2026-08-16.md).

The reviewer asked the fair question — *"for actual teams, why isn't this Linear/Jira/GitHub
Issues?"* — and inferred that rungs wants to own work state. The inference is wrong and the
symptom that produced it is real.

The `backlog` module declares exactly one `[[detect.paradigm]]`, `milestones`
([`modules/backlog/module.toml:103`](../../../modules/backlog/module.toml)). A repo running all of
its work in GitHub Issues therefore matches no backlog signature at all, is reported `absent`, and
`doctor` proposes installing a Markdown backlog beside the one the team actually uses. Every
mechanism needed to behave better already exists: [ADR-0004](../../decisions/ADR-0004-adoption-detection.md)
state 5 prints the comparison and stops, and never auto-adopts.

**This is the whole fix, and it is one manifest block.** The adapter architecture the review
proposes is refused — it needs credentials, network and a client inside the consumer repo, which
[ADR-0002](../../decisions/ADR-0002-stack-and-runtime-footprint.md) rules out, and the reasoning is
in [§3.1](../../design/external-review-2026-08-16.md) of the adjudication.

## Decision

`accepted` — 2026-08-16, as a child of [WI-037](WI-037-act-on-external-review.md).

## Plan

### Requirements

- A repo using GitHub Issues as its unit of work is reported as **different paradigm**, not
  `absent`, and `add backlog` prints the comparison and stops per ADR-0004 state 5.
- Signatures use **only files in the repo**. No API call, no token, no network — from either the
  CLI or anything it writes.
- The `note` states the real trade-off honestly, including when the external tracker is the better
  choice, following the `milestones` block's precedent rather than arguing for the Markdown
  backlog.
- **Biased to false negatives.** ADR-0004's rule holds: a repo with a stray issue template is not a
  repo whose work lives in Issues. Missing a real case is cheaper than telling a team their tracker
  is the wrong paradigm when they merely have a `.github/` directory.

### Impacts

- [`modules/backlog/module.toml`](../../../modules/backlog/module.toml): one or more
  `[[detect.paradigm]]` blocks. Module version bumps; no file, gate, or rung changes.
- [`docs/design/module-catalog.md`](../../design/module-catalog.md): the backlog module's detection
  row.
- `doctor` output on repos with external trackers — including whatever WI-038 lands, which is why
  this follows it.
- **No CLI change expected.** If one turns out to be needed, that is a finding about ADR-0004's
  paradigm mechanism, and worth recording as one.

### Approach

**Start with GitHub Issues only.** It is the case with unambiguous in-repo evidence
(`.github/ISSUE_TEMPLATE/`, `.github/issue_template.md`, issue-form YAML), it is the most common,
and one signature is enough to prove the mechanism carries. Linear and Jira leave far weaker
file-level traces — often nothing but a URL pattern in a PR template or a branch convention — and
guessing from a link is exactly the confidently-wrong probe this repo refuses elsewhere.

**Decide against real repos:** whether one `external-tracker` paradigm covers all three, or each
gets its own with its own note. Leaning toward one block with a general note — the trade-off rungs
has to state is the same regardless of vendor — but the sample decides.

**Test against repos that genuinely use Issues**, not against a fixture built to match the
signature. A signature validated only by its own fixture is `gate-self-test`'s known hole
([F-006](../FINDINGS.md)) in a different costume.

### Acceptance criteria / tests

1. A repo whose work lives in GitHub Issues is reported `different paradigm` by `doctor`, with the
   matched path shown.
2. `rungs add backlog` on that repo prints the comparison and installs nothing.
3. A repo with a `.github/` directory but no issue-workflow evidence is **not** matched — checked
   against at least three such repos, false positives recorded either way.
4. The four source repos' existing detection results are unchanged
   ([`detection-verification.md`](../../design/detection-verification.md) re-run, dated).
5. `rungs modules` audits the manifest clean; `rungs check` passes.

### Out of scope

- **Any adapter, sync, import, or export against a tracker's API.** Refused, not deferred — §3.1 of
  the adjudication, against ADR-0002. No follow-up item, because there is no intent to revisit.
- **Linear and Jira signatures.** Deferred within this item's own Approach, not to a separate item:
  they are added here if and only if a real repo supplies file-level evidence during execution.
  Otherwise nothing is deferred, because guessing from a URL is not a signature.
- **A provider-neutral work model or schema.** That is a redesign of what a work item *is*, not a
  detection change, and nothing has asked for it except an inference from a missing signature.
- **Changes to what the Markdown backlog contains.** This item changes detection only.

## Execution

Branch `feature/WI-039-external-tracker-paradigm`, cut from `main` at `36a0eb0`.

One `[[detect.paradigm]]` block added to
[`modules/backlog/module.toml`](../../../modules/backlog/module.toml), id `external-tracker`,
matching configured issue *intake* only — `.github/ISSUE_TEMPLATE/**`, `.github/issue_template.md`,
`.github/ISSUE_TEMPLATE.md`. Linear and Jira are named in the note and deliberately absent from the
paths, per the plan: they leave no reliable file-level trace, and a signature guessed from a URL is
the confidently-wrong probe this repo refuses everywhere else.

**No CLI change, and that turned out to be the problem — see Review criterion 2.**

## Review

Verified 2026-08-16 on `feature/WI-039-external-tracker-paradigm`. As first written this section
recorded **two of five criteria unmet**, and the item merged at `review` rather than `done`. One of
the two was then closed by [WI-043](WI-043-add-honours-paradigm.md); the other is closed as
unobtainable. Both are resolved at the foot of this section, with the original findings left
standing above them.

**1 · A repo whose work lives in GitHub Issues reports `different paradigm`.** Against a constructed
fixture (`.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md`), `doctor` reports:

```
backlog        paradigm
    different paradigm: external-tracker (.github/ISSUE_TEMPLATE/bug_report.md)
    Work items here are Markdown files in the repo; your tracker is a system outside it.
```

**Not met, and the plan predicted why.** Its Approach required testing *"against repos that
genuinely use Issues, not against a fixture built to match the signature — a signature validated
only by its own fixture is `gate-self-test`'s known hole ([F-006](../FINDINGS.md)) in a different
costume."* No repo available here uses GitHub Issues as its unit of work; all 76 local repos with a
`.github/` directory track work in files. So this is exactly the circular validation the plan
forbade, and it is recorded as such rather than counted.

**2 · `rungs add backlog` prints the comparison and installs nothing. NOW MET — see the resolution
at the foot of this section.** As first measured, it installed:

```
$ rungs add backlog --into <fixture>
  instructions   3 create · 1 merge
  gates          1 create · 1 skill · 2 merge
  backlog        5 create · 1 rule · 2 skill · 1 merge
  registered 12 gates from 3 module(s)
```

The paradigm is never mentioned. Cause: **`paradigm` is read by `doctor` and by nothing else** —
`grep -n paradigm src/add.ts src/cli.ts` returns five hits, all in doctor's rendering, none in
`add.ts`. [ADR-0004](../../decisions/ADR-0004-adoption-detection.md)'s state 5 is specified and
unimplemented, and has been for **every** paradigm since the CLI shipped; the pre-existing
`milestones` block has the same hole. WI-039 did not introduce it — it added the first paradigm
anyone would actually hit, which is what made it visible.

The plan named this outcome in advance: *"No CLI change expected. If one turns out to be needed,
that is a finding about ADR-0004's paradigm mechanism, and worth recording as one."* Recorded as
[F-014](../FINDINGS.md) (high · now) and promoted to
[WI-043](WI-043-add-honours-paradigm.md), because refusing an install a user typed on purpose is a
design decision, not a bug fix to slip into this branch.

**3 · A repo with `.github/` but no issue-workflow evidence is not matched.** Required at least
three; checked against **eight**, every one of which has a `.github/` directory:

| | |
| --- | --- |
| `absent` (no backlog at all) | `angular-academy` · `axiom-mesh` · `dotnet-academy` · `ng-i18n-compiler` |
| `theirs` (their own in-repo backlog) | `hexguard-templates` · `rewind` · `rift-forge` |
| `ours` | `hexguard` |

**False positives: 0.** The negative evidence here is much stronger than the positive evidence in
criterion 1, which is the honest summary of this item. **Met.**

**4 · The four source repos' detection is unchanged.** `hexguard` `ours` · `hexguard-templates`
`theirs` · `rift-forge` `theirs` · `axiom-mesh` `absent` — identical to before the change, as
criterion 3's table shows. Paradigm is only consulted when nothing else matched
([`src/detect.ts:86`](../../../src/detect.ts)), so a repo with its own backlog can never be
reclassified by this block. **Met.**

**5 · `rungs modules` audits clean; `rungs check` passes.** Manifest audit clean; `rungs check`
20 pass · 0 fail · 0 unimplemented · 0 error. **Met.**

### Resolution, 2026-08-16 — criterion 2 met, status `done`

The item was merged at `review` with criterion 2 unmet, then
[WI-043](WI-043-add-honours-paradigm.md) implemented ADR-0004 state 5 in `add`. Re-verified on the
same fixture after that landed:

```
  backlog: this repo already does this another way — external-tracker
      matched .github/ISSUE_TEMPLATE/bug_report.md
      instructions, gates not written — pulled in only for the above

  Pass --confirm-paradigm to install anyway. Nothing was written.
```

The repo is untouched afterwards. **Criterion 2 met.** The decision WI-043 was holding — refuse by
default, or warn and proceed — turned out not to be open: ADR-0004 already said *"prints the
comparison and stops"*, and choosing otherwise would have amended an accepted decision from inside a
bug fix.

**Criterion 1 remains unmet, and the item closes anyway.** No repo available here uses GitHub Issues
as its unit of work, so the positive case still rests on a fixture built to match the signature —
the circular validation this item's own plan named as insufficient. What carries the item instead is
the negative evidence: **0 false positives across eight repos** that all have a `.github/` directory
and all track work in files, which is the failure mode that actually costs a user something. The
signature can only over-match or under-match; it is measured against over-matching and unmeasured
against under-matching. If it under-matches, a team sees today's behaviour, which is the behaviour
before this item existed.

Recorded rather than resolved, because the evidence needed is a real repo and no amount of work here
produces one.
