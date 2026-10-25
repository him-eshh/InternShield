// Integration QA defaults (the shell here can't set env vars inline). Import before ./lib.mjs.
process.env.QA_BASE ??= "http://localhost:3000";
process.env.QA_SHOTS ??= "C:/my_projects/projects/InternShield/.git/internshield-relay/v2-shots/integration";
process.env.QA_PORT_RANGE ??= "3000-3099";
process.env.QA_OUT ??= "qa/out-v2-integration.txt";
