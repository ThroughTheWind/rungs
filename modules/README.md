# Modules

The product. Each directory here is one installable module, in the format set by
[ADR-0003](../docs/decisions/ADR-0003-module-definition-format.md); the set and its rungs are
specified in [module-catalog.md](../docs/design/module-catalog.md).

| Module | Rung | Status |
| --- | --- | --- |
| [`instructions`](instructions/) | 0 | **authored** — owns `AGENTS.md`, the bridge, `.ai/rules/` |
| [`gates`](gates/) | 1 | **authored** — owns the runner, registry and ledger |
| [`backlog`](backlog/) | 1 | **authored** — the format exemplar |
| *(12 more)* | 0–5 | specified in the catalog, not authored |

The three authored modules are the `tracked` profile's spine: `instructions` and `gates` own every
shared surface the others merge into, so authoring them first is what makes the rest additive.

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
8. **A fragment counts against the entry document's line budget.** Keep one under ~15 lines. The
   budget is shared, and a module that spends 40 lines of it is taking them from the repo's own
   content.
9. **Genuinely optional prose ships commented out, with the reason** — substitution-only templating
   has no other way to offer a choice, and a commented block is a decision the installer makes once
   in their editor. Claude Code strips HTML comments before injection, so an unaccepted block costs
   the agent nothing while staying visible to the human. `instructions`' communication-style block
   is the worked example.
