---
id: WI-099
title: Prepare the v0.5.0 release
type: chore
status: done
branch: feature/WI-099-release-0.5.0
created: 2026-09-07
updated: 2026-09-07
related: [WI-064, WI-085, WI-060, ADR-0008]
epic:
children: []
---

## Proposal (rationale)

`changelog.d/0.5.0.md` has accumulated fourteen entries since v0.4.0: the six consumer promises the
WI-085 programme completed, the two defects its canary found, and six findings follow-ups. Every one
is landed on `main`, and the platform matrix passed on `2791a21b` and `3a4cae7f` (2026-09-06). The
release flow [WI-064](../items/WI-064-arena-lab-dogfood-bootstrap.md) accepted needs an immutable version to
pin; nothing pins an unpublished commit.

## Decision

`accepted` — 2026-09-07, at the user's request ("prepare 0.5.0"). Preparation is the reversible part
of the [release runbook](../../design/release-runbook.md) §1–§5: decide, gate, assemble, bump, gate
again. Tagging, pushing the tag, cutting `release/0.5.0` and `npm publish` are §6 and are not part of
this item — they need a green CI run on the exact prepared commit and a live `npm whoami`.

## Plan

### Requirements

- Version decided from the fragments: features present, no breaking change → minor → 0.5.0.
- Both audits clean; `npm test`, every gate and `check-doc-claims` green on the starting tree and
  again on the prepared tree.
- The fourteen entries folded into the versions page newest-first as `kind: "minor"`; the fragment
  deleted; `CONSUMED_THROUGH` advanced to 0.5.0 in the same change.
- `package.json`, `package-lock.json`, `site/package.json`, `site/package-lock.json` at 0.5.0; README
  status sentence and roadmap Phase 7 row name v0.5.0; `publishedVersion` stays 0.4.0 because that is
  what the registry serves (verified, not remembered).
- Site claims regenerated after the tree is green; site built and link-checked.

### Impacts

- `site/src/pages/versions.astro`, `changelog.d/`, both manifests and lockfiles, `README.md`,
  `docs/roadmap.md`, `site/src/generated/claims.json`.

### Approach

Follow the runbook literally and record every measured value here. Where the runbook and the
portable skill disagree about a command, the runbook wins for this repository.

### Acceptance criteria / tests

1. Second-pass gate set on the prepared commit: `npm audit` ×2 zero, `npm test` green, `rungs check`
   32 pass, `check-doc-claims` agrees (version 0.5.0), `release-version-consistent` and
   `release-fragment-current` pass with the fragment gone and the boundary at 0.5.0.
2. `npm view @rungs/cli dist-tags` read before editing `publishedVersion`; the page renders 0.5.0 as
   pending and 0.4.0 as latest.
3. The item names the irreversible steps left and their preconditions.

### Out of scope

- §6: tag, `release/0.5.0`, publish, next candidate; the Arena Lab pin (WI-064). Nothing else deferred.

## Execution

Branch `feature/WI-099-release-0.5.0` from `c71e8ad5`, 2026-09-07, following the runbook §1–§5:

- **§1 Version.** `CONSUMED_THROUGH` read `0.4.0`, equal to the package version — a steady tree.
  Commit census since `v0.4.0` (49 non-merge commits): 18 `docs:`, 7 `fix:`, 5 `feat:`, 1 `test:`,
  1 `chore:`. The fourteen fragment entries include five features (package-free ejection, hook
  delivery, explain-only instruction diagnostics, budget reporting, recoverable installs) and no
  breaking change: `check`'s grammar widened, `npm test`'s script changed, the `adr` template block
  changed shape under a version bump. Minor → **0.5.0**, as requested; the fragments support it.
- **§2 First gate.** `npm audit` and `npm audit --prefix site` both 0 vulnerabilities;
  `node src/cli.ts check` 32 pass; `check-doc-claims` 6 claims agree at 0.4.0. The full `npm test` on
  the starting tree is the WI-098 landing's (158 tests, 155 pass) — no code changed since.
- **§3 Assemble.** Fourteen entries folded into `site/src/pages/versions.astro` as `0.5.0 · minor`,
  five `added` and nine `fixed`, each compressed from its fragment paragraph; `changelog.d/0.5.0.md`
  deleted; `CONSUMED_THROUGH` → `0.5.0`.
- **§4 Bump.** `npm version 0.5.0 --no-git-tag-version` in the root and in `site/`; README status
  sentence and roadmap Phase 7 row → v0.5.0. `publishedVersion` stays `0.4.0`: `npm view @rungs/cli
  dist-tags` → `{ latest: '0.4.0' }` on 2026-09-07, recorded in the page's comment. The page's "next
  candidate" sentence, which named `candidate/0.4.1` (49 commits behind `main`, 0 ahead — trap T5 for
  the third release running), now says work lands on `main` and the version is decided from the
  fragments, so it cannot name a branch nobody uses.
- **Two gate refusals on the way, both mine.** `docs-version-claims` requires the roadmap row to keep
  the words "released from" so the claim stays checkable — my "prepared from" rewording was reverted.
  `gates-paths-exist` caught the session handoff still naming the consumed fragment in a code span.
- **§5 second gate** recorded in the Review.

Not done, by design (§6): tag, `release/0.5.0`, `npm publish`, and the next-candidate decision. The
preconditions are a green CI run on the exact prepared commit and a live `npm whoami`.

## Review

§5 second gate on the prepared tree, 2026-09-07:

| Check | Result |
| --- | --- |
| `npm audit` / `npm audit --prefix site` | 0 / 0 vulnerabilities |
| `npm test` | 158 tests, 155 pass, 0 fail, 3 skipped, 175 s |
| `node src/cli.ts check` | 32 pass, 0 fail — `release-version-consistent` sees both manifests at 0.5.0, `release-fragment-current` sees no fragment at or below the boundary |
| `node scripts/check-doc-claims.mjs` | 6 claims agree (version 0.5.0, 9,895 lines, 15 commands) |
| `npm run claims --prefix site` | 32 gates (+1 hook), run 32 pass 0 fail, regenerated after the tree was green |
| `npm run build` / `npm run check --prefix site` | 178 pages; 2,723 internal links, 0 broken |
| `npm pack --dry-run --json` | `rungs-cli-0.5.0.tgz`, 121 entries, `sha512-Rly8axgYN1+D+hCefSCF+hJS41nq/t9nO1E8dx1cVHC2RDe6lu3Mquo3bgPQM/avqRe7lBqQZ6ekJMXdg5HWag==` on this tree before the landing commit; recompute from the tagged commit |
| `npm view @rungs/cli dist-tags` | `{ latest: '0.4.0' }` — the page renders 0.5.0 as pending, 0.4.0 as latest |

Acceptance criterion 3, the irreversible steps left and their preconditions, in order:

1. Land this item; push `main`; confirm the CI matrix is green on the exact landed commit
   (`gh run list --commit <sha>`).
2. `npm whoami` must answer with the publishing account (v0.4.0 was tagged and branched before a
   401 surfaced; the tag was correct and the publish was re-run, but check first).
3. `git tag -a v0.5.0 -m "rungs v0.5.0 — …"` on that commit; `git push origin main --follow-tags`;
   `git branch release/0.5.0 v0.5.0 && git push -u origin release/0.5.0`; `npm publish --access public`.
4. Afterwards, in the same session: `publishedVersion`/`publishedDate` on the versions page to
   0.5.0 and the publish date, verified against `npm view @rungs/cli dist-tags` (trap T3), and a
   `docs: record v0.5.0 as published` landing.
5. Then the Arena Lab pin item under WI-064.
