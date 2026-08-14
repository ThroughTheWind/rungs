<!-- rungs:begin backlog@1.0.0 -->
## Ways of working — backlog & branches (MANDATORY)

All non-trivial work follows the delivery methodology in
[`docs/{{root}}/README.md`](docs/{{root}}/README.md): **propose (rationale) → decide → plan
(requirements + impacts) → execute + test → review**. Track it as a **work item**
(`{{id_prefix}}-###`) under [`docs/{{root}}/items/`](docs/{{root}}/items/); the board is
[`BACKLOG.md`](docs/{{root}}/BACKLOG.md).

- **Branch per item, off `{{integration_branch}}`:** `{{branch_prefix}}/{{id_prefix}}-###-slug`,
  with `chore/`, `docs/` and `spike/` variants. Merge back after review; delete the branch.
- **Claim an id from the `NEXT-ID` marker in `BACKLOG.md` and bump it on your own branch.**
- **Planning artifacts ride `{{integration_branch}}`** — only feature *code* needs a branch.
- **Don't scope-creep an item.** Capture follow-ups as **new** items.
- **Status must agree with git.** `rungs check` refuses a merged branch still sitting at a
  pre-review status, and refuses a document claiming it is blocked on work that has finished.
<!-- rungs:end backlog -->
