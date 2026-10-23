// Run another stream's QA script against the integration server: node qa/v2-integration-run.mjs <script.mjs> [args]
import "./v2-integration-env.mjs";
process.env.QA_PORT ??= "3000";
const script = process.argv[2];
process.argv.splice(2, 1);
await import(`./${script}`);
