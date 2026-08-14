# site — the rungs web surfaces

Static Astro. Three surfaces on one design system: the landing page, the wiki, and contribute.

> **Authoritative for:** how the site is built and deployed.
> **Not authoritative for:** the design system (that is `design_system/export/`, summarised in
> [`docs/design/web-design-system-prompt.md`](../docs/design/web-design-system-prompt.md)), or any
> content in `docs/` — the wiki renders those files, it does not own them.

## The two things worth knowing before editing

**1. The wiki is the repo's markdown, read in place.** `src/content.config.ts` points a glob
loader at the repo root. There is no copy and no sync step, because a second copy of the corpus
is a second thing to go stale. A document added to `docs/` appears in the wiki on the next build;
one that is deleted stops appearing. The registry at `/wiki/` is derived the same way.

All of `docs/**` is published. Files at the repo root are published only if they are listed in
`ROOT_DOCS` in [`src/lib/routes.mjs`](src/lib/routes.mjs) — an explicit list, not a glob, so that
publishing a root file is a decision visible in one line of a diff. Two entries today:

| File | Route | Shelf |
| --- | --- | --- |
| `README.md` | `/wiki/overview/` | Overview |
| `CLAUDE.md` | `/wiki/agent-policy/` | Working rules |

`AGENTS.md` is deliberately **not** published: in this repo it is the bridge and `CLAUDE.md` is
the canonical policy, so publishing it would put a routing stub on the wiki. Note that this
inverts the output contract rungs ships for scaffolded repos, where `AGENTS.md` is canonical and
`CLAUDE.md` is the one-line bridge.

The slug is `agent-policy` rather than `claude` because ADR-0001 is about not binding this
project's surfaces to one vendor's filename.

`routes.mjs` is the single definition of which file becomes which route, imported by both the
collection and the markdown pipeline. They derived it independently at first and disagreed on the
first build, which is what `check:links` now catches. `src/lib/source-map.mjs` inverts it at build
time so each page can state its real source path — slugs are lowercased, so reconstructing
`docs/decisions/ADR-0006-the-name.md` from its slug would resolve on Windows and 404 on Linux.
It also fails the build if two files claim one route.

**2. `src/design-system/` is generated. Do not edit it.** The design-system export at
`design_system/export/` is **gitignored**, so Railway and CI cannot build from it — `npm run
vendor` copies what the site needs into `src/design-system/`, which is tracked, and writes
`src/design-system/VENDORED.md` recording the provenance and the one deliberate deviation
(self-hosted fonts in place of the export's Google CDN import).

So: **`npm run vendor` is a local, occasional step, not part of the build.** `npm run build` uses
the tracked copy. Run `vendor` when the design system is re-exported, then commit the result.

## Commands

```bash
npm install && npm run dev
```

| Command | Does |
| --- | --- |
| `npm run vendor` | Re-copy the design system from `../design_system/export` into `src/design-system/`. Fails loudly if the export is missing or has changed shape |
| `npm run dev` | Astro dev server |
| `npm run build` | Static build to `dist/`. Does **not** vendor |
| `npm run preview` | Serve the built output locally |
| `npm start` | Production static server (`sirv`) — what Railway runs |
| `npm run check` | `astro check` + the link gate |
| `npm run check:links` | Every internal link resolves to a real route and anchor. Run after `build` |

## The markdown pipeline

[`src/plugins/rehype-rungs.mjs`](src/plugins/rehype-rungs.mjs) implements the design system's
markdown → component mapping: plain markdown in, provenance components out, no author-side
wrappers. It emits the same class names the React components emit, and the stylesheet extracted
from those components at vendor time styles both — which is what lets the wiki ship **zero
JavaScript**.

Its `RULES` export is the honest inventory of what runs and what does not, and the `/contribute`
page reads that export rather than restating it, so the page cannot advertise a rule the build
does not run. **Nine of eleven rules run today**; `measurement` and `title-block` are declared
`not implemented` and render as such.

## Deploying to Railway

Config lives in [`railway.json`](../railway.json) **at the repo root**, and the service must build
from the repo root — do *not* set Root Directory to `site`.

That is not a style preference. The wiki reads `../docs`, `../README.md` and `../CLAUDE.md`, all
of which sit outside this package; a build context narrowed to `site/` cannot see them and the
build fails. Building from the root and targeting the package with `--prefix site` was verified
against a pristine `git archive HEAD` checkout on 2026-08-15.

```jsonc
"buildCommand": "npm --prefix site ci --include=dev && npm --prefix site run build"
"startCommand": "npm --prefix site start"
```

**`--include=dev` is load-bearing.** `astro` is a devDependency and `sirv-cli` is the only runtime
dependency, so under `NODE_ENV=production` a plain `npm ci` installs 13 packages instead of 414
and the build dies on a missing `astro`. Measured on 2026-08-15 in a clean checkout.

`sirv` binds `0.0.0.0:$PORT`, which Railway provides. Nothing here needs a database, a runtime
secret, or a server. If the Phase 7 template registry later becomes a service, it belongs beside
this one, not inside it.

## Known gaps

| Gap | Why it is open |
| --- | --- |
| `measurement` and `title-block` mapping rules | Both need a prose regex with a false-positive budget; a rule that mis-fires on real sentences is worse than one that does not run |
| Console fences render the loud undated caption | Markdown fences carry no capture date. Fix is a remark plugin carrying fence meta (` ```console date=2026-08-14 `) into hast |
| Module and profile lists on the landing page are hand-listed | Should be derived from `modules/*/module.toml`. Marked `generate-derivable` in `src/pages/index.astro` |
| Site status numbers are typed | `src/site.config.ts` centralises them with an `asOf` date. Should come from `npx @rungs/cli check --json` |
| `overflow-wrap` is fixed at the page, not in the system | The corpus contains unbreakable tokens (`proposed→accepted/rejected/…→done`, pattern-catalog §B) that overflow a stacked table cell by 138px at 375px. Patched in `[...slug].astro`; it belongs in the export's `tokens/base.css`, so it needs to go back to the design system rather than live here |
| Only one build gate | `check:links` runs. The next one is "no rendered number without a date" — the site states that rule and does not yet check it |
| Responses are not compressed | `sirv`'s `--gzip/--brotli` only serve precompressed files, and Astro emits none, so the flags are currently no-ops. On a corpus this text-heavy that is the cheapest remaining win — precompress in the build step, or terminate compression at the edge |
