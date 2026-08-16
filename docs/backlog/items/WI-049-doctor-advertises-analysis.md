---
id: WI-049
title: Make plain `doctor` say that the analysis exists
type: feature
status: planned
branch:
created: 2026-08-16
updated: 2026-08-16
related: [WI-048, WI-038, WI-005]
epic: WI-048
children: []
---

## Proposal (rationale)

Acts on **claim 13** of the [second external review](../../design/external-review-2026-08-16b.md).

`rungs doctor` is the advertised entry point and the only place a first-time user lands.
`doctor --explain` is the capability both reviews called the strongest thing here. **Plain `doctor`
does not mention it.** Verified 2026-08-16: `doctor` against `hexguard` prints no occurrence of the
string `explain`, anywhere in its output. It is discoverable only from `--help`.

[WI-038](../archive/WI-038-doctor-explain-detectors.md) put the findings behind a flag deliberately,
and that decision was right — 114 findings on `hexguard` would bury the `Next` line that
[WI-005](../archive/WI-005-doctor-next-step.md) exists to protect. **The flag is not the problem;
the silence is.** A user who never reads `--help` never learns the analysis exists.

## Decision

`accepted` — 2026-08-16, as a child of [WI-048](WI-048-act-on-second-external-review.md).

## Plan

### Requirements

- `doctor` states that analysis is available, and **how much** there is, in no more than three lines.
- It reports a **count**, never findings. The moment a finding appears in plain `doctor`, WI-038's
  measured reason for the flag is back.
- It appears only when the detector pass would actually find something. Advertising an empty
  analysis is noise, and worse, it is a claim.
- `doctor` still ends with exactly one recommended command. If the analysis line competes with the
  `Next` line, the `Next` line wins.
- No extra cost on the plain path that a user would notice.

### Impacts

- `cmdDoctor` and `reportExplain` in [`src/cli.ts`](../../../src/cli.ts).
- **Run time is the real risk.** Counting requires running the detectors, which is the work
  `--explain` does. On `rift-forge` that pass produces 2,057 findings over 3,600 commits' worth of
  files. If counting costs what explaining costs, plain `doctor` gets slower for everyone to
  advertise a flag — measure before shipping, and if it is slow, say "analysis available" without a
  count rather than paying for the number.
- README and the site's doctor console, which both show plain `doctor` output.

### Approach

Reuse `explain()` and report `reported.length` plus the detector count. Decide against a measurement
whether the number is affordable; the fallback is a fixed line naming the flag.

The shape the review proposes, adapted so it cannot grow:

```text
  Analysis
  3 detector families found 114 evidenced findings.
  rungs doctor --explain   — paths, counts, and the incident behind each check
```

### Acceptance criteria / tests

1. `doctor` on a repo with findings names `--explain` and the finding count, in ≤ 3 lines.
2. `doctor` on a repo with none says nothing about analysis.
3. No finding text appears in plain `doctor` — asserted by checking the output contains no file
   path from the detector pass.
4. `doctor` still ends with exactly one recommended command.
5. The added wall-clock on the plain path is measured on `rift-forge` and recorded in this item.
6. `rungs check` and `npm test` pass.

### Out of scope

- **Changing what `--explain` prints.** WI-038 settled it.
- **Making `--explain` the default.** Measured against, twice.
- **A `lint agents` command.** Still the surface question WI-037 declined to open.

## Execution

Not started.

## Review

Not started.
