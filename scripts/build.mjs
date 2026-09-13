import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";

// The published CLI. Dependencies stay external: the package declares them and
// npm installs them beside it.
await build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: "dist/cli.js",
  sourcemap: true,
});

// The ejected runner. Everything is inlined — engines, the TOML and XML
// parsers, their transitive dependencies — because `rungs eject` copies this one
// file into a repository that has no `node_modules` and, by design, no Rungs.
// A runner with an import left to resolve is the failure F-042 recorded.
await build({
  entryPoints: ["src/ejected-runner.ts"],
  bundle: true,
  packages: "bundle",
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: "dist/ejected-runner.mjs",
  sourcemap: false,
  legalComments: "inline",
});

// Optional foreground interface: separate lazy server and fresh-process worker.
// Entries remain directly under dist so the shared module/version roots still resolve.
await build({
  entryPoints: { 'ui-server': 'src/ui/server.ts', 'ui-worker': 'src/ui/worker.ts' },
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outdir: 'dist',
});
mkdirSync('dist/ui-assets', { recursive: true });
copyFileSync('src/ui/assets/index.html', 'dist/ui-assets/index.html');
// Compiling the browser assets also makes a syntax error a build failure, not a blank consumer page.
await build({
  entryPoints: ['src/ui/assets/app.js', 'src/ui/assets/style.css'],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  outdir: 'dist/ui-assets',
  minify: true,
});
