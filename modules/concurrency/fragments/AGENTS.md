<!-- rungs:begin concurrency@1.0.0 -->
## Concurrent sessions

Many sessions share `{{integration_branch}}` and cannot see each other — see
[`docs/concurrent-sessions.md`](docs/concurrent-sessions.md). Cut with `rungs session start`
(from the last **verified** merge, not the tip), run the fast tier constantly, and land with
`rungs land` — **never `git merge` by hand**. Do not run the full tier before landing: it widens
the window the merge then conflicts in. Reconcile generated artifacts by **regenerating**, never
by merging text.
<!-- rungs:end concurrency -->
