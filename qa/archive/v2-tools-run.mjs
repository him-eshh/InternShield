// Env wrapper (the shell here can't set env vars): node qa/v2-tools-run.mjs <script.mjs> [args]
import { resolve } from "node:path";
process.env.QA_BASE ??= "http://localhost:3200";
process.env.QA_PORT ??= "3200";
process.env.QA_PORT_RANGE ??= "3200-3299";
process.env.QA_SHOTS ??= resolve(".git/internshield-relay/v2-shots/tools");
process.env.QA_OUT ??= "qa/out-tools.txt";
const script = process.argv[2];
process.argv.splice(2, 1);
await import(`./${script}`);
