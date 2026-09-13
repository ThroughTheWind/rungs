# Local interface delivered; workflow extensions await review

## Delivered

- [WI-100](../../docs/backlog/archive/WI-100-local-operator-interface.md) was accepted by the
  operator's instruction to execute it, specified in `a0957e3`, implemented in `fa23eb5` and
  corrected after browser review in `f48a76b`. Merge `f4105f4` landed it with status `done`.
- The foreground `rungs ui [path]` shipped in source and the packed candidate: install/work/gates/
  diagnostics, source links and local export, maintenance previews and explicit planned checks.
  The implementation branch was deleted after merge; `rungs backlog archive` moved the item and
  recomputed its citations. The earlier session note received only that mechanical link rewrite.
- Final platform run 34759042364 passed all six OS/Node cells plus the site. Repository gates
  passed before and after merge. The [verification record](../../docs/design/local-interface-verification-2026-09-13.md)
  held the exact commands, counts, cost measurements, browser tasks and limitations.

## Not delivered

- No accepted WI-100 requirement was left open. Browser authoring, automatic apply, agent
  dispatch, new registers and multi-repository management were outside its accepted scope.
- WI-101 remained proposed; F-056 remained open. A workflow pilot was not treated as delivery of
  explicit session-reference validation. External module roots and maintained Arena Lab adoption
  remained their existing separate work.
- No version was cut or published. The package version remained 0.5.0, with an unreleased
  changelog fragment; implementation acceptance did not authorize a release.
- Temporary walkthrough directories remained under the system temp directory because automatic
  approval review rejected their recursive cleanup with "blocked by policy". Their foreground
  servers were stopped and the browser tabs closed; repository test logs were removed.

## Decisions taken

- A small packaged client and lazily loaded server/worker bundles kept normal CLI startup free
  of UI imports and added no dependency or consumer service. The accepted interface contract
  owned the decisions; ADR admission criterion 4 did not hold, so no duplicate ADR was written.
- Repository files, the shared engines and planners stayed authoritative. Browser checks required
  a current displayed plan, and stale results retained their observed generation. Session prose
  remained authored evidence. These boundaries became an active constraint in the live handoff.
- Agent-driven fixture walkthroughs demonstrated navigation and failure handling, not independent
  adoption or faster human task completion. The package and latency budgets were measured locally.

## What turned out to be wrong

Browser review exposed nested finding arrays rendered as object names, ordered-list continuation
losing its numbering, focus lost after nested source navigation, and a narrow evidence dialog sized
with scrollbar-inclusive viewport units. The client corrected those cases and the walkthrough
verified them. Upgrade preview became a readable file table with the full planner object still
available. No evidence justified importing the documentation site's runtime into the CLI.

## Next at handoff

The next concrete action was to read WI-101's Decision and draft Plan before deciding its two
workflow pilots and register admission test. A release and Arena Lab adoption each still needed
their own authorization. Current work was to be read from item files and Git, not inferred from
this historical note.
