// Starts/stops one `next dev` for QA, tracked by PID so it never touches anyone else's server.
//   node qa/serve.mjs start [port]   -> next dev on port (else $QA_PORT, else 3000), waits until it answers, writes the PID
//   node qa/serve.mjs stop [port]    -> kills that PID's process tree
// PID file: .next/qa-serve-<port>.pid (per worktree, since each worktree has its own .next).
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const port = Number(process.argv[3] ?? process.env.QA_PORT ?? 3000);
const pidFile = `.next/qa-serve-${port}.pid`;
const cmd = process.argv[2];

function kill(pid) {
  try {
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-Number(pid));
  } catch {
    /* already gone */
  }
}

/** PID listening on `port` whose command line contains this directory, else null (Windows). */
function listenerFromHere() {
  const ps = `$c = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Where-Object OwningProcess -gt 0 | Select-Object -First 1; if ($c) { (Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)").ProcessId; (Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)").CommandLine }; exit 0`;
  const [pid, ...cmdLine] = execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8" }).trim().split(/\r?\n/);
  const here = process.cwd().toLowerCase().replace(/\//g, "\\");
  return pid && cmdLine.join(" ").toLowerCase().includes(here) ? pid : null;
}

if (cmd === "start") {
  mkdirSync(".next", { recursive: true });
  const child = spawn(`npx next dev -p ${port}`, { detached: true, stdio: "ignore", shell: true });
  child.unref();
  writeFileSync(pidFile, String(child.pid));
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`http://localhost:${port}/`);
      console.log(`next dev up on :${port} (pid ${child.pid})`);
      process.exit(0);
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  console.log(`next dev did not answer on :${port} within 120 s (pid ${child.pid})`);
  process.exit(1);
} else if (cmd === "stop") {
  const hadPid = existsSync(pidFile);
  if (hadPid) {
    const pid = readFileSync(pidFile, "utf8").trim();
    kill(pid);
    rmSync(pidFile);
    console.log(`stopped pid ${pid} (:${port})`);
  }
  // Orphans (e.g. npx exited but its next-server child kept the port): kill the listener only if it runs from this directory.
  const orphan = process.platform === "win32" ? listenerFromHere() : null;
  if (orphan) {
    kill(orphan);
    console.log(`stopped orphan pid ${orphan} (:${port})`);
  } else if (!hadPid) console.log(`nothing of ours on :${port}`);
} else {
  console.log("usage: node qa/serve.mjs start|stop  (env: QA_PORT)");
}
