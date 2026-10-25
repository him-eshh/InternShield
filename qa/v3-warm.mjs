// Warms the dev server: fetches each route once (first compile is slow). Usage: node qa/v3-warm.mjs [port]
const port = process.argv[2] ?? "3400";
for (const r of ["/", "/check", "/tailor", "/practice", "/tracker", "/profile"]) {
  const t = Date.now();
  const res = await fetch(`http://localhost:${port}${r}`, { signal: AbortSignal.timeout(600000) }).catch((e) => ({ status: e.message }));
  console.log(r, res.status, `${Math.round((Date.now() - t) / 1000)}s`);
}
