---
id: WI-049
title: Make plain `doctor` say that the analysis exists
type: feature
status: done
branch: feature/WI-049-doctor-advertises-analysis
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

[WI-038](WI-038-doctor-explain-detectors.md) put the findings behind a flag deliberately,
and that decision was right — 114 findings on `hexguard` would bury the `Next` line that
[WI-005](WI-005-doctor-next-step.md) exists to protect. **The flag is not the problem;
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

Branch `feature/WI-049-doctor-advertises-analysis`, cut from `main` at `4d21a5b`.

### The measurement changed the feature

Built first as the plan and the review both described it — a finding count. Then measured, because
the plan named run time as the real risk:

| `rungs doctor` on `rift-forge` | cold | warm |
| --- | ---: | ---: |
| baseline | — | **1.6s** |
| with a finding count | 178s | **16.8s** |
| shipped (scope only) | — | **1.6s** |

**A 10× tax on the entry point to advertise a flag.** Counting means running the detectors, which is
the work `--explain` exists to do; on a 3,600-commit repo that is fifteen seconds every time anyone
runs the command the README tells them to start with.

The plan called this in advance — *"if it is slow, say 'analysis available' without a count rather
than paying for the number"* — so the fallback is taken, not improvised. What ships reports the
number **detection already computed**: how many modules the repo has an equivalent of, and therefore
how many can be checked against it. No engine runs on the plain path.

The wording carries the whole distinction: *"N of these are things this repo already has, and can be
checked against it."* It claims capability, never findings.

## Review

Verified 2026-08-16.

**1 · `doctor` names `--explain` and a count, in ≤ 3 lines.** Three lines including the heading, on
`hexguard-templates`:

```
  Analysis

  7 of these are things this repo already has, and can be checked against it.
  rungs doctor --explain   — evidenced findings, and the incident behind each check
```

**Met on shape, not on substance:** the count is *scope*, not findings. See criterion 2.

**2 · `doctor` on a repo with no findings says nothing about analysis. NOT MET.** `angular-academy`
has three modules in scope and `--explain` finds nothing, and the Analysis section still prints.
Satisfying this requires knowing whether anything fired, which is the 15 seconds criterion 5
rejected. **The two criteria are incompatible and the plan chose between them in advance.** The
mitigation is the wording: the line claims the checks *can run*, not that anything was found, and a
reader who follows it gets `No detector fired. That is not a clean bill of health` — which is true
and useful. Recorded as unmet rather than reworded into looking met.

**3 · No finding text in plain `doctor`.** Searched the output for the detector message formats
(`broken link →`, `loaded lines`, `matching file(s)`): none. The one match for `spec.md` is
`doctor`'s own presence line, `8× docs/**/spec.md`, which predates this item. **Met.**

**4 · Still exactly one recommended command.** One match for `rungs (add|init|check|upgrade)` after
the `Next` header on `hexguard-templates`. WI-005 not regressed. **Met.**

**5 · Added wall-clock measured on `rift-forge` and recorded.** Table above: **1.585s and 1.705s**
against a 1.591s–1.708s baseline — inside the run-to-run noise. **Met.**

**6 · `rungs check` 22 pass · 0 fail; `npm test` 17 pass.** **Met.**

### What this leaves

A repo where the analysis would find nothing is still told the analysis exists. That is the price of
not running detectors on the entry point, and if it turns out to annoy people the honest fix is a
cheap pre-filter, not a slower `doctor`.
