---
id: WI-078
title: Require release exemptions from the current branch
type: feature
status: in_progress
branch: feature/WI-078-branch-local-release-exemptions
created: 2026-09-05
updated: 2026-09-05
related: [WI-067, WI-070, WI-072, F-043]
epic: WI-064
children: []
---

## Proposal (rationale)

`release-changelog-fragment` accepts a reasoned `changelog-ok:` marker anywhere in the current
contents of a changed shipping file. Once such a marker lands on the integration branch, every later
branch that changes an unrelated line in that file can reuse the historical reason without adding
either a fragment or new exemption evidence. The gate is branch-aware for companion fragments and
branch-blind for its escape hatch.

Arena will create the sustained backlog pressure this gate is meant to support. Shipping a reusable
exemption before its evidence is scoped to the work being checked would turn one legitimate waiver
into a permanent off switch on a hot file.

## Decision

`accepted` — 2026-09-05, during the user-authorised Arena Lab bootstrap. An exemption satisfies
`change-requires-file` only when the marker has a substantive same-line reason whose wording is new
to the complete current branch/worktree delta against the resolved integration ref. Existing
markers may remain as history, but reusing, duplicating, moving or copying any reason already present
in the merge-base tree supplies no evidence for new shipping work; rewording is the explicit proof.

## Plan

### Requirements

- Determine exemption provenance against the same exact merge base used to collect changed paths;
  do not inspect the complete current file as though every line belonged to this branch.
- Include committed, staged, unstaged and non-ignored untracked exemption edits with the same verdict
  before and after staging/committing.
- Preserve the substantive same-line reason rule; bare markers, wrapper punctuation, next-line text,
  deleted markers and binary/unreadable evidence remain refusals.
- Reject reason wording inherited anywhere from the integration branch, including duplicates and
  text carried through a pure rename, copy or line move while unrelated shipping content changes.
- Read candidate evidence only from canonically contained regular UTF-8 text that Git attributes do
  not declare binary; aliases, symlinks, invalid text and binary files cannot waive a fragment.
- Preserve NUL-safe path handling, deterministic local/origin/sole-remote integration resolution,
  no-renames changed-path semantics and explicit failure when Git cannot establish provenance.

### Impacts

- `changeRequiresFile` and a narrow Git line-provenance helper in `src/engines2.ts`.
- Git-backed core regressions and the release module's self-test fixture builder/table cases.
- Release-module version and generated claims only if its shipped table or fixture contract changes;
  no new gate, marker or consumer parameter is introduced.

### Approach

Collect the complete changed-path view against the resolved merge base with argv-based Git calls and
NUL-delimited path discovery; never interpolate a path or ref into a shell command. Extract the
reason text inside common comment/string wrappers so adjacent code or formatting is not mistaken for
a reason edit. Build one conservative set of all substantive reason strings present in the
merge-base tree, then accept only contained regular UTF-8 text whose reason is absent from that set.
This deliberately resolves an unknowable copied-versus-coincidentally-identical sentence the same
way before and after staging: historical wording must be reworded for the current branch.

Keep the existing path-level changed set for deciding whether shipping work and a companion fragment
participate. Line provenance narrows only the exemption branch; failure to parse textual provenance
means no exemption, not a guessed pass.

### Acceptance criteria / tests

1. A base-branch file already containing a substantive marker fails when a later branch changes an
   unrelated line and supplies no fragment; the exact F-043 reproduction fails in production
   `runGates` as well as the direct engine.
2. Adding a marker with new reason wording or modifying inherited reason wording passes in
   committed, staged, unstaged and untracked files, with the verdict unchanged across those state
   transitions. Reusing merge-base wording fails consistently in all four states.
3. A duplicate, pure rename/copy or line move carrying inherited wording fails; changing the reason
   during the move passes. Deleted files/markers, aliases, symlinks and binary or unreadable text
   cannot exempt.
4. Bare, next-line, quoted and comment-wrapper-only reasons retain their current failures, and a
   valid branch-local reason still satisfies only a branch that also changes a configured shipping
   path.
5. Local, exact `origin` and sole-other-remote bases produce identical provenance decisions;
   ambiguous or absent refs fail closed with the existing actionable result.
6. Every release self-test still executes in both directions with zero newly unrun fixtures.
7. Focused tests, full `npm test`, package dry-run, `git diff --check` and all registered Rungs gates
   pass. The exact pushed SHA passes all six OS/Node matrix cells and the site job.

### Out of scope

- Replacing inline exemptions with a separate approval file, judging whether a stated reason is
  true, requiring a reviewer identity, or changing which paths count as shipping work.
- WI-076 archive containment, WI-077 eject independence, F-034 line-ending normalization, publishing
  v0.4.0 or Arena's downstream migration.

## Execution

Started from verified `green/main` at `0833172a780da6377da081e7423c46d7bc370186` after WI-076
landed.

## Review

Not started.
