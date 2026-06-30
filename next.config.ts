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
              "/api/codex,/api/teapot,/api/raft,/api/dream,/robots.txt,/.well-known/security.txt,/the-bird — DevTools · codex.help() · type 'stenwge' · press ?",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
