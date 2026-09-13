# Local interface verification — 2026-09-13

Evidence for [WI-100](../backlog/items/WI-100-local-operator-interface.md), against the
[accepted contract](local-interface.md). This records measured behaviour, not independent adoption
or a claim that the interface makes arbitrary repositories faster.

## Baseline and implementation

Fetched origin before execution: remote main was `d21e3f5` (v0.5.0). Local main's two release-recording
commits and the proposal commit `d505f99` added no newer product implementation. The accepted contract
was committed as `a0957e3` before implementation. Product implementation and integration tests are
in `fa23eb5`; the final presentation correction accounts for the browser scrollbar in a narrow
dialog and announces job status. It changes no runner, pin, process or install semantics.

The implementation uses packaged browser assets, a lazy server bundle and fresh inspection/check
workers. There are no added runtime dependencies or emitted consumer services. Existing gate
selection, declared-engine evaluation, detection, ledger and maintenance planners remain authorities.
The additional maintenance cost is roughly 4,400 implementation lines across the browser and read/
server adapters, plus their tests; the small package-size increase does not remove that upkeep.
The documentation site's React/component/runtime stack was not imported into the CLI.

## Automated evidence

| Check | Command / source | Observed result |
| --- | --- | --- |
| Existing CLI and consumer suite | `npm test`, Windows / Node 22.22.3 | 178 pass, 3 existing platform/permission skips, 0 fail; 239.46s. Later tests were also run in the focused suite and CI |
| Final inspection/server cases | `node --max-old-space-size=2048 --test --test-concurrency=1 test/ui-inspection.test.js test/ui-server.test.js` | 26 pass, 0 fail; 24.30s |
| Repository gate set | `node src/cli.ts check` | 32 pass, 0 fail, 0 unimplemented, 0 error |
| Installed consumer | Packed-candidate journey in `test/package.test.js`, extended by `test/ui-packed.js` | Exact runtime dependencies installed offline; installed CLI starts UI, worker resolves modules, assets load, matching pin is displayed, read-only refuses jobs, export agrees |
| Platform matrix at `fa23eb5` | [GitHub Actions run 34758620317](https://github.com/ThroughTheWind/rungs/actions/runs/34758620317) | Ubuntu, macOS and Windows × Node 22.18 and 22: all six passed, plus the site job |
| Local website | `npm run build --prefix site` followed by `npm run check --prefix site` | 182 routes; 2,791 internal links, 0 broken; 51 checked source files, 0 errors/warnings/hints |

The three local skips were a POSIX-only filename case and two existing file-symlink cases that this
Windows host cannot create. The POSIX matrix covers those paths; the UI's escaping-junction and
owned-child tests passed locally. No required UI test was skipped locally.

The new cases demonstrate absent/malformed records and journals; custom paths/prefixes; archived,
unknown and duplicate records; foreign tracker evidence; regular-file/alias/traversal boundaries;
legacy/corrupt/disabled ledgers; default and cumulative tiers; pin/eject refusal; generation changes
from config, registry, pin and untracked content; continuous edits during reads; explicit-run sentinels;
read-only mode; sixty complete findings across shared engines, jobs and export; Host/Origin/token
checks; invalid and oversized bodies; bounded noisy output; responsive polling; cancellation and
foreground shutdown. The handoff test actually executes a harmless fixture launcher through the
named shell with spaces, apostrophes, ampersands and command-substitution-shaped text in its path
and arguments. None is interpreted as an extra command.

## Cost measurements

Machine: Windows 11 Home 10.0.26200 x64, Intel Core i9-14900HX, Node 22.22.3. These are individual
local measurements, not percentile estimates. Baseline and candidate use the same machine and
commands. Normal CLI startup does not import the UI bundles.

| Measurement | Baseline | Candidate | Accepted budget |
| --- | --- | --- | --- |
| Compressed package (`npm pack --dry-run --json --ignore-scripts`) | 524,159 bytes | 633,913 bytes before the final one-line diagnostic provenance label | Growth < 307,200 bytes; observed growth 109,754 bytes |
| Cold `node dist/cli.js --help`, five PowerShell `Measure-Command` runs | Median 70.604ms | 117.4399, 81.7769, 78.0069, 77.2117, 69.9959ms; median 78.0069ms | Median regression < 100ms; observed +7.4029ms |
| Packed CLI listen | — | Startup assertion passes in consumer test on all six matrix cells | < 3s |
| 1,000 work items / 5,000 finding rows | — | 958ms in the final local inspection test | < 5s |
| Filter 1,000 items to `WI-0001` | — | DOM commit 4.10ms; next-frame observation 17.40ms | < 200ms |
| Open work details at narrow width | — | DOM commit 3.70ms; next-frame observation 28.10ms | < 200ms |

Browser timing comes from bounded local `data-render-commit-ms` / `data-render-frame-ms` probes on
the rendered main/dialog elements. Detail timing starts before building its records and Markdown;
two animation frames provide a next-frame observation. This excludes the browser-control tool's
round-trip and is not a human task-completion time. No timings are transmitted or persisted.

## Operator walkthrough

Participant: the implementation agent using Codex's Chromium browser, not an independent operator.
Sources: current rungs checkout and the disposable tracked consumer made by
`node scripts/ui-walkthrough.mjs`. Its 1,000 items link to an evidence file and decision; its findings
register contains 5,000 rows and differs from its install hash; its full tier reports sixty missing
package scripts. The reviewed fixture also retained authored disposition/reason columns in its
findings table; the committed generator uses the standard open-register columns. Both remain raw
source data to the UI. The fixture is not a claimed adoption or representative user study.

| Task | CLI / source baseline actually inspected | Browser steps and outcome |
| --- | --- | --- |
| Find an item's linked evidence | Read `docs/backlog/items/WI-0001.md`, resolve its relative evidence link, then read `evidence.md` | Search `WI-0001` → open result → select **the source evidence**. Exact text appears; executable HTML and the command link stay inert. Escape returns focus to the work-item button |
| Explain a failed gate and scope | `check <fixture> full` reports one pass, one failure and five examined files, showing four findings plus “56 more”; `doctor <fixture> --explain` reports detector scope | Gates → Prepare check run → inspect both commands → Run checks → open `instructions-stale-commands`. All 60 findings render with source links and examined scope; run remains failed and explicitly stale because its sentinel changed the files |
| Locate a diverged installed artifact | `doctor` / `upgrade` identify findings divergence, then the operator follows the named path | Installation → findings → diverged list. `docs/backlog/FINDINGS.md` is directly reachable alongside its recorded/bundle versions and provenance |
| Inspect an upgrade and choose the next command | `upgrade <fixture>` reports 0 files to update, 1 diverged and an `--apply` handoff | Installation → Preview upgrade. File table shows current/diverged states. Gate/hook/record phases remain explicitly unpreviewed, with the pinned CLI handoff available to copy. No mutation occurs |

Additional checks: findings page 2 contains rows 51–100; search reaches row 5,000; diagnostic filtering
shows pages 1–50 and 51–60 for the missing-command detector. Search preserves focus while replacing
results. Dialogs receive focus, trap it and restore it on close. Status text, polite announcements,
visible focus, table headers, labelled filters and a skip link are present. No browser console error
remained after the fixes. At the default desktop viewport, 768×1024 and 390×844, tables and evidence
remain usable; the narrow dialog's measured left edge is 0 and width is the available 375px after
the browser scrollbar. Wide tables scroll within their own containers, not the whole page.

The walkthrough corrected four observed problems: wrapped ordered-list numbering, focus after
nested source navigation, nested finding arrays displayed as object names, and a narrow dialog
using scrollbar-inclusive viewport units. Upgrade preview now defaults to a readable file table;
the complete planner object remains expandable. These are observed usability fixes, not a measured
speedup claim. Independent operator demand and longer-term maintenance value remain unverified.

## Limits retained by design

One repository and one active check job per launch; eight retained runs; no authoring or automatic
apply. Unknown pins and ejected launchers cannot run browser checks. Source generations exclude
the ledger and dependency/build trees and do not certify external, ignored or time-dependent inputs.
Cancellation requests the owned process group/tree; detached processes and side effects are not
rolled back. A partial scan or oversized result is explicit. Legacy ledger rows have no invented
scope or full findings. WI-101's register/workflow experiments and Arena Lab adoption remain separate.
