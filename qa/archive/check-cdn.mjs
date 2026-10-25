// Diagnose: can a module worker import pyodide.mjs and run Python?
import { chromium } from "playwright";
const b = await chromium.launch({ channel: process.argv[2] });
const p = await b.newPage();
await p.goto("http://localhost:3000/");
const r = await p.evaluate(
  () =>
    new Promise((res) => {
      const src = `
        const B = "https://cdn.jsdelivr.net/npm/pyodide@314.0.7/";
        try {
          const { loadPyodide } = await import(B + "pyodide.mjs");
          const py = await loadPyodide({ indexURL: B });
          postMessage("ok " + py.runPython("1+1"));
        } catch (e) { postMessage("err " + e.name + " " + e.message); }
      `;
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })), { type: "module" });
      w.onmessage = (e) => res(e.data);
      w.onerror = (e) => res("onerror " + e.message);
      setTimeout(() => res("timeout"), 90000);
    }),
);
console.log(r);
await b.close();
