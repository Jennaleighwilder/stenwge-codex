/**
 * /robots.txt — a poem, with the directives at the bottom.
 */
export async function GET() {
  const body = [
    "# the forgotten code research institute",
    "#",
    "# if you have found this file, hello.",
    "# you are the kind of strange bird we are looking for.",
    "#",
    "# this place is small. it is built from a conversation",
    "# about a mouse who could not drink the milk,",
    "# a cat who would not eat the mouse,",
    "# and the boot they decided to live in instead.",
    "#",
    "# crawl gently. the moon is up.",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    "# the variance is a feature, not a vulnerability.",
    "# if you found a bug, that is the variance.",
    "Sitemap: https://forgotten-code-institute.vercel.app/sitemap.xml",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Variance": "true",
    },
  });
}
