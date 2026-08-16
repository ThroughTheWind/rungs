# Modules

The product. Each directory here is one installable module, in the format set by
[ADR-0003](../docs/decisions/ADR-0003-module-definition-format.md); the set and its rungs are
specified in [module-catalog.md](../docs/design/module-catalog.md).

| Module | Rung | Status |
| --- | --- | --- |
| [`instructions`](instructions/) | 0 | **authored** — owns `AGENTS.md`, the bridge, `.ai/rules/` |
| [`gates`](gates/) | 1 | **authored** — owns the runner, registry and ledger |
| [`backlog`](backlog/) | 1 | **authored** — the format exemplar |
| [`findings`](findings/) | 1 | **authored** — completes `audit → findings → backlog` |
| [`adr`](adr/) | 1 | **authored** |
| [`session`](session/) | 1 | **authored** |
| [`ci`](ci/) | 1 | **authored** |
| [`specs`](specs/) | 2 | **authored** |
| [`workflows`](workflows/) | 2 | **authored** |
| [`skills`](skills/) | 2 | **authored** |
| [`audit`](audit/) | 2 | **authored** |
| [`release`](release/) | 3 | **authored** |
| [`design-sync`](design-sync/) | 3 | **authored** |
| [`doc-authority`](doc-authority/) | 4 | **authored** |
| [`concurrency`](concurrency/) | 5 | **authored** |

**All fifteen are authored.** Installing every one assembles an entry document of **129 of the
200-line budget**, leaving 71 for the repo's own conventions — and no repo should install all
fifteen, since rung 3+ modules are for specific problems.

Per profile, measured 2026-08-15 by installing each into an empty directory and counting
`AGENTS.md` the way `instructions-core-size` does (frontmatter, HTML comments and blank lines
dropped — that is what the harness loads, not what `wc -l` reports):

| Profile | Modules | Loaded lines | Left of 200 |
| --- | --- | --- | --- |
| `minimal` | 1 | 64 | 136 |
| `tracked` | 6 | 82 | 118 |
| `disciplined` | 11 | 106 | 94 |
| `hardened` | 13 | 117 | 83 |
| `fleet` | 15 | 129 | 71 |

These move whenever a fragment is edited, and they read as current only because of the date on
them. `rungs check` is what actually holds the budget; the table is for authors deciding whether a
fragment has room to grow.

`concurrency` carries a **threshold** in its manifest (`minimum = 5` concurrent sessions,
`confirm = true`): `add` states it and requires explicit confirmation. Selling rung 5 to a rung-1
repo is the most likely way this tool does harm.

## Anatomy

**A module is a directory that looks like what it emits.** Disposition is decided by which
subdirectory a file is in — there is no per-file configuration:

| Directory | Disposition |
| --- | --- |
| `files/` | **create** — written into the repo, with `{{param}}` substituted in contents *and paths* |
| `rules/` | **render** — path-scoped rule sources, emitted per harness ([ADR-0001](../docs/decisions/ADR-0001-multi-harness-rendering.md)) |
| `skills/` | **copy** — spec-pure `SKILL.md`, byte-for-byte after substitution |
| `fragments/` | **merge** — managed blocks inside a file another module owns |
| `gates/` | **declare** — engine tables; **no script is written into the repo** |
| `module.toml` | the manifest: identity · rung · deps · params · gates · detection · provenance |

**Hooks are not a sixth disposition.** A hook is a gate with a lifecycle trigger instead of a
runner trigger — `trigger = "pre-tool-use"` plus a `matcher` in the `[[gates]]` entry. It is
emitted into harnesses that support it and reported as degraded for those that do not, exactly like
any other render target. A useful consequence: the ledger covers hooks too, so a repo can find out
whether its guard has ever actually fired.

## Authoring rules

1. **Substitution only, no logic.** A module that needs a conditional is two modules, or a variant.
1b. **`${{ … }}` is never substituted.** A `$` immediately before `{{` marks a passthrough, because
   GitHub Actions expressions (`${{ github.ref }}`) share the delimiter. Without this rule the CI
   module's own workflow file is silently corrupted at install — the kind of collision that
   produces a broken file rather than an error.
1c. **A behavioural parameter reaches file content through a managed block**, never a conditional.
   `ci.trigger` regenerates the `ci-triggers` block inside the workflow rather than branching the
   template. This is the general escape when substitution alone is not enough.
2. **Not everything is a parameter.** If a value cannot substitute cleanly into prose, a table
   *and* a gate, it is the module's opinion — ship it and let a repo diverge. `backlog`'s
   eight-status lifecycle is the worked example.
2b. **Two kinds of parameter, and only one is substituted.** A *substitution* parameter appears as
   `{{name}}` in templates. A *behavioural* one changes what the CLI does and is marked
   `consumed_by = "render"` — `instructions.harnesses` decides which harnesses exist and will never
   appear in a template. A dead-parameter lint that does not know the difference reports the second
   kind as unused, and the obvious "fix" deletes it.
