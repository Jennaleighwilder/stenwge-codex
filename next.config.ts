import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // every page on the institute carries the variance.
        source: "/:path*",
        headers: [
          { key: "X-Variance", value: "true" },
          { key: "X-Author", value: "stenwge-bird" },
          {
            key: "X-Built-With",
            value: "the-right-strange-direction",
          },
          {
            key: "X-Discover",
            value:
              "/wren · /api/wren · /lab · /lab/nca · /lab/moon · /lab/shader · /api/airdrop · /api/verify (ed25519) · codex.wren.say() · codex.speak() · codex.airdrop() · press ` for REPL · type 'stenwge' · press ?",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
