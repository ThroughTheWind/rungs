---
id: WI-035
title: Prepare and execute the public rungs release
type: chore
status: planned
branch:
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

Not started. Planning artifact only; execute on `feature/WI-035-public-release` after WI-034 is merged and publication is explicitly authorized.

## Review

Not started.

