// Lists anything listening on localhost:3000-3999 (cleanup check after QA).
import net from "node:net";
const open = [];
await Promise.all(
  Array.from({ length: 1000 }, (_, i) => 3000 + i).map(
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
console.log(open.length ? `listening: ${open.sort().join(", ")}` : "nothing listening on 3000-3999");
