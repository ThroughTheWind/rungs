**Authoritative for:** what a module parameter is, and how to set one.
**Not authoritative for:** which parameters exist or what they default to — that is each module's
`module.toml`, rendered on demand by `rungs modules --params`. This page names none of them on
purpose.

# Module parameters

A module is a directory that looks like what it emits ([ADR-0003](../decisions/ADR-0003-module-definition-format.md)).
A **parameter** is the small number of things about that directory a repo is allowed to decide:
where the backlog lives, what an id is prefixed with, which branch is the stable line.

## Where the list is

```bash
npx @rungs/cli modules --params
```

That reads the manifests and prints every parameter, its default, its allowed values where it has
them, and what it is for.

**This page does not repeat that list, and no file in this repository does.** A committed table
would be correct on the day it was written and silently wrong on the day a default moved — which is
the failure the [evidence rule](../../CLAUDE.md) exists to prevent, and one this project has already
paid for once in [ADR-0006](../decisions/ADR-0006-the-name.md). The manifests declare; the command
renders; this page explains.

## Setting one

At install, on `add` or `init`. Both spellings work:

```bash
npx @rungs/cli init . tracked --set backlog.root=work
npx @rungs/cli add findings --set=findings.id_prefix=DF
```

Repeat the flag for more than one. A malformed key is refused rather than skipped — an override you
asked for and did not get is worse than an error, because the install still looks like it worked.

**Set them at install time.** A parameter is substituted into content when a file is written; the
values recorded in `.ai/rungs.toml` afterwards are a record of what was used, not a control panel.
Editing one there does not rewrite a file that already exists — `rungs render` re-emits path-scoped
rules from `.ai/rules/`, and `rungs upgrade --apply` replaces module files you have not edited, but
neither re-substitutes parameters.

## Two kinds, and only one is substituted

Most parameters appear as `{{name}}` in a template and are replaced when the file is written.

A few are **behavioural**: they change what the CLI does rather than what a file says, and so never
appear as a token anywhere. `rungs modules --params` marks these, because a reader who goes looking
for the token and does not find it will reasonably conclude the parameter is dead — and the obvious
"fix" is to delete the parameter that decides which harnesses exist.

## What a parameter is not

- **Not a feature switch.** A value meaning "do nothing" is the absence of the module, not a mode
  ([`modules/README.md`](../../modules/README.md) rule 9d).
- **Not a runtime value.** A parameter never holds something decided when a command runs, such as a
  version being released (rule 9f).
- **Not free.** Anything that cannot substitute cleanly into prose, a table *and* a gate is the
  module's opinion. Modules ship their opinions and let a repo diverge (rule 2).

## Referring to another module's parameter

A default may reference a **declared dependency's** parameter as `{{module.param}}`, one level deep
— that is how the findings register lands beside the backlog it feeds. Referencing a module you have
not declared is an undeclared coupling and is refused.

`repo` is the one reserved namespace: `{{repo.dirname}}` is the target directory's name, and it is
exempt because there is no dependency to declare — every module already sits in a repository. Rules
9b and 9b-i in [`modules/README.md`](../../modules/README.md) own this.
