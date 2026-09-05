---
id: WI-068
title: Gate the packaged existing-repository consumer journey
type: feature
status: done
branch: feature/WI-068-existing-repo-consumer-journey
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, WI-065, WI-066, WI-067]
epic: WI-064
children: []
---

## Proposal (rationale)

Rungs' scratch checks have primarily created repositories it already controls. Arena Lab exposed a
different path: existing `AGENTS.md` and `CLAUDE.md`, flat backlog/decision/session authorities,
non-Rungs documentation, and a real Git history. The producer needs a small generic journey that
detects regressions in retrofit, preservation, idempotence and packaged execution without importing
Arena's project content.

## Decision

`accepted` — 2026-09-05. Add a generic existing-repository package journey and retain Arena only as
the downstream release canary.

## Plan

### Requirements

- Exercise the candidate from a package tarball, not the producer checkout, source tree, build
  output or `node_modules`, and verify the tarball's bytes against npm's reported SHA-512 integrity.
- Build a temporary existing repository with committed history and the minimum independent
  authorities Arena exposed: existing `AGENTS.md` and `CLAUDE.md`, a flat backlog, a flat decisions
  register, a historical session log and an existing repository-owned validator.
- Prove `doctor` and `init --dry-run` leave that repository byte-for-byte and ref-for-ref unchanged.
- Install the tracked profile with `NEXT` work-item ids, `AF` finding ids and the existing validator
  adopted as a command gate, without rewriting the repository's pre-existing authorities or adding
  a product `package.json`, lockfile or `node_modules`.
- Prove the emitted launcher carries the candidate's one exact `@rungs/cli` version authority, its
  managed hash is recorded, and no mutable selector, tarball path or second version source leaks
  into the consumer.
- Validate the installed repository twice from a non-integration branch that has `origin/main` but
  no local `main`, then preview and apply a same-version upgrade twice without producing stale,
  diverged or non-idempotent managed state.
- Restore the fixture to its seed commit and prove both the consumer and producer finish clean.

### Impacts

- `test/package.test.js`, with one package-level integration test and local helpers kept inside the
  test file unless reuse is demonstrated elsewhere.
- Temporary package, tool-prefix, consumer and npm-cache directories outside the producer checkout.
- No production source, module template, manifest, public documentation or release behavior unless
  the journey exposes a defect; a defect becomes a finding rather than widening this item.

### Approach

Create one temporary root with sibling `pack`, `tool`, `consumer` and `npm-cache` directories. Pack
the candidate with npm, parse the JSON result, recompute the tarball SHA-512 digest and compare it to
the reported integrity. Seed the consumer on `main`, commit its authorities, create
`refs/remotes/origin/main`, switch to `consumer/canary`, then delete local `main`; this reproduces a
detached-CI-shaped integration ref while retaining a writable branch.

Install the absolute candidate tarball into the isolated tool prefix using npm's argv interface,
with lifecycle scripts, audit, funding output and package-lock generation disabled. Invoke only the
installed `rungs` binary via `npm exec --offline --prefix <tool> -- rungs`, with `PATH` and
`NODE_PATH` sanitised so the producer checkout cannot satisfy imports. The generated registry
launcher is inspected but deliberately not executed before publication, because its exact registry
version may still name the previous immutable release.

Packing the exact declared `smol-toml` version from the configured npm registry is the journey's one
online package-integration precondition. Its bytes and integrity must match the producer lockfile.
After the dependency and candidate tarballs exist, both installation steps and every candidate CLI
invocation run offline; the candidate never gets an opportunity to resolve through the registry.

Snapshot the seed commit, refs, status and pre-existing file bytes before running `doctor` and a
tracked `init --dry-run`. Perform the real tracked init with explicit backlog and findings prefixes,
then assert preservation at the byte or managed-block boundary appropriate to each file. Commit the
adoption, verify a second init refuses without changing the tree, run the complete generated gate
set twice, and compare all tracked bytes while allowing the append-only ignored gate ledger to grow.
Preview and apply the same candidate version twice through the packed binary and require identical
tracked output with no stale or diverged managed files. Finally, run path-validated `git reset` and
`git clean` only inside the temporary consumer, prove its seed tree is restored, remove the temporary
root in `finally`, and assert the producer's status is unchanged.

### Acceptance criteria / tests

1. The packed artifact's recomputed SHA-512 digest equals npm's integrity, and every candidate CLI
   invocation resolves through the isolated installed prefix rather than producer files.
2. The fixture contains committed existing authorities plus an existing validator; `doctor` and
   tracked `init --dry-run` return successfully and leave its tracked tree, untracked files and refs
   unchanged.
3. Tracked init with `backlog.id_prefix=NEXT` and `findings.id_prefix=AF` preserves the original
   authority bytes, appends only declared managed blocks where applicable, registers the existing
   validator and emits no consumer product dependency files.
4. `.ai/rungs.mjs` contains exactly one `@rungs/cli@<candidate-version>` package spec, its hash is in
   `.ai/rungs.toml`, and the installed tree contains no mutable Rungs selector, package tarball path
   or duplicate CLI version authority.
5. After adoption is committed, a repeated init refuses without a diff; two complete checks pass on
   `consumer/canary` with only `origin/main` available, including merged-status reconciliation and
   the adopted validator, and the tracked tree remains clean after both runs.
