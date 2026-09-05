---
id: WI-073
title: Contain every emitted module path inside the consumer repository
type: feature
status: in_progress
branch: feature/WI-073-emitted-path-containment
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, WI-072, F-046]
epic: WI-064
children: []
---

## Proposal (rationale)

A module parameter can become part of an emitted filename. Rungs substitutes that value and joins
the result to the consumer root without proving the destination remains inside it. During WI-072,
`changelog_dir = "../../escaped"` made both a dry-run install and an upgrade plan target
`../../escaped/CONSUMED_THROUGH`; applying either path would write outside the repository.

This is a systemic consumer-boundary defect rather than a release-marker defect. Arena Lab is meant
to consume configuration from the published package and later from its own stored install record.
Neither source may be able to turn a repository-scoped workflow tool into an arbitrary filesystem
writer, and WI-072 must not land while the new parameterised file exposes that known path.

## Decision

`accepted` — 2026-09-05, during the user-authorised Arena Lab bootstrap. Fix the shared emission
boundary before landing WI-072 or cutting 0.4.0. Reject unsafe values rather than rewriting them:
normalising an escape into a different in-repository destination would conceal a configuration
error and could alias two module files.

## Plan

### Requirements

- Resolve every module-emitted file, rule and skill destination through one fail-closed repository
  containment invariant before install or upgrade mutates the filesystem.
- Reject parent traversal, absolute/rooted paths, drive-relative paths, mixed Windows/POSIX escape
  forms, and destinations whose deepest existing ancestor is a symlink or junction outside the
  canonical consumer root.
- Apply the same validation to direct CLI parameters and parameter values later read from
  `.ai/rungs.toml`.
- Validate a complete install or upgrade plan before its first write, so one unsafe later target
  cannot leave a partially applied operation.
- Preserve valid nested parameter paths, non-default skill directories, no-overwrite ownership and
  upgrade divergence semantics.
- Name the offending module and emitted target in the refusal without touching the outside path.

### Impacts

- Module emission and installation in `src/add.ts`; upgrade planning and application in
  `src/lifecycle.ts`; a shared path helper if that keeps the invariant single-sourced.
- CLI failure behavior for unsafe module parameter values: commands become red before mutation.
- Unit and end-to-end fixtures on both direct installation and stored-record upgrade paths.
- WI-072 remains open until this fix is integrated back into its exact reviewed tip.

### Approach

Treat emitted destinations as portable repository-relative paths, not host-native input. Refuse
either platform's absolute/rooted/drive-relative syntax and resolve both separator forms before
checking containment. Canonicalise the repository root and the destination's deepest existing
ancestor, then append only the missing suffix; this catches a symlink or junction inside the repo
that points outside even when the final file does not yet exist.

Expose one resolver that returns the safe absolute destination or throws a typed/actionable error.
Preflight the complete set of substituted targets at the operation boundary. Installation may then
reuse those validated paths; upgrade planning validates generated targets, and application validates
the supplied plan again before any write rather than trusting an earlier in-memory result.

### Acceptance criteria / tests

1. Direct add/init refuses `../`, absolute/rooted, drive-relative and mixed-separator emitted paths
   on every host, reports the module and target, and leaves both the repo and outside sentinel clean.
2. A stored malicious parameter makes upgrade planning/application fail closed; application writes
   none of an otherwise mixed safe/unsafe plan.
3. An in-repository symlink/junction to an outside directory is refused, including a missing child
   below that existing alias.
4. Valid nested parameter values and valid custom skill directories still install, dry-run, record,
   plan and upgrade with their existing ownership semantics.
5. Focused tests, full `npm test`, package dry-run, `git diff --check` and all registered Rungs gates
   pass. The exact pushed SHA passes all six OS/Node matrix cells and the site job.

### Out of scope

- F-047's TOML version false-green, F-042/F-045's incomplete eject boundary and F-043's inherited
  exemption. Each retains a separate work item before 0.4.0.
- Validating parameter meaning beyond filesystem containment or imposing one directory naming style.
- Sandboxing gate commands or files that a consumer deliberately edits after Rungs emits them.

## Execution

Not started.

## Review

Not started.
