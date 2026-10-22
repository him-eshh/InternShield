import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Workers load Pyodide / TypeScript / sql.js from jsDelivr only (pinned versions); this stops user code reaching anything else (e.g. via import()).
  async headers() {
    const csp = "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval' 'unsafe-eval'; connect-src https://cdn.jsdelivr.net";
    return ["py-runner", "js-runner", "sql-runner"].map((w) => ({
      source: `/workers/${w}.js`,
      headers: [{ key: "Content-Security-Policy", value: csp }],
    }));
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
