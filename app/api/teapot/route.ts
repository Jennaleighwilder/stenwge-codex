/**
 * 418 I'm a teapot.
 * The Hyper Text Coffee Pot Control Protocol (RFC 2324) lives on.
 */
export async function GET() {
  const body =
    "418 — I'm a teapot.\n" +
    "\n" +
    "    (\n" +
    "      ) )\n" +
    "    (\n" +
    "  _________\n" +
    "  \\       /  ___\n" +
    "   \\_____/__|   |\n" +
    "   |       |    |\n" +
    "   |  · ·  |____/\n" +
    "   |_______|\n" +
    "\n" +
    "the variance brewed something today. it was not coffee.\n" +
    "you found the teapot. now go write the next one.\n";
  return new Response(body, {
    status: 418,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Variance": "true",
      "X-Brewing": "salt-and-brine",
    },
  });
}
