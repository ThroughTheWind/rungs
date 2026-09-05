<!-- rungs:begin concurrency@1.3.0 -->
## Concurrent sessions

Many sessions share `{{integration_branch}}` and cannot see each other — see
[`docs/concurrent-sessions.md`](docs/concurrent-sessions.md). Cut with `node .ai/rungs.mjs session start`
(from the last **verified** merge, not the tip), run the fast tier constantly, and land with
`node .ai/rungs.mjs land` — **never `git merge` by hand**. Do not run the full tier before landing: it widens
the window the merge then conflicts in. Reconcile generated artifacts by **regenerating**, never
by merging text.
<!-- rungs:end concurrency -->
