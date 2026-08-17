---
id: WI-060
title: Prepare the v0.2.0 release and close the release-integrity findings it surfaced
type: chore
status: review
branch: feature/WI-060-release-0.2.0
created: 2026-08-17
updated: 2026-08-17
related: [WI-035, WI-051, F-020, F-021, F-022, ADR-0008]
epic:
children: []
---

## Proposal (rationale)

Cut v0.2.0. The version is a **minor**, not the patch that was requested and not the `0.1.4` the
candidate branch was named for: twelve `feat:` commits landed since v0.1.3, and
[`cut-release`](../../../modules/release/skills/cut-release/SKILL.md) §1 says a feature decides the
minor. The branch name was a prefix, not a promise; renaming it is free and republishing a version
number is impossible.

Preparing it surfaced three findings, and they are not incidental to the release — **every one of
them is a defect in the machinery that is supposed to make a release trustworthy.** They are closed
here rather than deferred, because deferring them means shipping a release whose own integrity
checks are the thing that is broken:

- [F-020](../FINDINGS.md) — the shipped `cut-release` skill told every consumer to gate a release
  with `rungs check --tier full`. `--tier` is not a recognised flag, and no gate is tier `full`, so
  it selected **zero gates** and reported `no gates registered — is this a rungs repo?` about a repo
  holding 25. A release step that gates on nothing while looking green.
- [F-021](../FINDINGS.md) — every prose version and count claim on the public surfaces is
  hand-typed and ungated, and all of them had drifted. The README and roadmap named v0.1.2 as
  public latest two days after v0.1.3 shipped; the versions page advertised the current release as
  "npm publication pending" above a version anyone could install.
- [F-022](../FINDINGS.md) — a consumed changelog fragment that is not deleted reads as unreleased
  work in the next release. `changelog.d/0.1.1.md` survived two releases.

The through-line is that WI-051 derived and gated the site's *structural* counts and stopped there.
Everything the release itself asserts — the version, the publication state, the fragments — stayed
hand-kept, on a tool whose entire claim is that stated facts stay true.

## Decision

`accepted` — 2026-08-17. Requested directly: prepare 0.2.0, commit, close the findings, then cut.
The version was raised from the requested patch to a minor on the evidence above and confirmed.

## Plan

### Requirements

- **R1.** `package.json` and the lockfile are `0.2.0`; `changelog.d/0.2.0.md` exists and is assembled
  into the versions page; every consumed fragment is deleted.
- **R2.** README, roadmap and the versions page agree with the registry on what is published, and
  every count they state names the command and date that produced it.
- **R3.** F-020 closed at the semantics, not just the message: a tier that names nothing is an
  error, and `full` is not a label that silently excludes the `fast` gates. Decision recorded in an
  ADR, because it changes what a declared tier *means*.
- **R4.** F-021 closed by a gate, not a checklist item. A version claim in a public surface that
  disagrees with `package.json` fails `rungs check`.
- **R5.** F-022 closed by a gate: a fragment whose version is at or below the published release is
  refused.
- **R6.** A release runbook exists, is referenced from the surfaces a releaser actually reads, and
  is kept distinct from the portable `cut-release` skill.

### Impacts

- `src/cli.ts`, `src/check.ts` — tier resolution and the zero-gate diagnosis.
- `modules/release/` — the skill's gating step, and two new gates the module ships.
- `modules/gates/`, `.ai/gates.toml` — registry entries for the new gates.
- Public surfaces: `README.md`, `docs/roadmap.md`, `site/src/pages/versions.astro`.
- **Risk:** R3 changes the meaning of a declared tier for every consumer that already has one. It is
  the reason that requirement gets an ADR rather than a patch.

### Approach

Fix the message first (cheap, and it stops the wrong diagnosis immediately), then the semantics
behind it. Close F-021 and F-022 with gates rather than prose — the rule for F-022 already existed
in `cut-release` §3 and prose did not hold it, which is the whole argument for a gate.

### Acceptance criteria / tests

- `npm test` and `rungs check` green; `astro check` reports 0 errors and the link check 0 broken.
- The new gates each fail on a seeded violation and pass once it is corrected — verified by seeding,
  not by assertion.