3. **`[provenance]` is required and validated.** Sources, patterns, and the incident. A module with
   no traceable source is one somebody invented, and `doctor` cannot ask its questions without the
   incident ([ADR-0005](../docs/decisions/ADR-0005-self-instrumentation.md)).
4. **Skills stay spec-pure.** Six Agent Skills fields; Claude Code extensions are opted into in
   `module.toml`, per skill, with the portability cost stated there.
5. **Every gate declares a self-test asserting both directions.** A gate whose rules are currently
   satisfied is indistinguishable from a gate that matches nothing.
5b. **Every gate declares its `applicability`**, next to its `engine`, and there is no default:

   | Value | Means | Runs on a repo that is not ours? |
   | --- | --- | --- |
   | `repo-content` | Measures the repo's own content — a count, a length, whether a link resolves | **Yes** |
   | `our-artifacts` | Checks something rungs wrote, which cannot exist unless we installed | No |
   | `our-schema` | Reads their file against a shape we defined | No |

   `doctor --explain` runs only `repo-content` against a repo that has its own equivalent of a
   module. Omitting the field does not mean "safe": the gate is skipped **and named**, and
   `rungs modules` refuses the manifest. This exists because the first version of `--explain`
   decided it centrally by engine name, and produced 71 findings that were true about our
   conventions and meaningless about the repos they landed on.
6. **`[detect]` must correctly classify all four source repos.** That is the Phase 6 acceptance
   criterion, and it is why detection is biased toward false negatives.
7. **A managed-block marker uses the target file's comment syntax** — `<!-- rungs:begin x -->` in
   markdown, `# rungs:begin x` in TOML and `.gitignore`. Found by writing an HTML comment into a
   TOML registry, where it is a syntax error rather than a marker.
8. **A fragment is a routing stanza, not a summary — 4 to 8 lines.** The budget is shared, and it
   is the binding constraint at profile scale, not per module. Measured while authoring the
   `disciplined` profile: a 73-line skeleton plus ten fragments at ~12 lines each is 193 of the
   200-line budget with nothing left for the repo's own conventions or repo map. Rewritten as
   routing stanzas the same profile assembled to **134**, leaving 66 for the repo. *(Those two are
   the authoring-time figures, kept because the 193 → 134 delta is the argument. `disciplined`
   measures **106** as of 2026-08-15 — see the table above — so read them as a before/after, not as
   current.)* A fragment says *what exists, where it lives, and which skill runs it*; the reasoning
   goes in the module's authority document, and the surface-specific rules go in `.ai/rules/`.
8b. **Not every module needs a fragment.** `ci` has none — nothing about it changes what an agent
   should do, and the `gates` fragment already names `rungs check`. A fragment that restates a
   neighbour's is spending shared budget on a duplicate.
9b. **A parameter may reference a declared dependency's parameters** as `{{<module>.<param>}}` —
   `findings` places its register at `docs/{{backlog.root}}/FINDINGS.md` so it lands next to the
   backlog it feeds. Only declared dependencies; anything else is an undeclared coupling.
9b-i. **`repo` is a reserved namespace, not a module**, and is therefore exempt from the rule above:
   there is no dependency to declare, because every module already sits in a repository. One key
   today — `{{repo.dirname}}`, the target directory's name, which is how `instructions` names the
   entry document. A module may read it; nothing may define a module called `repo`. Added by
   WI-001, where the same inference existed as a comment beside a `""` default, was implemented
   nowhere, and shipped a dangling `# AGENTS.md — ` into every scaffold. **A default that states
   its own derivation is checkable; a comment that states it is not.**
9c. **A path parameter may contain separators**, so one parameter places a whole subtree —
   `files/{{path}}/README.md` with `path = "docs/decisions"`. A second "leaf" parameter is never
   needed, and adding one was caught and reverted during authoring.
9d. **A parameter whose value means "do nothing" is the absence of the module.** `session` was
   specified with `mode = file | board`, where `board` created no files at all. That is not a
   mode; it is not installing `session`. Dropped.
9e. **Audit parameters across modules, not within one.** `adr` declared `id_width` that nothing
   consumed — a knob wired to nothing, invisible until every module was compared at once.
9f. **A parameter never holds a value decided at runtime.** `release` first declared
   `candidate_branch = "candidate/{{version}}"`, referencing a version that does not exist at
   install time. It is a **prefix**; the version is chosen when a release is cut. A parameter
   holding a runtime value is stale before it is ever used.
9g. **A module may declare a `[threshold]`** with `confirm = true`, which makes `add` state the
   cost and require explicit acknowledgement. Only `concurrency` uses it, and it exists because
   the maturity ladder is advice until something enforces it.

10. **Genuinely optional prose ships commented out, with the reason** — substitution-only templating
   has no other way to offer a choice, and a commented block is a decision the installer makes once
   in their editor. Claude Code strips HTML comments before injection, so an unaccepted block costs
   the agent nothing while staying visible to the human. `instructions`' communication-style block
   is the worked example.
