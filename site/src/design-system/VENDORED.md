# src/design-system — vendored, generated

**Do not edit any file in this directory.** It is overwritten wholesale by
`npm run vendor` (`site/scripts/vendor-design-system.mjs`).

| | |
| --- | --- |
| Source | `design_system/export/` — **gitignored**, regenerable from the design tool |
| Namespace | `RungsDesignSystem_68a248` |
| Components | 12 |
| Vendored | 2026-08-15 |

## Why this copy exists

`design_system/export/` is not tracked, so Railway and CI cannot build from it. This directory is
the tracked input to the build. Authored-vs-generated is visible from the path
([product-brief §5](../../../docs/design/product-brief.md)).

## Deviations from the export

| File | Deviation | Reason |
| --- | --- | --- |
| `tokens/fonts.css` | Rewritten — Google Fonts `@import` replaced with self-hosted Fontsource | [prompt §8](../../../docs/design/web-design-system-prompt.md) forbids a CDN dependency; the export's readme names this file as the one to change |
| `components/components.css` | Added — each component's runtime-injected stylesheet extracted to static CSS | Markdown rendered by rehype emits the same class names without mounting React; static CSS lets the wiki ship zero JS |
| `components/index.js` | Added — barrel | Convenience; no content change |

Nothing else is altered. Component sources and `assets/logo.svg` are byte-for-byte copies.

## Files

- `tokens/colors.css` · `3004ba43ccd0`
- `tokens/typography.css` · `1f07e0260cd5`
- `tokens/spacing.css` · `f26b7e1d086d`
- `tokens/base.css` · `5e7e2f27f0c1`
- `tokens/fonts.css` · `5484ba1d8508`
- `components/catalog/ModuleCard.jsx` · `a9852189aca2`
- `components/catalog/ModuleCard.d.ts` · `25eb5796151b`
- `components/catalog/PatternTable.jsx` · `7d1ef1ffc9a5`
- `components/catalog/PatternTable.d.ts` · `e0021e3e0b9a`
- `components/core/Button.jsx` · `0f70cf7d1f82`
- `components/core/Button.d.ts` · `653bb68cc52a`
- `components/core/Callout.jsx` · `c7c3bf9538d6`
- `components/core/Callout.d.ts` · `95e9eea02b66`
- `components/core/Console.jsx` · `a88e0ac0c8eb`
- `components/core/Console.d.ts` · `703ccb58f7e1`
- `components/core/TitleBlock.jsx` · `17f92703c95d`
- `components/core/TitleBlock.d.ts` · `01db179ff6aa`
- `components/provenance/ADRChip.jsx` · `aa1932194b40`
- `components/provenance/ADRChip.d.ts` · `03b8f20d321f`
- `components/provenance/Claim.jsx` · `f3df45fa552d`
- `components/provenance/Claim.d.ts` · `8960ecd3d6fb`
- `components/provenance/EnforcementTag.jsx` · `8d333d259d5b`
- `components/provenance/EnforcementTag.d.ts` · `798d894299a9`
- `components/provenance/Measurement.jsx` · `825eb692fa75`
- `components/provenance/Measurement.d.ts` · `98e7024c4557`
- `components/provenance/RungBadge.jsx` · `e364b5bd2a00`
- `components/provenance/RungBadge.d.ts` · `63ec89c66058`
- `components/provenance/SourceMark.jsx` · `cdb8123162a4`
- `components/provenance/SourceMark.d.ts` · `5e2d00278d42`
- `components/components.css` · `f76039118daf`
- `components/index.js` · `0e906f6e1d9d`
- `assets/logo.svg` · `e9e4665c1551`
- `styles.css` · `83aeeb35cf18`

## Browser icons — generated, outside this directory

Rasterised from `assets/logo.svg` by the same run, into `site/public/`. They are **derived, not
authored**: edit the mark in the design system and re-run `npm run vendor`. Hand-editing one of
these puts the tab icon out of step with the mark in the nav, which is exactly what generating
them prevents.

| File | What it is |
| --- | --- |
| `public/favicon.svg` | The mark, ink pinned per `prefers-color-scheme` (a favicon inherits no `currentColor`) |
| `public/favicon.ico` | 16 · 32 · 48px PNG entries, ink on paper — an `.ico` cannot follow the theme, so it carries its ground |
| `public/apple-touch-icon.png` | 180px, padded to the brand clear space (≥ one bottom bar) |

- `public/favicon.svg` · `1d906b3f0f4d` · 361 bytes
- `public/favicon.ico` · `32b34a15c752` · 434 bytes
- `public/apple-touch-icon.png` · `d78242352fe7` · 519 bytes
