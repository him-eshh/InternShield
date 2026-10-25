// Runs a qa script with this worktree's QA env (the shell here can't set env vars). Usage: node qa/v3-run.mjs qa/<script>.mjs
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

process.env.QA_BASE ??= "http://localhost:3400";
process.env.QA_SHOTS ??= resolve(".git/internshield-relay/v3-shots/setup");
await import(pathToFileURL(process.argv[2]).href);
