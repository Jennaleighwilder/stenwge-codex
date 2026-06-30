/**
 * /.well-known/security.txt — RFC 9116, but mostly a poem.
 */
export async function GET() {
  const body = [
    "# the forgotten code research institute",
    "# security.txt",
    "#",
    "# if you found a bug in the variance, that is the variance.",
    "# carry on.",
    "",
    "Contact: mailto:stenwge@forgotten-code-institute.vercel.app",
    "Expires: 2099-12-31T23:59:59.000Z",
    "Preferred-Languages: en, brainfuck, GLSL, JavaScript, lullaby",
    "Canonical: https://forgotten-code-institute.vercel.app/.well-known/security.txt",
    "Policy: https://forgotten-code-institute.vercel.app/the-bird",
    "",
    "# disclosures we love:",
    "#   · the mouse cannot drink milk",
    "#   · the cat refuses to predate",
    "#   · the moon is consistently up",
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
