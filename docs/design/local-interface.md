# Local interface contract

> Authoritative for the local inspector delivered by [WI-100](../backlog/items/WI-100-local-operator-interface.md).
> Accepted 2026-09-13. The [dated assessment](local-operator-interface-2026-09-13.md) records the
> baseline and alternatives. Repository files and existing engines retain their respective authority.

## Command and lifetime

`rungs ui [path] [--port <1..65535>] [--no-open] [--read-only]` serves one canonical repository on
`127.0.0.1`. An omitted port selects an available one. An invalid path/option or occupied requested
port fails with a reason. By default the command opens the browser; failure prints a usable local
address and leaves the server running. `--no-open` prints the address without launching a browser.
The process stays in the foreground until interrupted; it installs no service or consumer files.
`--read-only` disables check jobs; inspection, diagnostics, previews and exports still work.

Browser assets and server/worker JavaScript ship in the package. The consumer needs only the
existing supported Node runtime and a browser. The normal CLI lazily imports the server, so commands
that do not use the interface do not load its browser or server code. Source checkout and packaged
entry points use the same implementation.

The local address includes a per-launch secret in the URL fragment for initial authentication.
The client removes the fragment immediately and retains access only in memory/session storage for
that exact origin. The secret never appears in a query, referrer, job environment or application
log. The foreground terminal's launch address is an access capability, not a shareable report.
Stopping the server invalidates it. No server-side account database or persistent UI state exists.

## Authority and read states

The versioned inspection contract carries `schemaVersion`, tool version, canonical root, capture
time, content generation and section-level read states: `ok`, `absent`, `partial`, `error` and
`unsupported`. Errors retain implicated source paths and reasons. Missing and malformed install
records/journals are distinct. A malformed install record prevents parameter-based interpretation
instead of falling back to defaults and announcing that nothing is installed.

The four views are repository/install, work, gates and diagnostics. Source navigation, text filters,
item status/type filters, live/archive selection and optional grouping operate on complete data.
The default work view is a table. Unknown status values and duplicate ids stay visible. Individual
records are keyed by source path, not id alone. A linked finding's disposition/reason and ADR metadata
are reachable from work details. Session prose is presented as an authored source, never active-work
truth. `related`, parent and child links do not imply prerequisites or permission to proceed.

The supported item frontmatter is a deliberately limited data format: top-level keys, plain or
quoted scalars and flat arrays of scalars (flow or indented block sequences). Comments outside quotes
are supported; duplicate keys, nested objects, tags, aliases and multiline scalar constructs produce
explicit unsupported/error states, with raw source still available. It is not advertised as a general
YAML parser. Markdown headings and pipe tables provide item sections and findings rows; raw columns
and table section labels are preserved. Unrecognized layouts fall back to source inspection rather
than an empty board. Configured backlog root/prefix, findings path and ADR/session paths take priority;
detection proposals are suggestions and never silently adopted as parameters.

Installation data includes running CLI version, repo launcher pin, module versions, harnesses,
parameters, ownership/adoption/file states, provenance/threshold and render/journal source. Presence
detection on refresh uses `detect`; diagnostics engines run only on explicit request. Foreign tracker
paradigms retain their context and links without inventing a file-backed board.

Gate data uses the registry and shared selection logic. Default checks select all runner gates;
declared tiers are cumulative. Hooks and explain-only detectors are identified separately. Ledger
rows are historical observations without current-tree/config provenance or complete findings. Keep
raw legacy rows and parse problems visible alongside the existing budget report. UI jobs carry full
structured findings independently; a current source generation does not turn a historical pass into
validation of all repository inputs.

## Freshness and containment

Each read runs in a fresh worker context, avoiding stale parameter caches. A generation fingerprints
the scan's file contents and module metadata plus Git identity; it includes dirty/untracked content
and excludes generated dependency/build trees as the existing walker does. The gate ledger is an
observation sink, excluded from the content generation. Capture time says when ledger history was
read. Commands may depend on ignored files, credentials, external systems or time; a generation
cannot establish their continued validity.

Compare generation before/after reads. Retry a changed read once, then report partial/inconsistent
data. Bound the scan and disclose limits; never silently claim completeness after a cap or unreadable
input. Periodic freshness requests mark the browser stale without running checks or replacing a
focused detail. Explicit refresh fetches current data and is the fallback when notification is late.
Current-plan checks re-read their generation before any command executes. Results carry start/end
generation and changed/unknown scope, with no repository-health score.

All repository source requests must be from the inspector's allowed source set: configuration,
records, owned artifacts, diagnostic findings and links reached from those sources. There is no
arbitrary root switching, directory listing or filesystem static mount. Resolve paths with existing
contained-path rules; refuse escaping symlinks/junctions, leaf aliases and non-regular sources. Source
previews are bounded, explicitly report truncation and use inert text/Markdown. Repository-controlled
HTML, scripts, command protocols and remote embedded assets never execute or load.

