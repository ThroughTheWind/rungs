import type { APIRoute } from "astro";

/**
 * A route rather than a file in `public/`, so the sitemap URL follows `Astro.site` — which is
 * `PUBLIC_SITE_URL` on Railway. A hardcoded `public/robots.txt` would point crawlers at the
 * wrong origin the moment the site moves.
 */
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL("https://rungscli.com")).origin;

  return new Response(
    [
      "User-agent: *",
      "Allow: /",
      "",
      `Sitemap: ${origin}/sitemap-index.xml`,
      "",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
