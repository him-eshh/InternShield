import type { CodeLanguage, RunResult } from "./types";

const JS_TIMEOUT_MS = 3000;
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
  return language === "python" ? runPython(code, functionName, cases, options) : runJs(code, functionName, cases);
}

function runJs(code: string, functionName: string, cases: unknown[][]): Promise<RunResult> {
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
    timer = window.setTimeout(
      () => finish({ ok: false, reason: "timeout", message: "Your code took longer than 3 seconds. Check for an endless loop." }),
      JS_TIMEOUT_MS,
    );
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "result") finish({ ok: true, outputs: d.outputs, logs: String(d.logs ?? "") });
      else if (d?.type === "error") finish({ ok: false, reason: "error", message: String(d.message) });
    };
    worker.onerror = (e) => finish({ ok: false, reason: "error", message: e.message || "Your code could not run." });
    worker.postMessage({ code, functionName, cases });
  });
}

function runPython(code: string, functionName: string, cases: unknown[][], options: RunOptions): Promise<RunResult> {
  return new Promise((resolve) => {
    if (!pyWorker) {
      try {
        pyWorker = new Worker("/workers/py-runner.js");
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
