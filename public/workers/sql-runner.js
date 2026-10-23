/* InternShield SQL runner (classic worker). sql.js in memory; one fresh DB per run, seeded per problem. */
"use strict";

var SQL_BASE = "https://cdn.jsdelivr.net/npm/sql.js@1.15.1/dist/"; // keep in sync with package.json
var ROW_CAP = 1000;
var CELL_CAP = 200;
var BLOCKED = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches", "BroadcastChannel", "Worker", "SharedWorker", "WebTransport"];

// Remove network/storage APIs from the global and every prototype it inherits them from.
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
      /* ignore */
    }
  }
}

var ready = null;
try {
  importScripts(SQL_BASE + "sql-wasm.js");
  ready = self.initSqlJs({ locateFile: function (f) { return SQL_BASE + f; } });
} catch (err) {
  ready = Promise.reject(err);
}
ready.then(
  function () {
    neutralize();
    self.postMessage({ type: "ready" });
  },
  function () {
    self.postMessage({ type: "error", message: "SQL could not load. Check your connection and try again." });
  },
);

function last(res) {
  var r = res[res.length - 1];
  return r ? { columns: r.columns, rows: r.values } : { columns: [], rows: [] };
}

function capCell(v) {
  if (v instanceof Uint8Array) return "[binary]";
  return typeof v === "string" && v.length > CELL_CAP ? v.slice(0, CELL_CAP) + "…" : v;
}

self.onmessage = function (event) {
  var data = event.data || {};
  ready.then(function (SQL) {
    var db = new SQL.Database();
    try {
      db.exec(String(data.schema || ""));
      var want = last(db.exec(String(data.reference || "")));
      var got;
      try {
        got = last(db.exec(String(data.query || "")));
      } catch (err) {
        self.postMessage({ type: "error", message: err && err.message ? String(err.message) : String(err) });
        return;
      }
      if (got.rows.length > ROW_CAP) {
        self.postMessage({ type: "error", message: "Your query returned over 1,000 rows. Add a filter or a join condition." });
        return;
      }
      got.rows = got.rows.map(function (r) { return r.map(capCell); });
      self.postMessage({ type: "result", want: want, got: got });
    } finally {
      db.close();
    }
  });
};
