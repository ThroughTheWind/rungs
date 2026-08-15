# WI-032 claim inventory

> Reconciled 2026-08-15 on `feature/WI-032-sync-docs-roadmap-frontend`. This is the working
> inventory for the docs/roadmap/frontend sync. A claim is changed only when its authority and
> evidence are named; historical research numbers remain when they are explicitly labelled as a
> snapshot.

| Surface / claim | Current value after sync | Authority and evidence | Treatment |
| --- | --- | --- | --- |
| Package identity and version | `@rungs/cli` `0.1.1`, MIT, Node `>=22.18` | [`package.json`](../../package.json), `Get-Content package.json`, 2026-08-15 | Keep current; README, roadmap, and site continue to use package metadata rather than a second version. |
| Module catalogue | 15 modules across rungs 0–5 | [`docs/design/module-catalog.md`](module-catalog.md) and `Get-ChildItem modules -Directory`, 2026-08-15 | Keep current; landing page and README use the same count. |
| Tracked-profile registration | 19 gates after the WI-031 findings gate | `npm run rungs -- init C:\Temp\rungs-wi031-smoke tracked`, 2026-08-15 | README's tracked example updated from 18 to 19. This is distinct from the self-hosted repo's 20 registered gates. |
| Self-hosted health | 20 pass, 0 fail, 0 unimplemented | `npm run rungs -- check`, 2026-08-15 | Keep the dated README/site status; it describes this checkout, not every install profile. |
| Rift Forge research snapshot | Candidate SHA `4a51848c…`, 3,585 commits, 433 branches, 105 worktrees | [`docs/research/repos/rift-forge.md`](../research/repos/rift-forge.md), refreshed 2026-08-15 from the candidate checkout | Landing-page source card updated from the older 3,236/401 survey snapshot. Older research tables are labelled as baseline where retained. |
| Roadmap phase posture | Phase 6 real source-repo install outstanding; Phase 7 package/site landed; module registry outstanding | [`docs/roadmap.md`](../roadmap.md), package metadata, WI-030/WI-031; reviewed 2026-08-15 | Keep as roadmap intent, not a shipped-capability claim. WI-031's adopted gate is described in the module catalogue and matrix. |
| Public wiki coverage | The Astro wiki reads `docs/` in place; the new capability matrix is automatically routed | [`site/src/content.config.ts`](../../site/src/content.config.ts), `npm run build` and `npm run check`, 2026-08-15 | No copy or hand-maintained route added; the generated registry remains the source of truth. |

## Retained historical claims

The original corpus numbers (for example, Rift Forge's 3,236 commits / 401 branches and the first
publication at v0.1.0) are valid as historical snapshots. They are not silently rewritten: current
landing/status surfaces use the refreshed values above, while dated research and release history
retain the original evidence.
