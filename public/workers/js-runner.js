/* InternShield JS runner (classic worker). Runs user code with network APIs removed. */
"use strict";

var LOG_CAP = 2000;

function neutralize() {
  var names = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches"];
  for (var i = 0; i < names.length; i++) {
    try {
      Object.defineProperty(self, names[i], { value: undefined, writable: false, configurable: false });
    } catch (e) {
      try {
        self[names[i]] = undefined;
      } catch (e2) {
        /* ignore */
      }
    }
  }
}

function roundTrip(v) {
  if (v === undefined) return null;
  if (typeof v === "number" && !isFinite(v)) return null;
  return JSON.parse(JSON.stringify(v));
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
