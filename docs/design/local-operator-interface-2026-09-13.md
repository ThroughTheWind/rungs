# Local operator interface assessment

> Assessed 2026-09-13. **Proposal, not shipped behaviour or an accepted product decision.**
> [WI-100](../backlog/items/WI-100-local-operator-interface.md) owns implementation scope and
> acceptance. [WI-101](../backlog/items/WI-101-operator-workflow-extensions.md) owns the subsequent
> evaluation of relationships, validation routing and additional registers. Pattern definitions
> remain in the [catalogue](../research/pattern-catalog.md).

## Recommendation and evidence boundary

**I recommend an optional local web interface, started by the operator for one repository.** Its
value is shortening the path from a state to its evidence and next operation: find an item, follow
its finding, understand a failed gate, inspect a diverged artifact, and run the relevant declared
check tier without reconstructing commands across several files.

This is a designed product proposal motivated by this operator's request and the existing CLI
surfaces below. It is not an extracted UI pattern or evidence of demand from independent users.
No usability study or time-saving measurement has been performed. The implementation item includes
task-based validation instead of a promised percentage improvement.

### Freshness, checked before assessment

| Observation on 2026-09-13 | Command / source | What it establishes |
| --- | --- | --- |
| Remote refs fetched successfully | `git fetch origin --no-tags` | Assessment did not rely on an unfetched remote-tracking branch |
| Inspected local commit `7d1840452cba4ea7733c70dc40caf0a9abe16711`; fetched `origin/main` and `origin/release/0.5.0` at `d21e3f5fd10b3da75d127843c718c0d154a5afab` | `git rev-parse HEAD origin/main`; remote ref inspection | Identifies the actual local and remote baselines |
| Local main ahead 2, behind 0 | `git rev-list --left-right --count main...origin/main` → `2 0` | Local checkout was not behind fetched main |
| No product-source differences between them | `git diff --stat origin/main..HEAD -- src modules test scripts package.json package-lock.json` → empty | The inspected CLI, modules, tests, build scripts and dependencies match fetched main |
| Differences confined to release records | `git diff --name-only origin/main..HEAD` → `.ai/session.md`, WI-064, the existing-promises evidence record, `site/src/pages/versions.astro` | Explains the two local commits; does not claim identical documentation |
| Published latest and local package both 0.5.0 | `npm view @rungs/cli version dist-tags --json --registry=https://registry.npmjs.org`; `package.json` | Confirms the registry version label, not tarball/source byte identity |

The [September 5 assessment](tool-evaluation-2026-09-05.md) describes an older baseline. Its
remediation gaps are not premises for this proposal: the current source includes the work completed
under [WI-085](../backlog/archive/WI-085-existing-promises-remediation.md) and its follow-ups.
Re-fetch and compare again when implementation starts.

## Fit with rungs

The [product brief](product-brief.md) owns the boundaries: modules install and maintain workflow
files; a scaffolded repository acquires no service; nothing daemonizes. A user-started CLI process
can serve those files' interpreted state until the operator exits. I recommend this as a CLI
capability, with packaged static assets, rather than another installed module.

