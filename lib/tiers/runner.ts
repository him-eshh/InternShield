import type { ResultSet } from "./sql";
import type { CodeLanguage, RunResult } from "./types";

const JS_TIMEOUT_MS = 3000;
const LOAD_CAP_MS = 30000; // TypeScript compiler / sql.js download
const PY_TIMEOUT_MS = 8000;
const PY_LOAD_CAP_MS = 60000;

const active = new Set<Worker>();
let pyWorker: Worker | null = null;
let pyReady = false;
let cancelCurrent: (() => void) | null = null;

export interface RunOptions {
  /** Called with true while Pyodide is still loading, false once it is ready. */
  onLoading?: (loading: boolean) => void;
}

function killPython() {
  if (pyWorker) {
    pyWorker.terminate();
    active.delete(pyWorker);
  }
  pyWorker = null;
  pyReady = false;
}

/** Stops any running code and discards the workers. */
export function stopRunners(): void {
  const cancel = cancelCurrent;
  cancelCurrent = null;
  for (const w of active) w.terminate();
  active.clear();
  pyWorker = null;
  pyReady = false;
  cancel?.();
}

export function runCode(
  language: CodeLanguage,
  code: string,
  functionName: string,
  cases: unknown[][],
  options: RunOptions = {},
): Promise<RunResult> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return Promise.resolve({ ok: false, reason: "error", message: "Code can only run in the browser." });
  }
  if (language === "python") return runPython(code, functionName, cases, options);
  if (language === "sql") return Promise.resolve({ ok: false, reason: "error", message: "Use runSql for SQL." });
  return runJs(code, functionName, cases, language === "typescript", options);
}

export type SqlRunResult = { ok: true; want: ResultSet; got: ResultSet } | { ok: false; reason: "timeout" | "load" | "error"; message: string };

/** Runs the user's query and the reference on one fresh DB seeded with `schema`. */
export function runSql(schema: string, reference: string, query: string, options: RunOptions = {}): Promise<SqlRunResult> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return Promise.resolve({ ok: false, reason: "error", message: "SQL can only run in the browser." });
  }
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker("/workers/sql-runner.js");
    } catch {
      resolve({ ok: false, reason: "error", message: "Could not start the SQL runner." });
      return;
    }
    active.add(worker);
    let timer = 0;
    let done = false;
    const finish = (r: SqlRunResult) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      options.onLoading?.(false);
      worker.terminate();
      active.delete(worker);
      if (cancelCurrent === cancel) cancelCurrent = null;
      resolve(r);
    };
    const cancel = () => finish({ ok: false, reason: "error", message: "Stopped." });
    cancelCurrent = cancel;
    options.onLoading?.(true);
    timer = window.setTimeout(() => finish({ ok: false, reason: "load", message: "SQL took too long to load. Check your connection and try again." }), LOAD_CAP_MS);
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "ready") {
        options.onLoading?.(false);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => finish({ ok: false, reason: "timeout", message: "Your query took longer than 3 seconds." }), JS_TIMEOUT_MS);
        worker.postMessage({ schema, reference, query });
      } else if (d?.type === "result") finish({ ok: true, want: d.want, got: d.got });
      else if (d?.type === "error") finish({ ok: false, reason: "error", message: String(d.message) });
    };
    worker.onerror = (e) => finish({ ok: false, reason: "error", message: e.message || "Your query could not run." });
  });
}