## HTTP operations and jobs

All data endpoints require the per-launch bearer token. Exact Host and Origin checks guard the
selected loopback origin; absent Origin is accepted only with the bearer capability for CLI/tests.
No CORS, credentials in URLs, action GETs, or cross-origin fetches. Static assets carry a restrictive
content security policy, no-referrer policy and no cache of repository data. JSON errors have stable
codes and a human-readable reason. Oversized bodies and unsupported actions are refused.

| Operation | Contract |
| --- | --- |
| `GET /api/snapshot` | Capture/coalesce a fresh inspection; no command gates |
| `GET /api/freshness` | Read the current generation; no automatic mutation |
| `GET /api/source?path=…` | Read an allowed contained source; return text and source metadata |
| `POST /api/diagnostics` | Run the existing explain engines in a fresh worker and preserve findings/scope/skips/errors |
| `POST /api/preview` | `upgrade` or `archive`; use existing planners and report their coverage limits |
| `POST /api/check-plan` | Resolve default or a declared tier, current generation, pin compatibility, selected gates and the real command authority |
| `POST /api/jobs` | Start the stored check plan once, only if generation and compatibility still match |
| `GET /api/jobs/:id` | Structured progress, bounded output, full findings and terminal state |
| `POST /api/jobs/:id/cancel` | Request termination, report interruption and termination limits |
| `GET /api/export` | Explicit local download of the full captured snapshot, diagnostics, previews and retained jobs |

The check-plan display names the root, tier/default, command list and inherited environment/network
authority. The Run action executes it directly; unchanged plans do not need repeated confirmation.
Plans are short-lived, single-use and server-owned. No arbitrary argv/shell input from the browser.
Only one check job runs per server; unrelated processes are not locked. Reads continue during a job.

Worker execution shares the existing runner's gate selection, declared-engine evaluation and result
meaning. Command gates run their already-registered shell strings. Streaming command output is bounded;
overflow is explicit, never silently presented as full output. Complete structured findings remain
available up to an explicit result size bound; an exceeded result limit is an error, not success.
The existing local ledger schema is unchanged, including its disabled mode.

Cancel/shutdown stops the owned worker and requests its process tree: a process group on POSIX and
`taskkill /T` on Windows. Report delivery/failure, not a universal guarantee that detached descendants
or external side effects ended. Interrupted jobs never pass and there is no rollback. Shutdown closes
connections and terminates all outstanding read/check workers; credentials are not retained.

Recognize the generated launcher's exact pinned package version as data, never execute it to inspect
it. A pin mismatch or unrecognized launcher disables browser checks. No launcher means an explicitly
invoked unpinned CLI; show that choice and the executing version. For the rungs source repo, also show
its package version. An ejected launcher or `.rungs/` installation uses read-only inspection plus
retained-launcher handoff; `ui` is not added to `EJECTED_RETAINED`. Upgrade previews label gate/hook/
record phases unpreviewed; a module-file no-op is not a whole-upgrade no-op.

## Design and budgets

The interface is a repository workbench: a narrow navigation rail, repository identity at the top,
a dense main table and a resizable-by-layout evidence pane on wide screens; a full-width detail
dialog on narrow screens. Work links and source evidence occupy the prominent surface. An overview
with repeated score cards would make the same lookup require another navigation step, so it is not
the default. Gate execution is adjacent to its resolved plan and results.

Tokens: paper `#f5f7fa`, white `#ffffff`, ink `#22334b`, slate `#607086`, blue `#315cbd`, and teal
`#177765`. Status accents have text labels and are never the sole information. System humanist sans
(`Segoe UI`, `Trebuchet MS`, sans-serif) handles navigation/prose; the system monospace stack handles
only code, ids and paths. Sizes follow 12/14/16/20/28px with a 4px spacing base. Source text stays
within a readable measure; tables can use available width. Local assets, no fonts/CDNs and no
decorative motion. The distinctive cue is a small rung mark aligned with the active navigation row.

Initial test budgets (2026-09-13, to measure on the named test machine): packed compressed growth
under 300 KiB, normal help cold-start median regression under 100ms, local-server listen under 3s,
and 1,000-item / 5,000-finding fixture inspection under 5s. Browser filtering and detail navigation
should complete within 200ms on that fixture. The worker/resource bounds are 50,000 scanned files,
256 MiB hashed input, 8 MiB source/ledger text, 32 MiB structured result, 16 KiB request bodies and
256 KiB retained job output. Caps produce explicit limits. Latency budgets are fixture checks, not
universal promises about arbitrary filesystems or commands. Keyboard/focus, responsive usability
and maintenance-cost evaluation are review-only; structural/security contracts are tested.
