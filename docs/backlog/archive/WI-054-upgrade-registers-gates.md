---
id: WI-054
title: Make `upgrade` re-register a module's gates
type: feature
status: done
branch: feature/WI-054-upgrade-registers-gates
created: 2026-08-16
updated: 2026-08-16
related: [WI-050, F-016, F-017, ADR-0005]
epic:
children: []
---

## Proposal (rationale)

Promoted from [F-016](../FINDINGS.md), found during [WI-050](WI-050-board-reconciled-gate.md).

`rungs upgrade --apply` rewrote a module's **files** and never its **gates**. A module version that
added, removed or renamed one upgraded the files, left `.ai/gates.toml` on the previous block, and
reported success.

So **every consumer repo that upgrades a module silently keeps the old gate set** — and the gate
WI-050 had just shipped could not reach a single existing install. That is the
*unimplemented-gates-are-not-passes* principle failing through the upgrade path: not a gate reporting
green wrongly, a gate that is never registered at all and therefore reports nothing.

## Decision

`accepted` — 2026-08-16. The user directed it ahead of the remaining WI-048 children, which is also
the right order: [WI-052](WI-052-detector-applicability.md) changes gate declarations across all
fifteen modules, and without this that change reaches nobody by upgrading.

## Plan

### Requirements

- Upgrading re-registers each planned module's gates.
- It happens **when a module's files are all current**, which is the case that produced the finding.
- A gate removed from a manifest leaves the registry.
- Idempotent: upgrading twice changes nothing the second time.

### Impacts

- [`src/lifecycle.ts`](../../../src/lifecycle.ts) (`applyUpgrade`) and `cmdUpgrade` in
  [`src/cli.ts`](../../../src/cli.ts). `applyUpgrade`'s return type changes from a number to
  `{ written, gates }`.
- Every consumer repo's next `upgrade` rewrites its registry blocks. Intended, and the merge is
  block-scoped so nothing outside a `rungs:begin`/`rungs:end` pair is touched.

### Approach

Call `registerGates` from `applyUpgrade` for every module in the plan, and change the call site from
`if (apply && stale)` to `if (apply)`. Registration is by whole merge block, so removal falls out of
the same change rather than needing its own path.

### Acceptance criteria / tests

1. A module version that adds a gate, with no stale files, registers it — end to end on a scratch
   consumer, and `rungs check` runs it.
2. A gate removed from a manifest leaves the registry.
3. The registry's block version matches the module's after upgrading.
4. `rungs check` and `npm test` pass here.

### Out of scope

- **The install record.** `.ai/rungs.toml` is not updated by upgrade either — a separate defect with
  a different risk profile, since rewriting it wrongly would mark user-diverged files as ours.
  [F-017](../FINDINGS.md).

## Execution

Branch `feature/WI-054-upgrade-registers-gates`, cut from `main` at `d3f5c0f`.

Reproduced end to end before changing anything: a scratch consumer on `tracked`, then `session`
bumped a minor version with a `[[gates]]` entry appended, then `upgrade --apply`.

| | before fix | after fix |
| --- | --- | --- |
| `[[gates]]` in registry | 20 | **21** |
| new gate present | no | **yes** |
| registry block version | `session@1.1.0` | **`session@1.2.0`** |
| gates `rungs check` ran | 19 | **20** |

**The finding named one defect and the reproduction found two.** Beyond `applyUpgrade` never
registering, the apply step was guarded by `if (apply && stale)` — and a version that only adds a
gate has no stale file, so nothing ran at all. Fixing the first without the second would have left
the exact reported case broken.

**A wrong reproduction nearly passed as a right one.** The first version hard-coded the bump as
`1.0.0 → 1.1.0`; `session` was already at 1.1.0, so the replace matched nothing, the version never
moved, and the script still printed a full result table. It is now derived from whatever the module
is actually at. Same class as the WI-042 triage that shared its engine's assumption: a check that
cannot fail is not a check.

## Review

Verified 2026-08-16.

**1 · A version that adds a gate registers it, with no stale files.** Table above: registry 20 → 21,
block at `session@1.2.0`, and `rungs check` on the consumer went from 19 gates to 20 — so the new
gate does not merely appear in the file, it runs. **Met.**

**2 · A removed gate leaves the registry.** The fix's comment claimed this, so it was tested rather
than asserted. Second scratch consumer, `session-sections-present` deleted from the manifest and the
version bumped:

```
gateWasRegisteredBefore: true · stillInManifest: false · stillInRegistryAfterUpgrade: false
```

**Met.**

**3 · Block version matches the module.** `rungs:begin session@1.2.0`. **Met.**

**4 · Gates and tests here.** `rungs check` → **23 pass · 0 fail · 0 unimplemented · 0 error**.
`npm test` → **18 pass**, up from 17; the new one pins the case the guard broke — every file
`current`, zero written, one registration. **Met.**

### What this leaves

[F-017](../FINDINGS.md): `upgrade` still does not update `.ai/rungs.toml`, so after upgrading to
1.2.0 the record reads 1.1.0 and `planUpgrade` will offer the same upgrade forever. Deliberately not
fixed here — `writeInstallRecord` rewrites the whole record and re-hashes every emitted file that
exists, which would stamp *our* hash onto a file the user had diverged and silently end its
protection. That is a worse failure than the one it fixes, and it needs its own item.