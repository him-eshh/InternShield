// Lists anything listening on localhost in $QA_PORT_RANGE (e.g. "3100-3199"; default 3000-3999). Cleanup check after QA.
import net from "node:net";
const [lo, hi] = (process.env.QA_PORT_RANGE ?? "3000-3999").split("-").map(Number);
const open = [];
await Promise.all(
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map(
    (port) =>
      new Promise((done) => {
        const s = net.connect({ port, host: "127.0.0.1" });
        s.setTimeout(500);
        s.on("connect", () => (open.push(port), s.destroy(), done()));
        s.on("error", done);
        s.on("timeout", () => (s.destroy(), done()));
      }),
  ),
);
console.log(open.length ? `listening: ${open.sort((a, b) => a - b).join(", ")}` : `nothing listening on ${lo}-${hi}`);
