---
id: WI-066
title: Give consumers one exact Rungs CLI version source
type: feature
status: done
branch: feature/WI-066-consumer-cli-pin
created: 2026-09-05
updated: 2026-09-05
related: [WI-064]
epic: WI-064
children: []
---

## Proposal (rationale)

The generated GitHub workflow runs `npx @rungs/cli check`. A consumer can therefore execute a
different CLI after npm's `latest` tag moves even though its repository has no diff. Arena Lab needs
one exact version source shared by local instructions and future CI, and upgrades must remain
explicit.

## Decision

`accepted` — 2026-09-05. Design and implement a consumer-visible exact pin without adding Rungs to
the product runtime or silently following the producer checkout.

## Plan

### Requirements

- A tracked consumer receives one committed launcher whose package spec includes the exact version
  of the Rungs artifact that emitted it.
- Generated local validation instructions and generated CI invoke that launcher rather than a
  floating package reference.
- The launcher forwards routine CLI arguments and the child process exit status on Windows, Linux
  and macOS without a shell interpreting user input.
- Its upgrade bootstrap accepts only an explicitly named exact version, invokes that newer artifact,
  and lets the existing managed-file mechanism advance an untouched launcher; a consumer-diverged
  launcher remains untouched.
- The published CLI's complete production dependency closure is exact, so an exact top-level pin
  cannot resolve different runtime code later.

### Impacts

- The reserved render facts and substitution tests in `src/substitute.ts`.
- The universal instructions module, its generated `AGENTS.md`, and the generated launcher at
  `.ai/rungs.mjs`.
- Every consumer-emitted command reference, the generated CI workflow and their module versions.
- The module-command audit, package manifest/lockfile and package-level consumer tests.

### Approach

Add `{{rungs.version}}` beside `{{repo.dirname}}` as a reserved, non-user-settable render fact,
derived from the executing package's `package.json`. The instructions module emits
`.ai/rungs.mjs`, containing one exact `@rungs/cli@<version>` spec and using `npm exec` to forward
the requested Rungs command. Resolve npm to its JavaScript entry point when available and spawn it
with `process.execPath`, avoiding a shell on every platform; fall back to the executable only on
platforms where it is directly executable.

Intercept only `upgrade --to <exact-version>` in the launcher. Validate the value as a complete
semantic version, run that exact package with `upgrade --apply`, and let the resulting managed-file
rewrite establish the new normal pin. Refuse tags, ranges, paths and misplaced `--to` arguments.

Make the validation matrix, gates fragment, work-item/release procedures and CI workflow invoke
`node .ai/rungs.mjs check`. The launcher file, rather than a parameter copied into
`.ai/rungs.toml`, is the committed consumer authority: the record stores its managed hash and the
normal upgrade path can advance or preserve it. Pin the only production dependency to its exact
version. Bump every module whose emitted content changes.

### Acceptance criteria / tests

1. Resolving render facts returns the package manifest's exact version, and substitution still
   preserves GitHub Actions `${{ ... }}` expressions.
2. A fresh tracked scaffold contains exactly one `@rungs/cli@<exact-version>` package spec in
   `.ai/rungs.mjs`, records its hash, and its local validation instructions use the launcher.
3. A disciplined scaffold's generated workflow invokes the launcher and contains no floating
   `npx @rungs/cli` command.
4. With a fake npm JavaScript entry point, the launcher forwards routine arguments exactly and exits
   with the same non-zero status without a shell; `upgrade --to 2.0.0-beta.1 --apply` selects that
   exact package and strips only the launcher-owned selector, while `latest` is refused before npm.
5. Upgrade classification marks an unchanged old launcher stale and a locally edited launcher
   diverged; the generic apply/rehash behavior remains covered and a second plan is current.
6. `package.json` and its lockfile use exact `smol-toml@1.8.0`; `npm test`, the module-command audit
   and `rungs check` pass.

### Out of scope

- Publishing the resulting CLI version and switching Arena to it; a release work item owns that
  irreversible boundary.
- Running an unpublished version through the generated registry launcher; candidate canaries invoke
  the packed tarball directly until that exact version exists in npm.
- Fixing Git ref reconciliation or executing the full foreign-repository canary; WI-067 and WI-068
  own those respectively.

## Execution

Implemented on `feature/WI-066-consumer-cli-pin` from `646f68c`.

- Added reserved `{{rungs.version}}` rendering from the executing package manifest. Reserved facts
  are applied after overrides, so neither a consumer nor a same-named module can replace them.
- Added an instructions-owned `.ai/rungs.mjs` launcher that uses an exact package spec, finds npm's
  JavaScript entry point, and spawns it without a shell. Its `upgrade --to` bootstrap accepts exact
  semantic versions only, solving the otherwise circular problem of a pinned launcher updating itself.
- Switched every consumer-emitted command reference and the CI workflow to the launcher. Bumped each
  changed module version and regenerated the site claims.
- Extended the command-claim audit to parse launcher invocations and structured TOML command fields,
  and to reject a bare command in any consumer-emitted file, rule, skill, gate or fragment.
- Pinned the only production dependency, `smol-toml`, to `1.8.0` in both manifest and lockfile.

## Review

Verified on 2026-09-05.

1. **Met.** The render-fact test reads `package.json`, rejects a synthetic `9.9.9` override, emits
   the exact manifest version and preserves a GitHub Actions expression.
2. **Met.** A fresh disciplined scaffold contains one exact package spec in `.ai/rungs.mjs`, stores
   its 12-character content hash, and emits the launcher command in `AGENTS.md`.
3. **Met.** The scaffolded GitHub workflow runs `node .ai/rungs.mjs check` and contains no floating
   `npx @rungs/cli check`.
4. **Met.** A fake npm entry point received the exact routine argument vector including a shell
   metacharacter, and its exit status 23 propagated unchanged. The exact prerelease upgrade selector
   became the package spec and did not reach the CLI; `latest` exited 1 without invoking npm.
5. **Met.** Focused lifecycle coverage classifies an unchanged old launcher as stale, rewrites and
   rehashes it to current, then preserves a consumer-edited launcher as diverged.
6. **Met.** Manifest and lockfile assert exact `smol-toml@1.8.0`; `npm test` passes 41/41,
   `module-commands-exist` validates 52 claims, and `rungs check` passes 29/29. The existing warning
   for 45 fixtures without builders remains transparent and out of scope.
