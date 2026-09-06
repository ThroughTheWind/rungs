---
id: WI-064
title: Bootstrap Arena Lab as the first direct Rungs consumer
type: epic
status: accepted
branch:
created: 2026-09-05
updated: 2026-09-06
related: [WI-065, WI-066, WI-067, WI-068, WI-069, WI-070, WI-071, WI-072, WI-073, WI-074, WI-075, WI-076, WI-077, WI-078, WI-079, WI-080, WI-081, WI-082, WI-083]
epic:
children: [WI-065, WI-066, WI-067, WI-068, WI-069, WI-070, WI-071, WI-072, WI-073, WI-074, WI-075, WI-076, WI-077, WI-078, WI-079, WI-080, WI-081, WI-082, WI-083]
---

## Proposal (rationale)

Rungs has been exercised in its own repository and synthetic scratch repositories, but not as the
maintained workflow of another owner's sustained project. Arena Lab is a new, documentation-rich
C# game repository owned by the same maintainer. Its backlog will become active immediately, so it
can expose retrofit, migration, package, Git-state and recurring-use defects that self-hosting does
not.

Waiting for an outside adopter cannot generate this evidence: the maintainer has explicitly chosen
Arena Lab as the first-party dogfood consumer. The aim is not to make Rungs look green; it is to
make each failure reproducible and recoverable while Arena development continues.

## Decision

`accepted` — 2026-09-05, by the user. Use Arena Lab as a controlled direct consumer and improve
Rungs from the resulting evidence. Keep the producer and consumer independently buildable: Rungs
may use a generic fixture reduced from Arena, but its required tests must never depend on the Arena
checkout.

## Plan

### Requirements

- A fresh tracked scaffold is internally consistent before it becomes Arena's stable baseline.
- Arena main consumes an exact immutable release; an unreleased candidate is tested only as a
  packed artifact in a disposable Arena checkout.
- Existing-repository behavior has a generic automated consumer journey in Rungs.
- Ref-only/non-main Git state is covered before generated CI is recommended.
- Consumer failures name both exact commits and become Rungs-owned regressions without importing
  Arena product content.

### Impacts

- Child items WI-065 through WI-083 own the Rungs changes identified so far; later independently
  scoped children close any remaining release blockers before the immutable candidate is cut.
- Arena owns its separate tracked adoption, document migration and exact-version update.
- A later release item packages the children only after the downstream canary passes.

### Approach

Use a one-way producer/canary flow: exact Rungs commit → packed tarball and integrity → disposable
Arena checkout at an exact commit → immutable Rungs release → dedicated Arena pin update. Each
child remains independently reviewable and supplies its own regression.

### Acceptance criteria / tests

1. Every child is done or explicitly removed from the epic with a written reason.
2. A package built from the integrated Rungs commit passes the generic consumer journey and the
   disposable Arena canary.
3. Arena adopts an exact released version without a committed sibling path, mutable tag or package
   tarball.
4. Both repositories remain independently buildable and recoverable to their prior commits.

### Out of scope

- Arena gameplay or product implementation; Arena owns it after the bootstrap.
- Making every Rungs module mature before adoption. Higher-rung modules remain evidence-driven.
- A required Rungs test that clones or reads private Arena content.

## Execution

Children carry implementation. Handoff from [WI-090](../archive/WI-090-integrated-consumer-verification.md),
2026-09-06, for the flow's remaining steps:

- **Producer candidate.** The tip of `main` after the findings follow-up items landed (WI-093 to
  WI-097, the last at `49348eab`, plus the session-handoff commit after it); every code change of
  the WI-085 programme and of the five follow-ups is on `main`. Pushed 2026-09-06 at the user's
  request: `main` and `green/main` at `2791a21b19740eb6e671e0f3e7e5d4dba68aa546`, and GitHub Actions
  run 34052948336 on that SHA passed all seven jobs — ubuntu-latest, macos-latest, windows-latest on
  Node 22.18 and Node 22 (`npm ci`, `npm test`, `check`, built-executable smoke) plus the site build
  and link check. The matrix is observed, not pending.
- **Tarball and integrity.** Computed from the exact commit at release time with
  `npm pack --dry-run --json` (prepack builds `dist/`; `README.md` is packed, so any README edit
  changes the integrity). At the clean tree of `22edbe3148d16f897a1722ecda02bd0a9ae3464a` the canary
  packed `rungs-cli-0.4.0.tgz`, 121 entries,
  `sha512-T8t0GkgxfcozjA8NRFq8H0C1rk3pD8BVaE1PUIs1aXQ69HDMo8W/5ws05PC8XZnxJ/AMZ3gwvRYow8uD36EzXA==`;
  the landed commit's integrity differs because its README changed after that run.
- **Disposable canary — run, twice.** Consumer Arena Lab at `f4ede7931a7012c45308bb6f32f9fcd027e8dea7`
  (its `main` on 2026-09-06; the earlier-recorded `e927d5fe` is an ancestor). Throwaway clone via
  `git clone --no-hardlinks` of the local checkout, detached at that commit; the maintained checkout,
  which sits on a feature branch with uncommitted work, was only read. First run at producer
  `675780c7`: 1 of 24 gates failed on the untouched scaffold (`adr-index-current`; fixed by WI-091) and
  the eject summary understated the retained surface (WI-092). Second run at `22edbe3` after both
  landed: `doctor` 0; `check` 23 pass before upgrade; `upgrade` plans `instructions 1.2.0 → 1.4.0`,
  `adr 1.2.0 → 1.2.1`, one stale `gates` file, one diverged findings register left alone; `upgrade
  --apply` 0 writing `.ai/gates.toml`, `.ai/rungs.toml`, `.claude/skills/harden-rule/SKILL.md` and a
  new `.claude/settings.json` carrying the hook entry; `check` and `check . full` 24 pass; `doctor
  --explain` 22 imperative rows and the fast-tier budget report (median 1,653 ms against 30,000);
  hook 2 then 0; `eject --dry-run` and `eject` 0; with the tool prefix renamed away, `node
  .ai/rungs.mjs check` and `check full` 24 pass and the ejected hook 2 then 0. Script and log:
  the WI-090 item names them. Not adoption: a synthetic disposable clone, nothing committed anywhere.
- **Remaining steps, not authorized by WI-085.** (1) ~~Push `main` and read the CI matrix for the
  exact SHA~~ — done, above. (2) Cut the release per the `release` module (`changelog.d/0.5.0.md` is the fragment; version
  bump to 0.5.0; immutable tag; `npm publish`). (3) In Arena Lab, a dedicated item that runs
  `node .ai/rungs.mjs upgrade --to 0.5.0` on a branch and commits the result — the launcher pin is
  the only sibling-path-free mechanism, and it cannot resolve an unpublished version, which is why
  the canary drove the packed prefix directly.

## Review

Not started.
