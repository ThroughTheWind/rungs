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
| `release` · `design-sync` | 3 | not authored |
| `doc-authority` | 4 | not authored |
| `concurrency` | 5 | not authored |

**The `disciplined` profile is complete** — eleven of fifteen modules, every rung 0, 1 and 2. Its
assembled entry document is **134 of the 200-line budget**, leaving 66 for the repo's own content.
The four remaining are rung 3+ and are opt-in for repos with those specific problems.

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
6. **`[detect]` must correctly classify all four source repos.** That is the Phase 6 acceptance
   criterion, and it is why detection is biased toward false negatives.
7. **A managed-block marker uses the target file's comment syntax** — `<!-- rungs:begin x -->` in
   markdown, `# rungs:begin x` in TOML and `.gitignore`. Found by writing an HTML comment into a
   TOML registry, where it is a syntax error rather than a marker.
8. **A fragment is a routing stanza, not a summary — 4 to 8 lines.** The budget is shared, and it
   is the binding constraint at profile scale, not per module. Measured while authoring the
   `disciplined` profile: a 73-line skeleton plus ten fragments at ~12 lines each is 193 of the
   200-line budget with nothing left for the repo's own conventions or repo map. Rewritten as
   routing stanzas the same profile assembles to **134**, leaving 66 for the repo. A fragment says
   *what exists, where it lives, and which skill runs it*; the reasoning goes in the module's
   authority document, and the surface-specific rules go in `.ai/rules/`.
8b. **Not every module needs a fragment.** `ci` has none — nothing about it changes what an agent
   should do, and the `gates` fragment already names `rungs check`. A fragment that restates a
   neighbour's is spending shared budget on a duplicate.
9b. **A parameter may reference a declared dependency's parameters** as `{{<module>.<param>}}` —
   `findings` places its register at `docs/{{backlog.root}}/FINDINGS.md` so it lands next to the
   backlog it feeds. Only declared dependencies; anything else is an undeclared coupling.
9c. **A path parameter may contain separators**, so one parameter places a whole subtree —
   `files/{{path}}/README.md` with `path = "docs/decisions"`. A second "leaf" parameter is never
   needed, and adding one was caught and reverted during authoring.
9d. **A parameter whose value means "do nothing" is the absence of the module.** `session` was
   specified with `mode = file | board`, where `board` created no files at all. That is not a
   mode; it is not installing `session`. Dropped.
9e. **Audit parameters across modules, not within one.** `adr` declared `id_width` that nothing
   consumed — a knob wired to nothing, invisible until every module was compared at once.

10. **Genuinely optional prose ships commented out, with the reason** — substitution-only templating
   has no other way to offer a choice, and a commented block is a decision the installer makes once
   in their editor. Claude Code strips HTML comments before injection, so an unaccepted block costs
   the agent nothing while staying visible to the human. `instructions`' communication-style block
   is the worked example.
