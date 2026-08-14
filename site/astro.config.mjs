// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { rehypeRungs } from "./src/plugins/rehype-rungs.mjs";

// The wiki reads docs/ from the repo root, one level above this package. Vite has to be told
// that directory is legal to serve in dev; the content layer itself reads via fs at build time.
const REPO_ROOT = new URL("../", import.meta.url).pathname;

// Canonical origin. Overridable because it is the one config value that differs per deployment:
// on a *.up.railway.app URL the default would emit canonical tags pointing at a host that is not
// serving the page, and every sitemap entry would name the wrong origin. Set PUBLIC_SITE_URL in
// the Railway service until the custom domain is attached.
const SITE_URL = process.env.PUBLIC_SITE_URL ?? "https://rungscli.com";

export default defineConfig({
  site: SITE_URL,
  output: "static",
  trailingSlash: "always",
  integrations: [react(), sitemap()],
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