6. Same-version upgrade preview is read-only; two applies leave every tracked byte identical with no
   stale or diverged module state, and a second preview reports no work.
7. Rollback operates only inside the validated temporary fixture, restores the seed commit's tracked
   tree, and leaves the producer checkout exactly as clean as it began; the focused package test,
   full `npm test` and `node .ai/rungs.mjs check` pass.

### Out of scope

- Running the generated registry launcher before the candidate version is published.
- Publishing a release, changing npm distribution tags or testing external CI infrastructure.
- Importing Arena Lab content or its ids; the fixture reproduces only the generic topology.
- Migrating a consumer's legacy backlog, decisions or session history into Rungs-owned files.
- Fixing production behavior uncovered by the journey; record the defect as a separate finding.

## Execution

Implemented the package-level journey in `test/package.test.js` without changing production or
module code.

- The fixture packs the candidate, verifies its SHA-512 integrity, and uses its one online
  package-integration precondition to fetch the exact declared `smol-toml` artifact into an isolated
  npm cache and verify its bytes against the exact lockfile integrity. It then installs both
  tarballs offline into a temporary tool prefix before invoking only that prefix with offline
  `npm exec` calls.
- It seeds and commits the six existing authority surfaces plus one repository-owned validator,
  removes local `main` while retaining `origin/main`, proves `doctor` and dry-run are read-only,
  performs the tracked install with `NEXT`/`AF`, and verifies preservation, emitted path bounds,
  validator adoption and the single exact launcher authority.
- It commits the adoption, proves repeated init refuses unchanged, runs the complete gate set twice,
  checks the ignored ledger doubles, exercises upgrade preview/apply, rolls back only the validated
  temporary consumer, and proves the seed refs, branch, bytes and producer status are restored.
- The parallel release audit's unrelated changelog-gate mismatch was recorded as [F-039](../FINDINGS.md),
  not folded into this item.

The journey exposed [F-040](../FINDINGS.md): a same-version apply consumed inter-block blank lines
and the terminal newline from `.ai/gates.toml` despite reporting `0 to update · 0 diverged`.
[WI-069](WI-069-idempotent-gate-registration.md) fixed the production defect separately
and landed on `main` in `7a69711` (including the CRLF preservation fix `c05fb4b`). After integrating
that fix, the unchanged packed journey passes both applies byte-for-byte and each apply leaves the
consumer clean. WI-068 itself remains a test-and-documentation-only change.

## Review

Two independent review passes are complete. The first identified four blockers around full Git
state, dependency provenance, the online boundary and mutable package selectors; the follow-up
review confirmed all four were closed. Acceptance evidence, measured on 2026-09-05:

1. **Met.** The test recomputes and matches npm's SHA-512 integrity, packs the exact declared
   `smol-toml@1.8.0` dependency through npm into the isolated cache, recomputes its integrity and
   matches the exact `package-lock.json` entry, then inspects the isolated install's package name,
   version, bin, exact dependency and installed dependency version. Registry acquisition is an
   explicit online package-integration precondition; both installs and every candidate command
   after packing are offline, against that prefix with producer resolution paths removed. The
   registry launcher is inspected but never executed.
2. **Met.** The committed fixture contains all six existing authority surfaces and its own
   validator. Full Git state and tracked/untracked bytes are identical before and after `doctor`
   and tracked `init --dry-run`.
3. **Met.** Tracked init uses `NEXT` and `AF`, preserves `README.md`, `CLAUDE.md` and every other seed
   file byte-for-byte except the declared managed appends to `AGENTS.md` and `.gitignore`, adopts the
   validator, stays inside the allowed generated path families, and emits no consumer package,
   lockfile or `node_modules`.
4. **Met.** Extraction of every literal `@rungs/cli@<selector>` occurrence across the complete
   consumer corpus produces exactly one value, `@rungs/cli@0.3.1`. The separately tested launcher
   permits its template expression only after validating an explicit upgrade target as an exact
   version. A second corpus scan rejects any bare `@rungs/cli` package use, with regression probes
   for both `npx @rungs/cli check` and `npm exec --package=@rungs/cli -- rungs`, without mistaking the
   launcher's internal literals for consumer authority. Its derived 12-character managed hash is
   recorded in `.ai/rungs.toml`, and neither a tarball name nor its local path leaks into the
   consumer.
5. **Met.** Repeated init refuses with no diff. Two full checks pass on `consumer/canary` with only
   `origin/main`, including merged-status reconciliation and the adopted validator. The ignored
   ledger doubles exactly while the tracked digest and repository status stay clean.
6. **Met.** Both upgrade previews report zero work while preserving every ref, local config entry,
   index mode/entry/flag, status value and tracked byte. Both same-version applies report
   `0 to update · 0 diverged`, preserve the adoption digest byte-for-byte and leave clean status.
7. **Met.** Rollback is path-guarded to the temporary consumer and restores its complete seed Git
   state and bytes before cleanup; producer status is unchanged. The focused selector-and-packed
   journey run passed 2/2 in 16.71 s and `npm test` passed 46/46 in 19.97 s.

Repository audit also passed: 52 module command spans resolve across 15 dispatched commands,
`npm run rungs -- check` passes 29/29 gates, and `git diff --check` reports no whitespace errors.
