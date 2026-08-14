// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { rehypeRungs } from "./src/plugins/rehype-rungs.mjs";

// The wiki reads docs/ from the repo root, one level above this package. Vite has to be told
// that directory is legal to serve in dev; the content layer itself reads via fs at build time.
const REPO_ROOT = new URL("../", import.meta.url).pathname;

export default defineConfig({
  site: "https://rungs.dev",
  output: "static",
  integrations: [react()],
  markdown: {
    // The mapping table from the design system's readme: plain markdown in, provenance
    // components out, with no author-side wrappers. src/plugins/rehype-rungs.mjs is the contract.
    rehypePlugins: [rehypeRungs],
    // Terminal transcripts are ink pits styled by tokens/base.css; Shiki would fight them.
    syntaxHighlight: false,
  },
  vite: {
    server: { fs: { allow: [REPO_ROOT] } },
  },
});
