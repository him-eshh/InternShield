// Loads the real worker scripts in a vm context whose prototype carries the network APIs (like WorkerGlobalScope).
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import initSqlJs from "sql.js";
import { SQL_PROBLEMS, SQL_SCHEMA } from "@/lib/tiers/sql";

const BLOCKED = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches", "BroadcastChannel"];

type Msg = Record<string, unknown>;
function load(file: string, extra: Record<string, unknown> = {}) {
  const g = { ...extra } as Record<string, unknown>;
  const msgs: Msg[] = [];
  const waiters: ((m: Msg) => void)[] = [];
  g.postMessage = (m: Msg) => {
    const w = waiters.shift();
    if (w) w(m);
    else msgs.push(m);
  };
  g.self = g;
  vm.createContext(g);
  // Like WorkerGlobalScope.prototype: the APIs live on the global's prototype, not the global itself.
  const proto = vm.runInContext("Object.getPrototypeOf(self)", g) as Record<string, unknown>;
  for (const n of BLOCKED) if (!(n in g)) proto[n] = function blocked() {};
  vm.runInContext(readFileSync(`public/workers/${file}`, "utf8"), g);
  const next = () => (msgs.length ? Promise.resolve(msgs.shift()!) : new Promise<Msg>((r) => waiters.push(r)));
  const send = (data: unknown) => (g.onmessage as (e: { data: unknown }) => void)({ data });
  return { g, proto, next, send, msgs };
}

describe("js-runner.js hardening", () => {
  const probe = `function probe() { return [${BLOCKED.map((n) => `typeof ${n}, typeof self.${n}`).join(", ")}, typeof Object.getPrototypeOf(self).fetch]; }`;

  it("removes every blocked API from the global and its prototype", () => {
    const w = load("js-runner.js");
    w.send({ code: probe, functionName: "probe", cases: [[]] });
    const m = w.msgs.shift() as { type: string; outputs: { ok: boolean; value: string[] }[] };
    expect(m.type).toBe("result");
    expect(m.outputs[0].ok).toBe(true);
    expect(new Set(m.outputs[0].value)).toEqual(new Set(["undefined"]));
    for (const n of BLOCKED) expect(w.proto[n], n).toBeUndefined();
  });

  it("refuses dynamic import()", () => {
    const w = load("js-runner.js");
    w.send({ code: "function f() { return import('https://example.com/x.js'); }", functionName: "f", cases: [[]] });
    expect(w.msgs.shift()).toMatchObject({ type: "error", message: expect.stringContaining("import()") });
  });

  it("caps huge outputs and long logs", () => {
    const w = load("js-runner.js");
    w.send({ code: "function f() { for (let i = 0; i < 5000; i++) console.log('line ' + i); return 'x'.repeat(200000); }", functionName: "f", cases: [[]] });
    const m = w.msgs.shift() as { outputs: { ok: boolean; error?: string }[]; logs: string };
    expect(m.outputs[0]).toEqual({ ok: false, error: "Output too large." });
    expect(m.logs.length).toBeLessThanOrEqual(2000);
  });

  it("reports a TypeScript load failure as a load error", () => {
    const w = load("js-runner.js");
    w.send({ code: "function f(a: number): number { return a; }", functionName: "f", cases: [[1]], typescript: true });
    // The prototype's importScripts is a no-op stub here, so `ts` never appears.
    expect(w.msgs.shift()).toMatchObject({ type: "error" });
  });
});

describe("sql-runner.js", () => {
  async function sqlWorker() {
    const SQL = await initSqlJs();
    return load("sql-runner.js", { importScripts() {}, initSqlJs: async () => SQL });
  }

  it("seeds the DB, runs both queries, and blocks network APIs once ready", async () => {
    const w = await sqlWorker();
    expect(await w.next()).toEqual({ type: "ready" });
    for (const n of BLOCKED) expect(w.g[n], n).toBeUndefined();
    const p = SQL_PROBLEMS.find((x) => x.id === "sql-majors")!;
    w.send({ schema: SQL_SCHEMA, reference: p.reference, query: "SELECT major, COUNT(*) AS students FROM students GROUP BY major" });
    const m = (await w.next()) as { type: string; want: { rows: unknown[][] }; got: { columns: string[]; rows: unknown[][] } };
    expect(m.type).toBe("result");
    expect(m.want.rows[0]).toEqual(["CS", 3]);
    expect(m.got.columns).toEqual(["major", "students"]);
    expect(m.got.rows).toHaveLength(4);
  });

  it("returns SQL errors and refuses huge results", async () => {
    const w = await sqlWorker();
    await w.next();
    w.send({ schema: SQL_SCHEMA, reference: "SELECT 1", query: "SELEC nope" });
    expect(await w.next()).toMatchObject({ type: "error", message: expect.stringContaining("syntax") });
    w.send({ schema: SQL_SCHEMA, reference: "SELECT 1", query: "SELECT a.grade FROM enrollments a, enrollments b, enrollments c" });
    expect(await w.next()).toMatchObject({ type: "error", message: expect.stringContaining("1,000 rows") });
  });
});
