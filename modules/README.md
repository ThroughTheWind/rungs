# Modules

The product. Each directory here is one installable module, in the format set by
[ADR-0003](../docs/decisions/ADR-0003-module-definition-format.md); the set and its rungs are
specified in [module-catalog.md](../docs/design/module-catalog.md).

| Module | Rung | Status |
| --- | --- | --- |
| [`backlog`](backlog/) | 1 | **authored** — the format exemplar |
| `instructions` | 0 | next |
| `gates` | 1 | next |
| *(12 more)* | 0–5 | specified, not authored |

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

## Authoring rules

1. **Substitution only, no logic.** A module that needs a conditional is two modules, or a variant.
2. **Not everything is a parameter.** If a value cannot substitute cleanly into prose, a table
   *and* a gate, it is the module's opinion — ship it and let a repo diverge. `backlog`'s
   eight-status lifecycle is the worked example.
3. **`[provenance]` is required and validated.** Sources, patterns, and the incident. A module with
   no traceable source is one somebody invented, and `doctor` cannot ask its questions without the
   incident ([ADR-0005](../docs/decisions/ADR-0005-self-instrumentation.md)).
4. **Skills stay spec-pure.** Six Agent Skills fields; Claude Code extensions are opted into in
   `module.toml`, per skill, with the portability cost stated there.
5. **Every gate declares a self-test asserting both directions.** A gate whose rules are currently
   satisfied is indistinguishable from a gate that matches nothing.
6. **`[detect]` must correctly classify all four source repos.** That is the Phase 6 acceptance
   criterion, and it is why detection is biased toward false negatives.
