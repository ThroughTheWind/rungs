import { build } from "esbuild";

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
