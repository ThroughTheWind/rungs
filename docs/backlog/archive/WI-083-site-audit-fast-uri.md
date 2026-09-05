---
id: WI-083
title: Clear the site fast-uri security audit finding
type: chore
status: done
branch: feature/WI-083-site-audit-fast-uri
created: 2026-09-05
updated: 2026-09-05
related: [WI-034, WI-035, WI-064, F-009, F-053]
epic: WI-064
children: []
---

## Proposal (rationale)

Immediately before preparing the 0.4.0 release, `npm audit --prefix site` found the committed site
lock resolving `fast-uri@3.1.5`. npm reports that version under four high-severity advisories for
host confusion and server-side request forgery. The package is transitive through Ajv, its declared
range already accepts a fixed release, and neither the root nor site audit is an explicit step in
Rungs' concrete release runbook.

This is a release blocker with a deliberately small repair. The package manifests do not need a new
dependency or a version change: refreshing the one transitive lock resolution to `3.1.7` is enough.
Making both package-tree audits explicit prevents a clean root result from being mistaken for a
clean site tree at a later cut.

## Decision

`accepted` — 2026-09-05, during the user-authorised Arena Lab bootstrap. Promote F-053 immediately,
update only `site/package-lock.json` through npm's resolver, and require fresh-install, audit,
site, repository-gate and package evidence before the 0.4.0 release work resumes. Do not widen this
item into an Astro upgrade or change either package version.

## Plan

### Requirements

- Resolve `fast-uri@3.1.7` through the existing Ajv range without adding it to `site/package.json`.
- Keep the lock delta to the `fast-uri` version, tarball URL and integrity; reject unrelated optional
  package or platform metadata churn.
- Prove the root and site package trees independently report zero vulnerabilities after clean
  installation from their committed locks.
- Add both audit commands to this repository's concrete release runbook, where its separate site
  package is known; do not export repo-specific package layout into the portable release skill.
- Preserve both package versions at `0.3.1` and leave F-053 open until the reviewed change lands.

### Impacts

- One transitive resolution in `site/package-lock.json`, with no manifest change.
- The repository-specific pre-release gate sequence in `docs/design/release-runbook.md`.
- F-053, this work item, the backlog id markers and WI-064's child inventory.

### Approach

Use `npm update fast-uri --package-lock-only --ignore-scripts --prefix site`, then inspect the entire
lock diff before installing. Run `npm ci --prefix site` and require `npm ls fast-uri --prefix site`
to resolve exactly `3.1.7`; audit both package roots separately. Exercise the existing site build
and check, full source suite, all registered Rungs gates and package dry-run so a security-only lock
refresh cannot conceal a packaging or documentation regression.

### Acceptance criteria / tests

1. `site/package-lock.json` resolves `fast-uri@3.1.7`; `site/package.json` and root manifests are
   unchanged, and no unrelated lock entry changes.
2. A clean site install succeeds, `npm ls fast-uri --prefix site` names `3.1.7`, and both
   `npm audit --prefix site` and root `npm audit` report zero vulnerabilities.
3. The concrete release runbook runs both audits before tests and gates, explains why the package
   trees are independent, and does not alter the portable release skill.
4. Site build/check, full `npm test`, all registered gates, package dry-run and `git diff --check`
   pass; the exact pushed implementation SHA passes the six-cell OS/Node plus site matrix.
5. Package and site versions remain `0.3.1`; WI-083 remains `in_progress` and F-053 remains open for
   independent review and landing.

### Out of scope

- Adding a direct `fast-uri` dependency, upgrading Astro/Ajv or accepting npm's unrelated optional
  dependency churn.
- Changing package versions, assembling 0.4.0, tagging, publishing, closing F-053 or archiving this
  item.

## Execution

Started from exact green `main` `141338c8f3e766c0c2fe5ddf6c25a12fc3482871`. The pre-change
`npm audit --prefix site` reported one high-severity vulnerable package and four advisories against
the locked `fast-uri@3.1.5`; the root package tree was not implicated.

`npm update fast-uri --package-lock-only --ignore-scripts --prefix site` changed exactly the
`fast-uri` version, resolved tarball and integrity fields to `3.1.7`. No package manifest, optional
package entry or package version changed. The release runbook now names the root and site audits as
separate, blocking checks before tests and registered gates.

Local acceptance evidence on Node `v22.22.3` / npm `10.9.8`:

- `npm ci --prefix site` installed 424 packages from the changed lock and audited 425 with zero
  vulnerabilities. `npm ls fast-uri --prefix site --all` resolves the only installed copy as
  `@astrojs/check -> @astrojs/language-server -> volar-service-yaml -> yaml-language-server ->
  ajv@8.20.0 -> fast-uri@3.1.7`.
- `npm audit --prefix site` and root `npm audit` each report zero vulnerabilities. A root `npm ci`
  also installed five packages from its unchanged lock and audited six cleanly.
- `npm run build --prefix site` built 156 pages and precompressed 159 files; `npm run check --prefix
  site` reports 0 errors, 0 warnings and 0 hints across 51 files, then 2,412 internal links with 0
  broken.
- Full `npm test` reports 142 tests: 139 pass, 0 fail and 3 expected platform skips. All 30
  registered Rungs gates pass, including the new item's backlog, finding and link relationships.
- `npm pack --dry-run --json` reports `@rungs/cli@0.3.1`, 114 entries and 385,222 packed bytes.
  Both manifests still state `0.3.1`; the package tarball's source inventory is unchanged.

## Review

Independent review first found that the two audit commands were separate from the existing Bash
`&&` chain, so a later successful command could mask a red audit. Exact commit
`f763f2400aee0c016152b1e710ca1f52dbe48ea0` fixes that process defect by chaining both audits into
the fail-fast gate. Git for Windows Bash parses the exact multiline command, and an independent
re-review approves that commit with no remaining findings.

Exact-tip GitHub Actions run 33979067323 passed the site plus both Node versions on Linux, macOS
and Windows: 7/7 jobs green. `rungs land` then verified the merged implementation tree at
`8e96c6f1e1ffec20e62edee9f369597c63371498` with 30/30 gates. A direct check of that exact tree
failed only `backlog-merged-status`, because this item was intentionally still marked
`in_progress` until the implementation landing succeeded.
