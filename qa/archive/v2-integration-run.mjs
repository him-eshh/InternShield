// Run another stream's QA script against the integration server: node qa/v2-integration-run.mjs <script.mjs> [args]
// Shots go to integration/<check|tools>/ so the two streams' NN names never collide; output to qa/out-int-<script>.txt.
import { resolve } from "node:path";
const script = process.argv[2];
const stream = script.match(/^v2-(check|tools)-/)?.[1];
process.env.QA_SHOTS ??= resolve(".git/internshield-relay/v2-shots/integration", stream ?? "");
process.env.QA_OUT ??= `qa/out-int-${script.replace(/\.mjs$/, "")}.txt`;
await import("./v2-integration-env.mjs");
process.env.QA_PORT ??= "3000";
process.argv.splice(2, 1);
await import(`./${script}`);
