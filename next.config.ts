import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The Python worker loads Pyodide from jsDelivr only; this stops user code reaching anything else (e.g. via import()).
  async headers() {
    return [
      {
        source: "/workers/py-runner.js",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval' 'unsafe-eval'; connect-src https://cdn.jsdelivr.net",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