function runJs(code: string, functionName: string, cases: unknown[][], typescript: boolean, options: RunOptions): Promise<RunResult> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker("/workers/js-runner.js");
    } catch {
      resolve({ ok: false, reason: "error", message: "Could not start the code runner." });
      return;
    }
    active.add(worker);
    let timer = 0;
    const finish = (r: RunResult) => {
      window.clearTimeout(timer);
      worker.terminate();
      active.delete(worker);
      if (cancelCurrent === cancel) cancelCurrent = null;
      resolve(r);
    };
    const cancel = () => {
      window.clearTimeout(timer);
      resolve({ ok: false, reason: "error", message: "Stopped." });
    };
    cancelCurrent = cancel;
    const startRunTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => finish({ ok: false, reason: "timeout", message: "Your code took longer than 3 seconds. Check for an endless loop." }),
        JS_TIMEOUT_MS,
      );
    };
    // TypeScript: the compiler loads first (worker says "compiled"), then the 3 s run limit starts.
    if (typescript) {
      options.onLoading?.(true);
      timer = window.setTimeout(
        () => finish({ ok: false, reason: "load", message: "TypeScript took too long to load. Check your connection and try again." }),
        LOAD_CAP_MS,
      );
    } else startRunTimer();
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "compiled") {
        options.onLoading?.(false);
        startRunTimer();
      } else if (d?.type === "result") finish({ ok: true, outputs: d.outputs, logs: String(d.logs ?? "") });
      else if (d?.type === "error") finish({ ok: false, reason: d.load ? "load" : "error", message: String(d.message) });
    };
    worker.onerror = (e) => finish({ ok: false, reason: "error", message: e.message || "Your code could not run." });
    worker.postMessage({ code, functionName, cases, typescript });
  });
}

/** Starts loading Pyodide in the background so the first Run is quick. Safe to call repeatedly. */
export function preloadPython(): void {
  if (pyWorker || typeof window === "undefined" || typeof Worker === "undefined") return;
  try {
    const w = new Worker("/workers/py-runner.js", { type: "module" });
    pyWorker = w;
    pyReady = false;
    active.add(w);
    w.onmessage = (e: MessageEvent) => {
      if (e.data?.type === "ready") pyReady = true;
      else if (e.data?.type === "error" && pyWorker === w) killPython(); // next Run retries with a fresh worker
    };
    w.onerror = () => {
      if (pyWorker === w) killPython();
    };
  } catch {
    /* Run reports the failure */
  }
}

function runPython(code: string, functionName: string, cases: unknown[][], options: RunOptions): Promise<RunResult> {
  return new Promise((resolve) => {
    if (!pyWorker) {
      try {
        pyWorker = new Worker("/workers/py-runner.js", { type: "module" });
      } catch {
        resolve({ ok: false, reason: "error", message: "Could not start the Python runner." });
        return;
      }
      pyReady = false;
      active.add(pyWorker);
    }
    const worker = pyWorker;
    let timer = 0;
    let done = false;
    const finish = (r: RunResult, discard: boolean) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      options.onLoading?.(false);
      if (cancelCurrent === cancel) cancelCurrent = null;
      if (discard && pyWorker === worker) killPython();
      worker.onmessage = null;
      worker.onerror = null;
      resolve(r);
    };
    const cancel = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      options.onLoading?.(false);
      resolve({ ok: false, reason: "error", message: "Stopped." });
    };
    cancelCurrent = cancel;

    const send = () => {
      window.clearTimeout(timer);
      options.onLoading?.(false);
      timer = window.setTimeout(
        () => finish({ ok: false, reason: "timeout", message: "Your code took longer than 8 seconds. Check for an endless loop." }, true),
        PY_TIMEOUT_MS,
      );
      worker.postMessage({ code, functionName, cases });
    };

    worker.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "ready") {
        pyReady = true;
        send();
      } else if (d?.type === "result") {
        finish({ ok: true, outputs: d.outputs, logs: String(d.logs ?? "") }, false);
      } else if (d?.type === "error") {
        finish({ ok: false, reason: pyReady ? "error" : "load", message: String(d.message) }, !pyReady);
      }
    };
    worker.onerror = (e) =>
      finish({ ok: false, reason: pyReady ? "error" : "load", message: e.message || "Python could not run." }, true);

    if (pyReady) {
      send();
    } else {
      options.onLoading?.(true);
      timer = window.setTimeout(
        () => finish({ ok: false, reason: "load", message: "Python took too long to load. Check your connection and try again." }, true),
        PY_LOAD_CAP_MS,
      );
    }
  });
}
