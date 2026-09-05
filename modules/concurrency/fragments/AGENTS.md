<!-- rungs:begin concurrency@1.4.0 -->
## Concurrent sessions

Many sessions share `{{integration_branch}}` and cannot see each other — see
[`docs/concurrent-sessions.md`](docs/concurrent-sessions.md). Cut with `node .ai/rungs.mjs session start`
(from the last **verified** merge, not the tip), run the fast tier constantly, and land with
`node .ai/rungs.mjs land` — **never `git merge` by hand**. Do not run the full tier before landing: it widens
the window the merge then conflicts in. Reconcile generated artifacts by **regenerating**, never
by merging text. Keep the integration and green refs out of every worktree while landing. A refused
land reports the exact recovery ref it preserved; Rungs never deletes that ref for you.
<!-- rungs:end concurrency -->
