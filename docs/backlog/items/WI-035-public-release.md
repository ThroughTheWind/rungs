---
id: WI-035
title: Prepare and execute the public rungs release
type: chore
status: review
branch: feature/WI-035-public-release
created: 2026-08-15
updated: 2026-08-15
related: [WI-033, WI-034]
epic:
children: []
---

## Proposal (rationale)

Rungs already has an npm package identity and a published v0.1.1, but the repository still calls the
product pre-release and the external-user path has not been proven end to end. After capability
integration, documentation sync, assessment, and remediation, a dedicated release item is needed to
turn a ready tree into a reproducible public release with rollback evidence and honest release notes.

## Decision

`accepted` — 2026-08-15, by explicit request. Publication is deliberately last and depends on the
reviewed readiness assessment and its remediation item.

## Plan

### Requirements

- Confirm WI-033's release recommendation and WI-034's acceptance criteria are complete on the exact
  release commit; refuse to publish from a dirty or unverified tree.
- Choose and record the version, changelog entry, tag, npm dist-tag, supported Node/platform matrix,
  and release notes. Preserve the package identity `@rungs/cli` and its MIT metadata.
- Verify the packed artifact contents and a clean consumer installation before publication; run the
  documented smoke journey after publication from a separate temporary consumer.
- Record publication outcome, immutable commit/tag, package version, rollback/unpublish boundary,
  and the next development line in the repository backlog/session state.

### Impacts

- `package.json`, lockfile if dependency metadata changes, changelog/release notes, git tag, npm
  registry state, README/docs status, and possibly the website's release banner.
- Publication is an external side effect and must be performed only during execution with the user's
  authorization and credentials; dry-run and local-pack checks are required before it.
- A failed or partial publication needs a documented recovery path rather than a second ad-hoc publish.

### Approach

1. Run the readiness and remediation gates on the candidate release commit and capture the exact ref.
2. Prepare version/changelog/tag changes, build the package, inspect `npm pack --dry-run`, and replay
   the clean-consumer journey from the packed tarball.
3. With explicit publication authorization, publish the exact artifact, verify registry metadata and
   a clean install, then tag/record the release according to the chosen order.
4. Update public docs/status and create the next candidate or follow-up item only after the published
   artifact is verified; if any step fails, leave the tree and registry state documented for recovery.

### Acceptance criteria / tests

1. WI-033 recommends release and WI-034 is done, with no unreviewed blocking finding on the release
   commit.
2. `npm pack --dry-run`/packed-artifact inspection shows only intended files; a clean Node 22.18+
   consumer can install and complete the smoke journey.
3. Version, changelog, tag, npm dist-tag, README status, and release notes agree, and the package
   exposes the documented `rungs` command.
4. Publication (or a documented, authorized dry-run if credentials are unavailable) is verified from
   a separate consumer with registry/version evidence and a rollback/recovery note.
5. `npm test`, `npm run rungs -- check`, and site build/link/type checks pass on the release commit;
   the post-release development line is recorded.

### Out of scope

- Adding capabilities, rewriting docs without a release-specific reason, or remediating new defects
  discovered after the release gate; split those into new WIs.
- Publishing third-party modules or changing the package name.

## Execution

Execution started on `feature/WI-035-public-release` after WI-034 was merged. The registry is
reachable, but `npm whoami` returns 401, so publication is currently limited to an authorized dry-run
and local artifact verification.

- The release candidate is `@rungs/cli@0.1.1`, preserving the package identity and MIT metadata;
  `changelog.d/0.1.1.md` and the README candidate status agree with the manifest and lockfile.
- Release-commit checks are green: `npm test` passes 7/7, `npm run rungs -- check` passes 20/20,
  `cd site && npm run build` builds 97 pages, `cd site && npm run check` reports 0 diagnostics,
  1,203 links, and 0 broken, and `cd site && npm audit` reports 0 vulnerabilities.
- `npm pack --pack-destination C:\Temp\rungs-wi035-package --json` produced a 102-file,
  197,602-byte `rungs-cli-0.1.1.tgz` with the bundled `dist/cli.js`, source, modules, README, and
  LICENSE. `npm publish --dry-run --tag latest --access public` passed without metadata warnings.
- A separate clean consumer installed that tarball and completed `doctor`, git-backed `init`,
  `add release`, `check` (21/21), `render`, `upgrade` preview, `eject --dry-run`, and an unknown
  module dry-run that exited 1 while leaving the repository clean.
- Registry evidence is explicit: `npm view @rungs/cli version dist-tags --json` reports public
  `latest` `0.1.0`; `npm whoami` returns 401 and the authorized `npm publish --tag latest --access
  public` attempt returned 404 without changing the registry. No tag was created.
- Supported target is Node `>=22.18` on Windows, Linux, and macOS; only Windows PowerShell with
  Node `v22.22.3`/npm `10.9.8` is verified in this item, so the other OSes remain unverified.

## Review

Ready for review as a release candidate. All local acceptance checks and the authorized dry-run pass;
the only unmet external step is npm publication, blocked by missing credentials. The branch must not
be tagged or merged as a public release until an authenticated maintainer reruns `npm publish`, then
verifies `npm view @rungs/cli@0.1.1` and a fresh registry consumer. No public-release claim is made.
