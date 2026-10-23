import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Workers load Pyodide / TypeScript / sql.js from jsDelivr only (pinned versions); this stops user code reaching anything else (e.g. via import()).
  async headers() {
    // Pinned package folders (keep in sync with public/workers/*.js) so user code can't send data to any other jsDelivr path.
    const cdn = "https://cdn.jsdelivr.net/npm/pyodide@314.0.7/ https://cdn.jsdelivr.net/npm/typescript@5.9.3/ https://cdn.jsdelivr.net/npm/sql.js@1.15.1/";
    const csp = `default-src 'none'; script-src 'self' ${cdn} 'wasm-unsafe-eval' 'unsafe-eval'; connect-src ${cdn}`;
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
