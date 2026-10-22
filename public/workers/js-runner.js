/* InternShield JS runner (classic worker). Runs user code with network APIs removed. */
"use strict";

var LOG_CAP = 2000;
var OUTPUT_CAP = 100000; // chars of JSON per case
var TS_URL = "https://cdn.jsdelivr.net/npm/typescript@5.9.3/lib/typescript.js"; // keep in sync with package-lock
var BLOCKED = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches", "BroadcastChannel", "Worker", "SharedWorker", "WebTransport"];

// Remove network/storage APIs from the global and every prototype it inherits them from (standing #7).
function neutralize() {
  for (var i = 0; i < BLOCKED.length; i++) {
    var n = BLOCKED[i];
    for (var o = self; o; o = Object.getPrototypeOf(o)) {
      try {
        delete o[n];
      } catch (e) {
        /* ignore */
      }
    }
    try {
      Object.defineProperty(self, n, { value: undefined, writable: false, configurable: false });
    } catch (e2) {
      try {
        self[n] = undefined;
      } catch (e3) {
        /* ignore */
      }
    }
  }
}

function roundTrip(v) {
  if (v === undefined) return null;
  if (typeof v === "number" && !isFinite(v)) return null;
  var s = JSON.stringify(v);
  if (s !== undefined && s.length > OUTPUT_CAP) throw new Error("Output too large.");
  return s === undefined ? null : JSON.parse(s);
}

// TypeScript -> JavaScript (types removed, no type checking). Returns { code } or { error }.
function transpile(code) {
  try {
    importScripts(TS_URL);
  } catch (e) {
    /* reported below */
  }
  var ts = self.ts;
  if (!ts || !ts.transpileModule) return { error: "TypeScript could not load. Check your connection and try again.", load: true };
  var out = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  });
  var d = out.diagnostics && out.diagnostics[0];
  if (d) {
    var line = d.file && typeof d.start === "number" ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : null;
    return { error: (line ? "Line " + line + ": " : "") + ts.flattenDiagnosticMessageText(d.messageText, "\n") };
  }
  return { code: out.outputText };
}

self.onmessage = function (event) {
  var data = event.data || {};
  var code = String(data.code || "");
  var functionName = String(data.functionName || "");
  var cases = Array.isArray(data.cases) ? data.cases : [];
  if (!/^[A-Za-z_$][\w$]*$/.test(functionName)) {
    self.postMessage({ type: "error", message: "Invalid function name." });
    return;
  }
  if (data.typescript) {
    var t = transpile(code);
    if (t.error) {
      self.postMessage({ type: "error", message: t.error, load: !!t.load });
      return;
    }
    code = t.code;
    self.postMessage({ type: "compiled" });
  }
  neutralize();
  // Dynamic import() can't be removed from a worker, so refuse code that uses it.
  if (/\bimport\s*\(/.test(code)) {
    self.postMessage({ type: "error", message: "import() isn't available here. Write the function without loading code." });
    return;
  }
  var logs = "";
  var consoleShim = {};
  ["log", "info", "warn", "error", "debug"].forEach(function (k) {
    consoleShim[k] = function () {
      if (logs.length >= LOG_CAP) return;
      var parts = [];
      for (var i = 0; i < arguments.length; i++) {
        var a = arguments[i];
        try {
          parts.push(typeof a === "string" ? a : JSON.stringify(a));
        } catch (e) {
          parts.push(String(a));
        }
      }
      logs = (logs + parts.join(" ") + "\n").slice(0, LOG_CAP);
    };
  });
  try {
    self.console = consoleShim;
  } catch (e) {
    /* ignore */
  }
  var fn;
  try {
    fn = new Function(code + "\n;return typeof " + functionName + " === 'function' ? " + functionName + " : undefined;")();
  } catch (err) {
    self.postMessage({ type: "error", message: err && err.message ? String(err.message) : String(err) });
    return;
  }
  if (typeof fn !== "function") {
    self.postMessage({ type: "error", message: "Could not find a function named " + functionName + "." });
    return;
  }
  var outputs = [];
  for (var i = 0; i < cases.length; i++) {
    try {
      var args = JSON.parse(JSON.stringify(cases[i]));
      outputs.push({ ok: true, value: roundTrip(fn.apply(null, args)) });
    } catch (err2) {
      outputs.push({ ok: false, error: err2 && err2.message ? String(err2.message) : String(err2) });
    }
  }
  self.postMessage({ type: "result", outputs: outputs, logs: logs });
};
