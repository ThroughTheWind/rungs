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

Implemented on `feature/WI-073-emitted-path-containment`.

`src/emitted-path.ts` is the single boundary for consumer destinations. It treats module output as
portable repository-relative data, rejects both platforms' rooted/traversal/device-name forms,
canonicalises the deepest existing ancestor, and refuses outward aliases. Its operation preflight
also rejects canonical case/Unicode aliases, file/descendant target pairs, writable leaf aliases,
and existing non-file overwrite sinks before any phase writes.

Add now derives files, rules and skills from one emission source and preflights the actual install
set together with fragments, gates, the install record and prospective render output. This wider
set was necessary because `add` automatically renders after installing: validating only module
files could still leave a partial install when a parameterised rule routed an `AGENTS.md` outside
the repository or a later fixed sink was obstructed. Upgrade performs the same check from stored
parameters and revalidates the supplied plan, including emission membership, writable targets,
the gate registry and install record. Doctor/upgrade ownership reads use the same canonical paths.

Adversarial review found and closed three additional forms of the same atomicity defect: an inward
leaf symlink redirecting ownership to another in-repository file, a directory/FIFO/socket at a
later overwrite sink, and individually contained targets such as `foo` plus `foo/bar` that cannot
both be files. The last was reproduced through the real CLI before its regression was added.

Independent review of the first pushed repair found three more merge blockers. A file became
`shared` from its substituted destination rather than its source role, so `session.path` could
impersonate `.ai/gates.toml` or `AGENTS.md` and bypass collision refusal. Existing regular files
were accepted as writable without checking their hard-link count, so writing an in-repository name
could alter another name outside the repository. Finally, lone UTF-16 surrogates reached the host
filesystem, where they can be replaced with U+FFFD and alias a different spelling. Shared whole-file
ownership now belongs only to the literal `instructions` and `gates` sources; every shared sink is
reserved even when its owner is not selected. Writable leaves with more than one hard link and
unpaired surrogate segments are refused during complete-operation preflight.

## Review

| Criterion | Verified |
| --- | --- |
| Direct parameters | CLI and unit fixtures refuse parent/mixed traversal, POSIX/Windows rooted and absolute forms, drive-relative paths, device/ADS/control-name forms, unpaired surrogates and ordinary files aimed at reserved shared sinks; exact and case-variant `AGENTS.md` plus `.ai/gates.toml` leave the consumer empty |
| Stored parameters and supplied upgrade plans | Planning, doctor ownership inspection and application all fail closed; mixed safe/unsafe plans, a forged non-emission target, a reserved-sink impersonation and a later directory target leave the earlier file and install record untouched |
| Canonical aliases and collisions | An outward junction with a missing descendant is refused; an inward directory alias remains valid; leaf redirects, hard-linked writable leaves, cross-phase aliases, case/Unicode aliases, lone-surrogate/U+FFFD aliases and order-independent file/descendant pairs are rejected |
| Preserved behavior | Valid nested targets and `.agents/skills` retain dry-run, install-record, current/stale planning, upgrade and no-overwrite behavior |
| Local repair regression suite | `test/emitted-path.test.js`: 13 tests, 11 pass and 2 Windows file-symlink privilege skips; `npm test`: 70 total, 67 pass and 3 expected platform/privilege skips |
| Local package and repository | `npm pack --dry-run --json`: `@rungs/cli@0.3.1`, 109 entries including `src/emitted-path.ts`; `node src/cli.ts check`: 30 pass, 0 fail; `git diff --check`: clean |
| Prior site evidence | The 146-page site evidence was measured before the review repairs and is retained only as diagnostic history; the new exact tip's site job must replace it before review |

The two file-leaf symlink fixtures require the POSIX CI cells on the exact pushed SHA because this
Windows host does not grant file-symlink creation. The six-cell OS/Node matrix and site job remain
the merge gate rather than being represented as local evidence. Status is `in_progress`: no local
repair evidence or earlier green run substitutes for a fresh independent review of the new tip.

The first exact-tip run, 33957948240, executed both leaf-symlink regressions successfully on Ubuntu
but exposed a test-oracle alias on macOS and Windows: the assertion compared the resolver's canonical
destination with the runner's lexical temporary root (`/var` versus `/private/var` on macOS, and the
equivalent runner alias on Windows). The assertion now canonicalises the expected root too. That run
is retained as diagnostic evidence and is not landing authority. The subsequent green run on
`05deacf` is also superseded: it did not exercise the shared-role, hard-link or surrogate blockers
found in review. A new exact-SHA matrix is required.
