#!/usr/bin/env node
/**
 * Vendor the design-system export into the site's tracked source tree.
 *
 * `design_system/export/` is gitignored (regenerable tool output), so Railway and CI cannot build
 * from it. This copies what the site needs into `src/design-system/`, which IS tracked, and
 * records the provenance of every file it wrote.
 *
 * Two things it does beyond copying:
 *
 *   1. **Extracts each component's stylesheet into a real .css file.** The exported components
 *      inject their CSS at runtime from a JS template literal, which works for React but not for
 *      markdown that rehype renders to plain HTML with the same class names. Static CSS lets both
 *      paths share one stylesheet, and lets the wiki ship zero JS.
 *   2. **Replaces `tokens/fonts.css`** — the export's version @imports Google Fonts, which the
 *      governing prompt forbids (docs/design/web-design-system-prompt.md §8). Self-hosted
 *      Fontsource replaces it. This is the only content deviation and it is recorded in
 *      VENDORED.md rather than applied silently.
 *   3. **Derives the browser icons from `assets/logo.svg`.** The export ships the mark once, as
 *      `currentColor` geometry; `public/favicon.{svg,ico}` and the touch icon are rasterised from
 *      that same file at build-vendor time. Nobody hand-maintains a second copy of the logo, so
 *      the tab icon cannot drift from the mark in the nav.
 *
 * Fails loudly on anything unexpected. A half-vendored design system that builds is worse than
 * one that does not.
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRectSvg, encodePng, encodeIco, themedSvg } from "./lib/icons.mjs";

const SITE = dirname(dirname(fileURLToPath(import.meta.url)));
const EXPORT = join(SITE, "..", "design_system", "export");
const DEST = join(SITE, "src", "design-system");
const PUBLIC = join(SITE, "public");

/** Sizes in the .ico. 16 is the tab, 32 the bookmark bar, 48 the Windows shortcut. */
const ICO_SIZES = [16, 32, 48];
/** iOS home-screen icon. Padded to the brand's clear space (≥ one bottom bar, 6 of 32 units). */
const TOUCH_SIZE = 180;

const TOKENS = ["colors.css", "typography.css", "spacing.css", "base.css"];

/** Self-hosted replacement for the export's Google-CDN fonts.css. Families and weights match. */
const FONTS_CSS = `/* rungs — webfonts, self-hosted via Fontsource.
   DEVIATION from design_system/export/tokens/fonts.css, which @imports Google Fonts.
   Reason: docs/design/web-design-system-prompt.md §8 forbids a CDN dependency; the export's
   readme flags this file as the one to change. Families, weights and italics are unchanged. */
@import "@fontsource/barlow/400.css";
@import "@fontsource/barlow/500.css";
@import "@fontsource/barlow/600.css";
@import "@fontsource/barlow/700.css";
@import "@fontsource/barlow/400-italic.css";
@import "@fontsource/barlow-semi-condensed/500.css";
@import "@fontsource/barlow-semi-condensed/600.css";
@import "@fontsource-variable/source-serif-4/index.css";
@import "@fontsource-variable/source-serif-4/wght-italic.css";
@import "@fontsource/ibm-plex-mono/400.css";
@import "@fontsource/ibm-plex-mono/500.css";
@import "@fontsource/ibm-plex-mono/600.css";
@import "@fontsource/ibm-plex-mono/400-italic.css";
`;

function die(msg) {
  console.error(`vendor-design-system: ${msg}`);
  process.exit(1);
}

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);

/**
 * Pull the `const css = \`…\`;` block out of a component source.
 * Rejects interpolation — a template literal with `${}` cannot become static CSS, and silently
 * emitting it with the placeholder intact would produce invalid rules that still render.
 */
function extractCss(source, label) {
  const m = source.match(/const css = `([\s\S]*?)`;/);
  if (!m) die(`${label}: no \`const css = \`…\`\` block found. The export's shape changed.`);
  if (m[1].includes("${")) die(`${label}: stylesheet contains \${} interpolation; cannot be made static.`);
  return m[1].trim();
}

if (!existsSync(EXPORT)) {
  die(
    `no export at ${relative(SITE, EXPORT)}.\n` +
      `  The design-system export is gitignored — regenerate or restore it before building.\n` +
      `  The tracked copy in src/design-system/ is what the build uses; this step refreshes it.`,
  );
}

const manifest = JSON.parse(await readFile(join(EXPORT, "_ds_manifest.json"), "utf8"));
const components = manifest.components ?? [];
if (components.length !== 12) die(`manifest lists ${components.length} components, expected 12.`);

await rm(DEST, { recursive: true, force: true });
await mkdir(join(DEST, "tokens"), { recursive: true });
await mkdir(join(DEST, "components"), { recursive: true });

