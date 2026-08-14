# site — the rungs web surfaces

Static Astro. Three surfaces on one design system: the landing page, the wiki, and contribute.

> **Authoritative for:** how the site is built and deployed.
> **Not authoritative for:** the design system (that is `design_system/export/`, summarised in
> [`docs/design/web-design-system-prompt.md`](../docs/design/web-design-system-prompt.md)), or any
> content in `docs/` — the wiki renders those files, it does not own them.

## The two things worth knowing before editing

**1. The wiki is `docs/`, read in place.** `src/content.config.ts` points a glob loader at
`../docs`. There is no copy and no sync step, because a second copy of the corpus is a second
thing to go stale. A document added to `docs/` appears in the wiki on the next build; one that is
deleted stops appearing. The registry at `/wiki/` is derived the same way.

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

The service builds from this subdirectory, so set **Root Directory = `site`** in the service
settings — `railway.json` cannot set it. Everything else is in that file: Nixpacks, `npm run
build`, `npm start`. `sirv` binds `0.0.0.0:$PORT`, which Railway provides.

Nothing here needs a database, a runtime secret, or a server. If the Phase 7 template registry
later becomes a service, it belongs beside this one, not inside it.

## Known gaps

| Gap | Why it is open |
| --- | --- |
| `measurement` and `title-block` mapping rules | Both need a prose regex with a false-positive budget; a rule that mis-fires on real sentences is worse than one that does not run |
| Console fences render the loud undated caption | Markdown fences carry no capture date. Fix is a remark plugin carrying fence meta (` ```console date=2026-08-14 `) into hast |
| Module and profile lists on the landing page are hand-listed | Should be derived from `modules/*/module.toml`. Marked `generate-derivable` in `src/pages/index.astro` |
| Site status numbers are typed | `src/site.config.ts` centralises them with an `asOf` date. Should come from `npx @rungs/cli check --json` |
| `overflow-wrap` is fixed at the page, not in the system | The corpus contains unbreakable tokens (`proposed→accepted/rejected/…→done`, pattern-catalog §B) that overflow a stacked table cell by 138px at 375px. Patched in `[...slug].astro`; it belongs in the export's `tokens/base.css`, so it needs to go back to the design system rather than live here |
| Only one build gate | `check:links` runs. The next one is "no rendered number without a date" — the site states that rule and does not yet check it |
