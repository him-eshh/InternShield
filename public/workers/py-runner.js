/* InternShield Python runner (MODULE worker: importScripts of the CDN fails in current browsers). Loads Pyodide from jsDelivr only. */
var PYODIDE_VERSION = "314.0.7";
var BASE = "https://cdn.jsdelivr.net/npm/pyodide@" + PYODIDE_VERSION + "/";
var LOG_CAP = 2000;
var pyodide = null;
var logs = "";

function addLog(line) {
  if (logs.length >= LOG_CAP) return;
  logs = (logs + line + "\n").slice(0, LOG_CAP);
}

var ready = (async function () {
  try {
    var mod = await import(BASE + "pyodide.mjs");
    pyodide = await mod.loadPyodide({ indexURL: BASE });
    pyodide.setStdout({ batched: addLog });
    pyodide.setStderr({ batched: addLog });
    // Pyodide is loaded; take network APIs away so user code (via `import js`) can't reach out.
    ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches", "Worker", "SharedWorker", "WebTransport"].forEach(function (n) {
      try {
        Object.defineProperty(self, n, { value: undefined, writable: false, configurable: false });
      } catch (e) {
        /* ignore */
      }
    });
    self.postMessage({ type: "ready" });
  } catch (err) {
    self.postMessage({ type: "error", message: "Could not load Python: " + (err && err.message ? err.message : String(err)) });
  }
})();

function lastLine(text) {
  var lines = String(text).trim().split("\n");
  return lines[lines.length - 1] || "Error";
}

self.onmessage = async function (event) {
  await ready;
  if (!pyodide) return;
  var data = event.data || {};
  var code = String(data.code || "");
  var functionName = String(data.functionName || "");
  var cases = Array.isArray(data.cases) ? data.cases : [];
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(functionName)) {
    self.postMessage({ type: "error", message: "Invalid function name." });
    return;
  }
  logs = "";
  var ns = null;
  try {
    ns = pyodide.globals.get("dict")();
    pyodide.runPython("import json", { globals: ns });
    try {
      pyodide.runPython(code, { globals: ns });
    } catch (err) {
      self.postMessage({ type: "error", message: lastLine(err && err.message ? err.message : err) });
      return;
    }
    if (!ns.has(functionName)) {
      self.postMessage({ type: "error", message: "Could not find a function named " + functionName + "." });
      return;
    }
    ns.set("__args_json", "[]");
    var outputs = [];
    for (var i = 0; i < cases.length; i++) {
      try {
        ns.set("__args_json", JSON.stringify(cases[i]));
        var json = pyodide.runPython("json.dumps(" + functionName + "(*json.loads(__args_json)))", { globals: ns });
        outputs.push({ ok: true, value: JSON.parse(json) });
      } catch (err2) {
        outputs.push({ ok: false, error: lastLine(err2 && err2.message ? err2.message : err2) });
      }
    }
    self.postMessage({ type: "result", outputs: outputs, logs: logs });
  } catch (err3) {
    self.postMessage({ type: "error", message: lastLine(err3 && err3.message ? err3.message : err3) });
  } finally {
    try {
      if (ns && ns.destroy) ns.destroy();
    } catch (e) {
      /* ignore */
    }
  }
};
