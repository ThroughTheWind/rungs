# Operator proposals and the next scope decision

## Delivered

Prepared [the local interface assessment](../../docs/design/local-operator-interface-2026-09-13.md),
[WI-100](../../docs/backlog/items/WI-100-local-operator-interface.md) and
[WI-101](../../docs/backlog/items/WI-101-operator-workflow-extensions.md) on
`docs/WI-100-operator-interface-proposals`. Both items were proposed with complete draft plans,
acceptance criteria and exclusions. Claimed WI-100/101 and advanced NEXT-ID to WI-102. No proposal
was merged, published or treated as an implemented capability during preparation.

Fetched origin before assessing product code. Local baseline `7d1840452cba4ea7733c70dc40caf0a9abe16711`
was two commits ahead and zero behind `origin/main` at
`d21e3f5fd10b3da75d127843c718c0d154a5afab`, with no product-source differences in the inspected
CLI/module/test/build/dependency paths. The registry reported latest 0.5.0. The assessment records
the commands and their limits; a later implementation must verify its own baseline.

## Not delivered

No interface, new register, pilot or runtime change was implemented: the request was evaluation,
scope and work-item creation. No repository was upgraded, and Arena Lab's maintained pin was not
touched. The published 0.5.0 release and completed remediation were treated as the current product
baseline, not reopened work.

## Decisions taken

Separated the local interface from the subsequent workflow-extension spike. Recommended a
foreground single-repo CLI inspector, a shared source/result contract and an explicit bounded
check action. Browser authoring and broader orchestration were excluded from that proposed scope.

Limited the subsequent proposal to two contract pilots, with evidence and maintenance criteria for
other register candidates. F-056 remained open; rendering canonical work items in WI-100 would not
itself repair stale explicit session references. These recommendations were not promoted to active
constraints or accepted product decisions. The next session was directed to review WI-100's
Decision and draft Plan before starting implementation.

## What turned out to be wrong

The previous handoff's description of remote lag was obsolete. Fetch and source comparison showed
only two local release-recording commits ahead, rather than outstanding product-code landings.

Draft review caught two ways a UI could overstate existing APIs: upgrade's emitted-file plan does
not preview separate record/gate/hook updates, and valid runner configurations need not declare
tiers. The scope was corrected to label partial previews and support default no-tier checks.
The routing pilot was also corrected to derive supported tier handoffs: a registered gate id is
not an executable `check` tier, and a declared gate need not contain its own command.
