---
id: WI-039
title: Detect an external issue tracker as a different paradigm, not as an absent backlog
type: feature
status: planned
branch:
created: 2026-08-16
updated: 2026-08-16
related: [WI-037, WI-038, ADR-0002, ADR-0004]
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

Not started.

## Review

Not started.