That interpretation needs an explicit clarification in the owning brief **if WI-100 is accepted**.
This assessment does not amend it. Apply the [ADR admission rule](../decisions/README.md#admission-rule)
to any remaining cross-cutting decision; an additional ADR is not required merely to duplicate a
boundary already owned by the brief.

| Option | Benefit | Cost / recommendation |
| --- | --- | --- |
| Continue with CLI and source files | Existing installation and maintenance cost | Remains sufficient for scripted use; weak at repeated cross-reference navigation |
| Static HTML snapshot | Small implementation and no listener | Useful export, but goes stale and cannot offer live checks; does not fully meet this request |
| Foreground local interface | Current repository projection plus explicit operations | Recommended; adds an HTTP/browser boundary and a shared inspection contract to maintain |
| Persistent service or independent work database | Could support many repos and continuous automation | Outside this proposal; introduces lifecycle, synchronization and operational ownership beyond the requested job |

## Operator journeys and first-release views

The first screen shows repository identity and links to four views. Use a searchable table for
dense work and gates, with optional status grouping for work. Counts are navigation aids, never a
workflow score. Every derived state has a source path and an explanation of what was read.

| View | Questions answered | First-release content |
| --- | --- | --- |
| Repository and installation | Which checkout is this? What is installed or diverged? | Canonical absolute root, Git branch/HEAD/dirty or unavailable; running CLI version, repository pin and installed module versions separately; harnesses, parameters, ownership/adoption states, kept/missing/stale/diverged artifacts, provenance/cost, render degradation and interrupted-install evidence |
| Work | What is recorded, and where is the evidence? | Live/archive filters, status/type/text search, complete item details, declared parent/children/related links, linked findings with disposition/reason, linked ADRs, source documents and unresolved references |
| Gates | What would run, what failed, and what do past results establish? | Registry, cumulative tiers, engine or command, configuration source and rationale; runner checks, lifecycle hooks and explain-only detectors distinguished; complete findings from UI runs; recorded ledger history, duration and existing budget states |
| Diagnostics | What does detection actually observe? | Explicitly requested detection/explain results, full evidence, scope, skipped/error/unimplemented reasons, filters and supported next-command handoffs |

Session state is an authored handoff accessible as a document. The Work view derives declared
status from canonical item records, never from session prose. It does not claim to reconcile the
handoff's current-work assertions: [F-056](../backlog/FINDINGS.md) remains open and its optional
explicit-reference contract belongs to WI-101. Existing `related` links are not dependency edges.
An item's declared state and an observed branch fact remain distinct.

Missing modules produce a useful absence explanation, not empty charts. Existing foreign tracker
or milestone detection produces context and source links, not a fabricated local board. Preserve
configured roots, prefixes, adopted content and unknown status values. Unsupported document shapes
remain visible with source access and a parse limitation.

## Operator tools and execution boundary

| Tool | v1 behaviour | Boundary |
| --- | --- | --- |
| Navigate and inspect | Search, filters, cross-links, inert document preview, copy id/path and source location | Read only; no arbitrary filesystem browser or editor protocol execution |
| Refresh | Read a new generation of source state; show changed/stale/partial sections | No checks or command gates run on startup, navigation, refresh or file-change notification |
| Inspect proposed maintenance | Explicit upgrade and archive previews through existing planning functions; show covered paths, disposition, refusal reasons and coverage limits | Upgrade's module-file plan does not cover gate/hook registration or install-record updates; label those phases unpreviewed, never infer a no-op from no file delta; apply through a CLI handoff |
| Run diagnostics | Explicit invocation of existing read-only detection/explain engines with scope shown | Commands and hooks are not executed as detectors; no new enforcement verdict |
| Run checks | Explicit operator action selecting the default check operation or an existing declared tier, displaying the resolved operation, then streaming progress and results | Runs repository-defined commands with the operator environment; can write files, use credentials and reach the network; no sandbox or rollback is supplied |
| Take results elsewhere | Explicit download of the full versioned inspection/result data and copy a safely quoted, supported CLI command | Local export may contain repository text/paths; never upload or export automatically |

Suggested command shape is `rungs ui [path]`, with a port option, a no-browser option and a read-only
mode that disables check execution. These are **proposed syntax**, not commands that work today.
Bind to an explicit loopback address and choose an available port by default; a requested occupied
port fails clearly. Print the selected repository and local address. Browser launch failure leaves
the foreground server usable by its address. All UI assets ship with the CLI; no frontend build,
new runtime installation or service registration is required in a consumer repository.

Check execution is one explicit mode inside this item, not a general terminal. The server accepts
an allowlisted operation with structured arguments, resolves the tier through the existing runner,
and uses a child process with a job id, bounded output and a terminal state. Preserve default
no-tier behaviour when `runner.tiers` is absent; do not invent a required tier. It stays responsive
while checks run. Serialize jobs launched by that server; report other activity as unknown rather
than claiming a repository-wide execution lock. Show the selected command list and authority before
the operator presses Run; do not add a second confirmation for the same unchanged operation.

If the registry, module resolution or repository identity changed after the displayed plan, require
a refreshed plan before execution. Record the start/end source generation and mark results stale
or changed when inputs change. Cancellation requests stop the owned worker, mark the job interrupted
and report which descendant termination was actually verified on each supported OS; never label
an interrupted run successful or promise rollback. Foreground shutdown closes the listener and
watchers, requests job termination and reports any children it could not stop.

A running inspector's version is not necessarily the repository's pinned version. Show both; disable
in-browser checks on an incompatible/unknown pin and hand off the repository's supported command.
Inspection of an ejected repository does not extend the retained launcher: `eject` still retains
exactly `check` and `hook`. v1 ejected inspection is best effort through an explicitly invoked CLI
package; check execution uses a handoff to the retained launcher, not a new ejected `ui` promise.

## Architecture and state contract

```text
Repository Markdown / TOML / JSONL + read-only Git observations
                |
      shared inspection and planning adapters
      (existing engines + explicit parse/read states)
                |
      versioned snapshot / preview / result contract
                |
      foreground loopback server ---- packaged browser UI
                |
      explicit check job ---- existing runner in child process
```

The browser renders results; it does not implement detection, tier selection, work-item status
semantics or upgrade eligibility. No console scraping, browser-only rules or second persistent
database. The internal/exported contract carries schema/tool version, root identity, capture time,
source generation, per-section read state/source paths and complete underlying results. Pagination
does not discard records. Adding JSON flags to every existing CLI command is not a prerequisite.

The current building blocks and the work the new lifetime exposes are concrete:

| Inspected source | Reuse / requirement |
| --- | --- |
| [`DetectResult`](../../src/types.ts:151), doctor assembly in [`cli.ts`](../../src/cli.ts:100) | Reuse detection and install parameters; do not turn `unknown` into `absent` |
| [`GateRun`, `RegistryGate`, tier selection](../../src/check.ts:15) | Retain outcome and surface distinctions, cumulative tiers and complete findings |
| [`ExplainResult`](../../src/explain.ts:32), [`CLI presentation`](../../src/cli.ts:298) | Reuse full findings/skips/scope; the existing four-finding display limit is not an API limit |
| [`readRecord`](../../src/lifecycle.ts:30), [`readJournal`](../../src/add.ts:581) | Existing readers collapse parse failure and absence; add explicit inspection errors rather than asserting uninstalled or no interruption |
| [`installedParams`](../../src/check.ts:281) | Root-keyed caching assumes a short invocation; invalidate by relevant inputs or use a fresh worker/read context after edits |
| [`appendLedger`](../../src/check.ts:310) | Rows lack tree/config fingerprints and full findings. Historical success is only a recorded past result, never proof the current tree passes; do not invent missing findings |
| [`UpgradeItem`](../../src/lifecycle.ts:51), [`ArchivePlan`](../../src/backlog.ts:45) | Reuse typed previews; source changes invalidate them. Upgrade's emitted-file comparison is partial: record/gate changes in `applyUpgrade` and hook registration in `cmdUpgrade` are not described by that plan |
| [Backlog archive reader](../../src/backlog.ts:123) and gate field readers | Narrow readers are not a complete item parser; specify supported frontmatter/Markdown conventions, preserve raw values, and test malformed/adopted shapes |

Snapshot generations cover relevant configuration and content, including dirty/untracked input;
HEAD equality alone does not establish freshness. Reading files is not an atomic repository
transaction: detect changes during a read, retry within a bound or label the affected section
inconsistent. Show captured-at and last-refresh/error state. File notifications can mark a view
stale; explicit refresh remains a fallback on filesystems with unreliable watching. Do not silently
mix cached parameters with fresh files. No ledger schema migration is included; any later one must
respect [ADR-0005](../decisions/ADR-0005-self-instrumentation.md).

## Local HTTP and packaging requirements

Loopback binding alone is not the access policy. Protect repository reads and actions with a
per-launch secret, validate Host/Origin, refuse cross-origin requests, and expose no permissive CORS.
Exchange any browser bootstrap token without persisting it in logs, query strings or referrers;
expire access on shutdown. Serve no repository content without authorization. GET requests never
execute actions. Set request/body/output limits and test forged requests and repeated starts.

Contain source reads within the selected canonical root, applying existing alias/junction/symlink
rules and rejecting traversal. No root-switching HTTP endpoint. Render Markdown and logs as
untrusted content: inert raw HTML and unsafe links, no command URLs, remote images or scripts.
Use packaged assets, a restrictive content policy and no telemetry. Inspection performs no remote
fetch or package lookup; explicit check jobs retain the repository commands' real network authority.

The process design follows the distinction between synchronous and asynchronous calls in the
[Node child-process documentation](https://nodejs.org/api/child_process.html), and the browser
request protections address the mechanisms described in
[MDN's CSRF documentation](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF)
(consulted 2026-09-13). These sources inform requirements; they do not certify this unbuilt server.
Implement against the package's supported Node/OS matrix, not APIs available only in newer docs.

## Cost, validation and revisit triggers

The ongoing cost is a maintained read contract, frontend assets, secure server lifecycle, browser
tests and cross-platform process tests. Keep normal CLI startup independent of UI loading. Measure
packed size and cold start before/after; establish explicit fixture size/latency budgets during the
first implementation slice. No UI framework is selected by this assessment. Reuse suitable design
tokens/components only if they do not couple the tool to the documentation site's server/build.

Validate keyboard access, visible focus, text equivalents for statuses, a list alternative to the
board, responsive reading and accessible progress/error announcements. Exercise four tasks against
the CLI/source baseline: find an item's linked evidence; explain a failed gate and its scope; locate
a diverged installed artifact; inspect a proposed upgrade and choose the next command. Record
actual steps, success/failure and confusion; label the participants and fixture limitations. A
maintainer walkthrough is useful evidence, not independent adoption.

Revisit browser authoring only after those tasks expose a concrete bottleneck and an existing CLI
mutation can provide a plan, conflict detection and a verifiable result. Revisit multi-repo views
only with repeated cross-repo lookup evidence. New record semantics stay in WI-101; external module
installation stays in [WI-063](../backlog/items/WI-063-external-module-roots.md). No agent dispatch,
automatic status advancement, PR/merge UI, worktree deletion, cloud sync, workflow scoring or generic
registry framework is included.