const wrote = [];
const record = async (rel, body) => {
  const path = join(DEST, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
  wrote.push({ file: rel, sha: sha(body) });
};

// --- tokens -------------------------------------------------------------------------------
for (const t of TOKENS) {
  await record(`tokens/${t}`, await readFile(join(EXPORT, "tokens", t), "utf8"));
}
await record("tokens/fonts.css", FONTS_CSS);

// --- components ---------------------------------------------------------------------------
const styles = [];
const exports_ = [];
for (const { name, sourcePath } of components) {
  const src = await readFile(join(EXPORT, sourcePath), "utf8");
  const group = sourcePath.split("/")[1];
  await record(`components/${group}/${name}.jsx`, src);

  const dts = sourcePath.replace(/\.jsx$/, ".d.ts");
  if (existsSync(join(EXPORT, dts))) {
    await record(`components/${group}/${name}.d.ts`, await readFile(join(EXPORT, dts), "utf8"));
  }

  styles.push(`/* ${name} — extracted from ${sourcePath} */\n${extractCss(src, name)}`);
  exports_.push(`export { ${name} } from "./${group}/${name}.jsx";`);
}

await record("components/components.css", `${styles.join("\n\n")}\n`);
await record(
  "components/index.js",
  `// Generated by scripts/vendor-design-system.mjs — do not edit.\n${exports_.sort().join("\n")}\n`,
);

// --- brand mark ------------------------------------------------------------------------------
// One geometry, three consumers: inline in the layout (currentColor, themes for free), the SVG
// favicon (colour pinned per scheme), and the rasterised .ico/touch icon (colour flattened onto
// paper, because an .ico cannot know what the browser chrome is doing).
const logoSvg = await readFile(join(EXPORT, "assets", "logo.svg"), "utf8");
await record("assets/logo.svg", logoSvg);

let mark;
try {
  mark = parseRectSvg(logoSvg, "assets/logo.svg");
} catch (err) {
  die(`${err.message}\n  The icon build renders rectangles only — see scripts/lib/icons.mjs.`);
}

/** Icon colours come from the export's own tokens, so a palette change reaches the tab icon. */
const colorsCss = await readFile(join(EXPORT, "tokens", "colors.css"), "utf8");
const [lightBlock, darkBlock = ""] = colorsCss.split(/\[data-theme=["']dark["']\]/);
const token = (css, name, where) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) die(`tokens/colors.css: no \`--${name}\` in the ${where} block; the icon build needs it.`);
  return m[1];
};
const ink = token(lightBlock, "ink", "light");
const paper = token(lightBlock, "paper", "light");
const inkDark = token(darkBlock, "ink", "dark");

await mkdir(PUBLIC, { recursive: true });
const icons = [];
const emit = async (name, body) => {
  await writeFile(join(PUBLIC, name), body);
  icons.push({ file: `public/${name}`, sha: sha(body), bytes: body.length });
};

await emit("favicon.svg", themedSvg(mark, { ink, inkDark }));
await emit(
  "favicon.ico",
  encodeIco(ICO_SIZES.map((size) => ({ size, png: encodePng(mark, size, { ink, ground: paper }) }))),
);
await emit(
  "apple-touch-icon.png",
  encodePng(mark, TOUCH_SIZE, { ink, ground: paper, inset: Math.round((TOUCH_SIZE * 6) / 44) }),
);

// --- entry --------------------------------------------------------------------------------
await record(
  "styles.css",
  `/* Generated by scripts/vendor-design-system.mjs — do not edit.\n` +
    `   Global entry: tokens, then the component stylesheets extracted from the export. */\n` +
    `@import "./tokens/fonts.css";\n@import "./tokens/colors.css";\n@import "./tokens/typography.css";\n` +
    `@import "./tokens/spacing.css";\n@import "./tokens/base.css";\n@import "./components/components.css";\n`,
);

// --- provenance ---------------------------------------------------------------------------
const today = process.env.VENDOR_DATE ?? new Date().toISOString().slice(0, 10);
await writeFile(
  join(DEST, "VENDORED.md"),
  `# src/design-system — vendored, generated

**Do not edit any file in this directory.** It is overwritten wholesale by
\`npm run vendor\` (\`site/scripts/vendor-design-system.mjs\`).

| | |
| --- | --- |
| Source | \`design_system/export/\` — **gitignored**, regenerable from the design tool |
| Namespace | \`${manifest.namespace}\` |
| Components | ${components.length} |
| Vendored | ${today} |

## Why this copy exists

\`design_system/export/\` is not tracked, so Railway and CI cannot build from it. This directory is
the tracked input to the build. Authored-vs-generated is visible from the path
([product-brief §5](../../../docs/design/product-brief.md)).

## Deviations from the export

| File | Deviation | Reason |
| --- | --- | --- |
| \`tokens/fonts.css\` | Rewritten — Google Fonts \`@import\` replaced with self-hosted Fontsource | [prompt §8](../../../docs/design/web-design-system-prompt.md) forbids a CDN dependency; the export's readme names this file as the one to change |
| \`components/components.css\` | Added — each component's runtime-injected stylesheet extracted to static CSS | Markdown rendered by rehype emits the same class names without mounting React; static CSS lets the wiki ship zero JS |
| \`components/index.js\` | Added — barrel | Convenience; no content change |

Nothing else is altered. Component sources and \`assets/logo.svg\` are byte-for-byte copies.

## Files

${wrote.map((w) => `- \`${w.file}\` · \`${w.sha}\``).join("\n")}

## Browser icons — generated, outside this directory

Rasterised from \`assets/logo.svg\` by the same run, into \`site/public/\`. They are **derived, not
authored**: edit the mark in the design system and re-run \`npm run vendor\`. Hand-editing one of
these puts the tab icon out of step with the mark in the nav, which is exactly what generating
them prevents.

| File | What it is |
| --- | --- |
| \`public/favicon.svg\` | The mark, ink pinned per \`prefers-color-scheme\` (a favicon inherits no \`currentColor\`) |
| \`public/favicon.ico\` | ${ICO_SIZES.join(" · ")}px PNG entries, ink on paper — an \`.ico\` cannot follow the theme, so it carries its ground |
| \`public/apple-touch-icon.png\` | ${TOUCH_SIZE}px, padded to the brand clear space (≥ one bottom bar) |

${icons.map((i) => `- \`${i.file}\` · \`${i.sha}\` · ${i.bytes} bytes`).join("\n")}
`,
);

console.log(
  `vendor-design-system: ${wrote.length} files → src/design-system/ (${components.length} components), ` +
    `${icons.length} icons → public/`,
);