- `npm pack` produces `@rungs/cli@0.2.0`.
- The versions page states publication status correctly for **every** row, not just the latest.

### Out of scope

- **Tagging, cutting `release/0.2.0`, and `npm publish`.** Explicitly held back: those are the
  irreversible steps and the requester is cutting the release themselves.
- **Reconciling `candidate/0.1.4`.** It is 46 commits behind `main` and zero ahead, and it exists on
  `origin`; renaming or deleting a pushed branch is not done unasked. Recorded as trap T5 in the
  runbook and left for the release cut.
- **A cross-platform release matrix and a public-registry consumer install.** Still owned by
  [WI-035](WI-035-public-release.md); nothing here changes its scope.

## Execution

Branch `feature/WI-060-release-0.2.0`, in two commits: the release preparation, then the findings.

**Deviation from the plan, with its reason.** R3 was scoped in the original triage as "probably an
ADR, deliberately not settled inside a release preparation", and the first commit shipped only the
message and the skill text. It was pulled back in before this item closed: the defect's whole
severity is that it breaks *the release procedure*, so deferring it past the release it breaks was
the wrong call. [ADR-0008](../../decisions/ADR-0008-gate-tiers-are-levels.md) settles it.

**Three things the work found that the plan did not anticipate:**

- Node's strip-only TypeScript mode rejects parameter properties, so `UnknownTierError` is written
  out longhand. Same constraint class that shipped broken in v0.1.1.
- Closing F-022 with *executable* self-tests needed two mechanisms, not one: a fixture builder for
  the shape, and a `deparam` bridge, because the self-test runner reads the module's raw table
  where paths are still `{{changelog_dir}}`. Shipping a new gate whose fixtures report *unrun*
  would have been F-006 again, in the change that closes its sibling.
- `tableKeyFor` is a hand-kept engine→table map ending in `?? engine`. A missing entry does not
  error; it silently hands the engine the whole table, and the gate then reports "did not fire"
  about its own harness. Found by disbelieving a green-looking mismatch, not by reading.

**Scope held.** `release-version-consistent` fails on this repo's layout (`site/package.json` is a
separate package at `0.0.1`). It was **not** weakened to get it registered here — that would be
exactly the "do not weaken a gate to get through" the release skill warns about. Recorded as F-023
and left open.

## Review

| Criterion | Verified |
| --- | --- |
| R1 | `package.json` and lockfile at `0.2.0`; `changelog.d/0.2.0.md` assembled into the versions page; `changelog.d/0.1.1.md` deleted and no fragment below the prepared version remains — now enforced rather than checked by eye |
| R2 | README, roadmap and the versions page agree with the registry. The *published* number is stated once, on the versions page; the other two link to it instead of copying it. Every count states its command and date |
| R3 | [ADR-0008](../../decisions/ADR-0008-gate-tiers-are-levels.md). `check --full` runs 27 (superset), `check --fast` runs the fast set, `check . banana` exits 1 naming the declared tiers. The breaking change and its rationale are recorded in the ADR's Consequences and in the changelog |
| R4 | `docs-version-claims` gate. Proven to fire: seeding `**Next release: v0.9.9**` produced `next release version says 0.9.9, the repo says 0.2.0`, exit 1; restored, exit 0 |
| R5 | `release-fragment-current` gate, four self-test fixtures, all four **executing** (`gates-self-tests-both-directions` passes with them included, and reported a real mismatch until the engine was correctly wired) |
| R6 | [`release-runbook.md`](../../design/release-runbook.md), referenced from the README status block, roadmap Phase 7, the design index and the versions page. Its traps are marked closed where they now have gates, and the one that cannot be gated says so |

**Full run, 2026-08-17:** 25 tests pass · 27 gates pass, 0 fail · `astro check` 0 errors, 0 warnings,
0 hints · 2,061+ internal links, 0 broken · `npm pack` → `@rungs/cli@0.2.0`.

Not done, by design: tagging, `release/0.2.0`, and `npm publish` — the irreversible steps, left for
the release cut. `candidate/0.1.4` is still misnamed and 46 commits behind `main`.
