---
id: WI-042
title: Stop reporting `file.ts:387` code references as broken links
type: feature
status: done
branch: feature/WI-042-link-line-references
created: 2026-08-16
updated: 2026-08-16
related: [WI-038, WI-008, F-007]
epic: WI-037
children: []
---

## Proposal (rationale)

`link-integrity` strips `#anchor` from a link target before resolving it and does not strip a
trailing `:line`. So a markdown link to
`../../web/src/app/features/forge/forge-store.ts:222` is reported broken while `forge-store.ts`
sits exactly there.

That form is a deliberate code-reference convention, and it is the one
[CLAUDE.md](../../../CLAUDE.md) mandates in this repo: *"Reference code as `file_path:line_number`"*.
A gate that refuses the convention its own repo requires is not enforcing anything; it is
generating work.

**Measured 2026-08-16 on `rift-forge`** (never installed, 3,623 commits), by
`rungs doctor --explain`:

| | count |
| --- | ---: |
| real | 2,057 |
| **false — `path:line` where the file exists** | **1,794** |
| **false positive rate** | **46.6%** |

[WI-038](WI-038-doctor-explain-detectors.md) set the threshold that this breaches — *"a mis-framed
rate above roughly one in five means the pass under-reports further before it ships"* — and shipped
anyway, because its triage was run against the three repos that happen not to use the convention,
with a script that made the same assumption as the engine and therefore could not detect the class.
That is corrected in WI-038's Review; this item fixes the cause.

It affects `rungs check` in every consumer repo, not only `--explain`. It has been latent since
[WI-008](WI-008-link-gate-checks-every-file.md) made link checking per-link — before that, any file
containing a `{{token}}` had every link exempted, which masked it.

## Decision

`accepted` — 2026-08-16. Opened from WI-038's post-merge correction, as a child of
[WI-037](WI-037-act-on-external-review.md). The epic's requirement that no child add a new module or
pattern holds: this changes one resolution rule in an existing engine.

## Plan

### Requirements

- A link whose target is `<path>:<line>` or `<path>:<line>:<col>` resolves against `<path>`, and is
  **not** reported when `<path>` exists.
- A link whose target is broken with or without the suffix is **still** reported. Stripping must
  narrow what is reported, never widen it.
- A path that genuinely contains a colon is not broken by the change.
- The self-test fixtures state both directions, as `gates-self-tests-both-directions` requires.
- The measured false-positive rate is re-derived across **all four** source repos after the fix,
  with a triage script that does not share the engine's assumption.

### Impacts

- [`src/engines.ts`](../../../src/engines.ts) — `link-integrity` resolution only. `gates-paths-exist`
  runs the same scan ([F-007](../FINDINGS.md)), so both gates change together.
- [`modules/gates/gates/structural.toml`](../../../modules/gates/gates/structural.toml) — a
  self-test fixture for the new direction.
- Every consumer repo's `rungs check` reports fewer link findings. That is the point, and it is a
  behaviour change worth stating in the item rather than discovering in a release.
- **Risk:** stripping too eagerly hides a real broken link whose name ends in digits after a colon.
  Bounded by only stripping when the stripped path exists.

### Approach

**Strip and re-test, never strip and assume.** Resolve the target as written first; if that fails,
strip a trailing `:\d+(:\d+)?` and resolve again; report only if both fail. A link is reported
broken only when no reading of it resolves, which keeps the change monotone — it can only remove
findings, never add them.

Rejected: treating `:line` as an anchor and stripping it unconditionally alongside `#`. It reads
tidier and it is wrong — it would silence a genuinely missing `foo.ts:12` by resolving a `foo.ts`
that also does not exist, and worse, would make the two cases indistinguishable in the output.

### Acceptance criteria / tests

1. A link to an existing `file.ts:387` is not reported; a link to a missing `file.ts:387` still is.
   Both as unit tests.
2. Self-test fixtures in `structural.toml` state both directions for the new rule.
3. The four source repos are re-triaged with a script that resolves `:line` independently of the
   engine; the false-positive rate is recorded per repo.
4. `rungs check` on this repo passes with no change in finding count (this repo's links do not use
   the form outside code spans, so a change here would mean the fix is too broad).
5. `npm test` passes.

### Out of scope

- **Collapsing `gates-links-resolve` and `gates-paths-exist`.** Still [F-007](../FINDINGS.md);
  this item changes what both resolve, not that there are two.
- **`#L387` GitHub-style anchors.** Already handled by the existing `#` strip. Nothing deferred.
- **The 2,057 genuinely broken links in `rift-forge`.** They belong to that repo, not to rungs.

## Execution

Branch `feature/WI-042-link-line-references`, cut from `main` at `d77c6bc`.

One change of substance: [`src/engines.ts`](../../../src/engines.ts) gains `resolvesHere`, which
resolves a link target as written and only then retries without a trailing `:line` / `:line:col`.
`linkIntegrity` calls it in place of its inline `existsSync`. Two self-test fixtures added to
[`structural.toml`](../../../modules/gates/gates/structural.toml), one unit test added, and
`linkIntegrity` is now exported so the test can reach it without a registry.

No deviation from the plan. The strip-and-retest shape held; nothing needed widening.

## Review

Verified 2026-08-16 on `feature/WI-042-link-line-references`.

**1 · Existing `file.ts:387` not reported; missing one still reported.** Unit test
`link-integrity resolves a :line code reference but still reports a missing target` covers four
targets in one fixture — an existing file with `:222`, the same with `:222:14`, a missing file with
`:222`, and a missing file bare. Exactly the two missing ones are reported. **Met.**

**2 · Self-test fixtures state both directions.** Added to `structural.toml`;
`gates-self-tests-both-directions` passes. Worth naming what that gate does and does not do: it
confirms both fixtures *exist*, and [F-006](../FINDINGS.md) records that no fixture is ever
*executed*. So criterion 2 is met as written, and the unit test in criterion 1 is what actually
runs the assertion. **Met — with the standing caveat that the self-tests remain declarations.**

**3 · Four source repos re-triaged, independently of the engine.** The triage script resolves
`:line` itself rather than reusing the engine's assumption, which is the flaw that let this ship:

| Repo | Findings before | Findings after | False positive, after |
| --- | ---: | ---: | ---: |
| `rift-forge` | 3,851 | **2,057** | **0.0%** |
| `hexguard` | 114 | 114 | 0.0% |
| `hexguard-templates` | 3 | 3 | 0.0% |
| `axiom-mesh` | 0 | 0 | — |

1,794 findings removed, all from `rift-forge`, none from anywhere else — which is the monotone
property the approach was chosen for. **Met.**

Four of the 2,057 survivors were then checked by hand against the filesystem, and all four are
genuinely broken — `policy-boundary.md`, `../backlog/FINDINGS.md` and `../specs/data-sources.md` are
absent, and one is a literal unfilled `](url)` placeholder in
`docs/research/lol-mechanics/README.md`. The fix removed the false class without blunting the gate.

**4 · `rungs check` unchanged on this repo.** 20 pass · 0 fail · 0 unimplemented · 0 error, with the
same finding count as before the change. This repo writes code references inside code spans, which
WI-008 already excluded, so an unchanged count here is the evidence that the strip is not too broad.
**Met.**

**5 · `npm test`.** 11 pass, 0 fail — up from 10. **Met.**

### What this leaves

The 2,057 remaining `rift-forge` findings are that repo's, not rungs'. [F-007](../FINDINGS.md)
(two gate ids, one scan) and [F-006](../FINDINGS.md) (self-tests declared, never executed) are both
untouched and both still open — F-006 in particular is why criterion 2 is weaker than it looks.
