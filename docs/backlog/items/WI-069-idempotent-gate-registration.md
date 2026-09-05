---
id: WI-069
title: Preserve gate-registry bytes on a no-op upgrade
type: feature
status: review
branch: feature/WI-069-idempotent-gate-registration
created: 2026-09-05
updated: 2026-09-05
related: [WI-064, WI-068, F-040]
epic: WI-064
children: []
---

## Proposal (rationale)

WI-068's packed existing-repository journey installed the tracked profile, committed the untouched
result, and immediately ran a same-version `upgrade --apply`. Preview reported
`0 to update · 0 diverged`, but apply changed `.ai/gates.toml`: separators between managed module
blocks disappeared and the terminal newline was removed. A no-op lifecycle command that dirties a
consumer makes upgrade unsuitable as Arena Lab's repeatable health check and contradicts the
managed-file contract.

## Decision

`accepted` — 2026-09-05. Fix the byte instability before WI-068 or the Arena Lab bootstrap can
complete. Keep the change limited to managed-block composition and its regression evidence.

## Plan

### Requirements

- Re-registering unchanged gate blocks preserves `.ai/gates.toml` byte-for-byte, including blank
  separators between blocks and the file's terminal newline.
- Managed-block replacement still updates the selected block when its version or body changes and
  never changes consumer-owned bytes before or after that block.
- A same-version upgrade preview and repeated `--apply` on a freshly committed tracked scaffold
  leave its tracked tree clean and byte-identical.

### Impacts

- `src/substitute.ts`, where `mergeBlock` defines replacement and append boundaries for every
  shared managed file.
- Focused unit coverage in `test/core.test.js`; WI-068's packed journey remains the end-to-end
  consumer regression and must pass unchanged after this fix.
- No module template or module-version bump: this corrects lifecycle composition rather than
  changing emitted module content.

### Approach

Reproduce the registry layout with adjacent managed blocks and a final block at end-of-file. Make
replacement preserve all bytes outside the matched marker range while normalising only the supplied
fragment's own outer whitespace. Cover both an identical replacement and a real version/body
replacement before relying on the packed consumer journey.

### Acceptance criteria / tests

1. A focused `mergeBlock` test replaces an unchanged middle gate block and an unchanged final gate
   block with no byte difference.
2. The same test changes one block's marker/body while preserving its surrounding separators,
   consumer prose and final newline exactly.
3. WI-068's packed journey reaches both same-version applies with an unchanged tracked digest and
   clean Git state.
4. `npm test`, `git diff --check` and `npm run rungs -- check` pass.

### Out of scope

- The inert release-fragment gate recorded as F-039; it receives its own work item.
- General CRLF normalisation recorded as F-034, changes to module content, or new upgrade behavior.

## Execution

Implemented on `feature/WI-069-idempotent-gate-registration` from `0ed80b5`.

The cause was narrower than general block composition: both marker expressions used `\s*` inside
the marker line. JavaScript's `\s` includes newlines, so the end-marker match greedily consumed the
blank lines and terminal newline that followed it. The expressions now accept horizontal marker
whitespace plus an optional CR only; replacement still slices around the exact marker range.

Added unit coverage for an unchanged middle block, an unchanged final block and a real version/body
replacement. WI-068 merged this branch as dependency commit `10ac4be` without changing its packed
test and replayed the complete consumer journey successfully.

## Review

Verified 2026-09-05.

1. **Met.** Both unchanged hash-comment blocks return the exact input string, including the blank
   separator and terminal newline.
2. **Met.** A `first@1.0.0` → `first@1.1.0` body replacement matches the exact expected registry;
   the runner prefix, adjacent block, separator and final newline are unchanged.
3. **Met.** The unchanged WI-068 packed journey passed 1/1 from integration commit `10ac4be` in
   14.48 seconds. Both apply digests match the committed tracked digest, all Git status checks are
   clean and rollback restores the original ref/file state.
4. **Met.** The two focused `mergeBlock` tests pass; `npm test` passes 44/44, `git diff --check`
   passes and `npm run rungs -- check` passes 29/29. The existing warning for 45 fixtures without
   builders remains explicit and out of scope.
