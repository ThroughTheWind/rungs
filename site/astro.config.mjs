// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import { fileURLToPath } from "node:url";
import { rehypeRungs } from "./src/plugins/rehype-rungs.mjs";

// The wiki reads docs/ from the repo root, one level above this package. Vite has to be told
// that directory is legal to serve in dev; the content layer itself reads via fs at build time.
//
// `fileURLToPath`, not `.pathname`: on Windows the latter returns `/C:/…` with a leading slash,
// which Vite then resolves against the drive as `C:/C:/…`. F-013 — every stylesheet request 403'd
// as "outside of Vite serving allow list", 49 of them on one page load, so `astro dev` served an
// unstyled site and local visual review was impossible. `npm run build` was unaffected, which is
// why it survived: the content layer reads via fs at build time and never consults this.
const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));

// Canonical origin. Overridable because it is the one config value that differs per deployment:
// on a *.up.railway.app URL the default would emit canonical tags pointing at a host that is not
// serving the page, and every sitemap entry would name the wrong origin. Set PUBLIC_SITE_URL in
// the Railway service until the custom domain is attached.
const SITE_URL = process.env.PUBLIC_SITE_URL ?? "https://docs.rungscli.com";

export default defineConfig({
  site: SITE_URL,
  output: "static",
  trailingSlash: "always",
  integrations: [react(), sitemap()],
  markdown: {
    // The mapping table from the design system's readme: plain markdown in, provenance
    // components out, with no author-side wrappers. src/plugins/rehype-rungs.mjs is the contract.
    // Astro 7 requires these plugins to live on the selected processor, not the legacy top-level
    // markdown options. The unified processor also keeps terminal transcripts unhighlighted.
    processor: unified({ rehypePlugins: [rehypeRungs] }),
  },
  vite: {
    server: { fs: { allow: [REPO_ROOT] } },
  },
});
