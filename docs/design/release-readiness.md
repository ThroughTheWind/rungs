# Release-readiness assessment

> **Assessed 2026-08-15.** This is an evidence record, not a release approval. The assessment ran
> on `feature/WI-033-assess-quality-and-adoption-readiness` at `9129888` with Windows PowerShell,
> Node `v22.22.3`, npm `10.9.8`, and the local package metadata at `@rungs/cli` `0.1.1`.
> Publication and external announcements were not performed.

## Verdict

**Not ready for external adoption or a public-release push.** The repository source and extracted
package pass their local checks, but a clean consumer install cannot execute the published package's
`rungs` binary: Node refuses to strip TypeScript from a file under `node_modules`. The site also has
three current npm-audit vulnerabilities. Both are release-blocking work for WI-034; WI-035 must wait
for their disposition and a second clean-consumer run.

## Evidence checklist

| Dimension | Evidence | Disposition | Owner / follow-up |
| --- | --- | --- | --- |
| Source tests | `npm test` → 6/6 pass on the assessment branch | accepted-risk | The tests cover the current CLI/module seams; this is not a user-success benchmark. |
| Repository gates | `npm run rungs -- check` → 20 pass, 0 fail after the assessment item was committed | accepted-risk | The gate result is necessary but not sufficient for adoption. |
| Docs and frontend | `cd site && npm run build` → 96 pages; `cd site && npm run check` → 0 Astro errors/warnings/hints, 1,195 internal links, 0 broken | accepted-risk | The build retains the pre-existing duplicate-content-id warnings; see F-010 / WI-034. |
| Package shape | `npm pack --json` → `@rungs/cli@0.1.1`, 100 files, 120,216-byte tarball, 368,552-byte unpacked; `LICENSE` and `MIT` metadata included | accepted-risk | The packed file contains `src/` and `modules/` as declared by `package.json`. |
| Clean dependency install | `npm install --prefix C:\Temp\rungs-wi033-consumer C:\Temp\rungs-wi033-package\rungs-cli-0.1.1.tgz` → 2 packages added, 3 audited, 0 vulnerabilities | accepted-risk | Dependency resolution itself is clean on this host. |
| Clean consumer command | `npm exec --prefix C:\Temp\rungs-wi033-consumer -- rungs --help` fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` in `node_modules/@rungs/cli/src/cli.ts` on Node 22.22.3 | **blocking** | WI-034: ship an executable consumer entry point (or a supported runtime strategy), then replay the journey. |
| Extracted package journey | After extracting the same tarball outside `node_modules` and installing `smol-toml`, `doctor`, `init`, `check`, `render`, `upgrade` preview, and `eject --dry-run` ran; a git-backed packed smoke repo registered 19 gates and passed 18/18 | accepted-risk | This proves the source files work outside the Node restriction; it does not clear the installed-bin blocker. |
| Safe failure / recovery | `add definitely-not-a-module --into C:\Temp\rungs-wi031-smoke --dry-run` exits 1 with an explicit unknown-module message; the consumer repo remains clean | accepted-risk | The no-write path is safe and attributable. |
| Root dependency audit | `npm audit --omit=dev` → 0 vulnerabilities | accepted-risk | Root runtime dependency posture is clean at assessment time. |
| Site dependency audit | `cd site && npm audit` → 3 vulnerabilities (2 high, 1 low): Astro, Sharp, and esbuild; `npm audit fix --force` proposes breaking Astro `7.2.2` | **remediate-before-release** | F-009 → WI-034. Do not force-upgrade as part of this assessment. |
| Licensing | Root `LICENSE` is MIT and the packed artifact includes it; `package.json` declares `MIT` | accepted-risk | The Rift Forge source's unresolved licence is not a dependency of this package. |
| Upgrade/eject boundary | Preview and dry-run completed on the extracted package; ejection reports 19 declared gates and writes nothing in dry-run mode | accepted-risk | Re-run after the installed-bin fix; ejected copies intentionally stop receiving engine updates. |
| Platform matrix | Only Windows PowerShell + Node 22.22.3 was exercised; Linux/macOS, Node 22.18, and alternate npm clients were not | not-applicable | WI-035 release checklist must name the supported matrix or explicitly limit it. |
| Registry / provenance | No publish, `npm view`, provenance attestation, or consumer run from the public registry was performed | not-applicable | WI-035 owns publication credentials, registry verification, and rollback evidence. |
| External recovery | No public issue/report flow, upgrade from an older published version, or uninstall/rollback was exercised | not-applicable | WI-035 must provide the operator path; WI-034 owns any CLI defect it exposes. |
| Site content warnings | Astro reports duplicate collection ids for existing root/docs inputs, including `backlog/backlog`; build succeeds and link checks pass | **remediate-before-release** | F-010 → WI-034: make ids collision-free or make the warning an explicit checked boundary. |

## Replayable commands

The following are the exact local commands used. Temp paths are disposable and outside the
repository; no command published or modified the package registry.

```text
node --version                         # v22.22.3
npm --version                          # 10.9.8
git rev-parse HEAD                     # 9129888
npm pack --pack-destination C:\Temp\rungs-wi033-package --json
npm install --prefix C:\Temp\rungs-wi033-consumer C:\Temp\rungs-wi033-package\rungs-cli-0.1.1.tgz
npm exec --prefix C:\Temp\rungs-wi033-consumer -- rungs --help  # fails before doctor
npm audit --omit=dev
cd site && npm audit
cd site && npm run build
cd site && npm run check
```

For the extracted-package control, the tarball was unpacked to
`C:\Temp\rungs-wi033-extracted\package`, `smol-toml@1.8.0` was installed there, and the following
were run against `C:\Temp\rungs-wi033-packed-smoke`:

```text
node ...\src\cli.ts init ...\packed-smoke tracked
node ...\src\cli.ts check ...\packed-smoke
node ...\src\cli.ts render ...\packed-smoke
node ...\src\cli.ts upgrade ...\packed-smoke
node ...\src\cli.ts eject ...\packed-smoke --dry-run
```

## What remains unknown

This report does not infer readiness from local gates, file presence, or a successful tarball pack.
The installed-bin failure prevents a real clean-consumer journey from reaching `doctor`, so user
upgrade and recovery behaviour remain unproven. Registry publication, provenance attestations,
platform compatibility, network/proxy policy, and a clean install from the public registry are also
unknown. Those are explicit release-checklist inputs for WI-035, not accepted facts.

## Release recommendation

Hold public-release work at WI-035 until WI-034 either fixes or explicitly accepts (with a written
reason) the installed TypeScript entry-point blocker, the site audit findings, and the duplicate
content-id warning. Then replay this report from a fresh consumer directory using the published
artifact and record the supported Node/platform matrix before announcing readiness.
